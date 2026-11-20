
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import {
  client,
  getAppDb,
  getAuthDb,
} from "./config/db.js";

let auth;

const initializeAuth = () => {
  const trustedOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  auth = betterAuth({
    appName: "MentorLagbe",

    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,

    trustedOrigins: [
      ...new Set([
        ...trustedOrigins,
        "https://mentor-lagbe-client-rouge.vercel.app",
        "https://mentor-lagbe-client-*.vercel.app",
      ]),
    ],

    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },

    database: mongodbAdapter(getAuthDb(), {
      client,
    }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },

    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "student",
          input: true,
        },
        plan: {
          type: "string",
          required: true,
          defaultValue: "free",
          input: false,
        },
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const role = user.role === "tutor" ? "tutor" : "student";

            return {
              data: {
                ...user,
                role,
                plan: "free",
              },
            };
          },

          after: async (user) => {
            await getAppDb().collection("users").updateOne(
              { _id: user.id },
              {
                $setOnInsert: {
                  _id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role || "student",
                  plan: "free",
                  profileImage: user.image || "",
                  isActive: true,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );
          },
        },

        update: {
          before: async (userData) => {
            const { role, plan, ...safeData } = userData;

            return {
              data: safeData,
            };
          },
        },
      },
    },
  });

  return auth;
};

const getAuth = () => {
  if (!auth) {
    throw new Error("Authentication has not been initialized");
  }

  return auth;
};

export { initializeAuth, getAuth };
