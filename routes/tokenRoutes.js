
import express from "express";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../auth.js";
import { getAppDb, getAuthDb } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
      });
    }

    let session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // Cross-domain fallback: accept Better Auth session token from Authorization bearer.
    if (!session?.user) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        const bearerToken = authHeader.slice(7).trim();
        if (bearerToken) {
          // Try Better Auth API with bearer header (works if bearer plugin/config accepts it).
          try {
            session = await getAuth().api.getSession({
              headers: new Headers({ authorization: `Bearer ${bearerToken}` }),
            });
          } catch {
            session = null;
          }

          // Fallback: resolve session token directly from Better Auth session collection.
          if (!session?.user) {
            const sessionDoc = await getAuthDb()
              .collection("session")
              .findOne({ token: bearerToken });

            const expiresAt = sessionDoc?.expiresAt
              ? new Date(sessionDoc.expiresAt)
              : null;
            const notExpired = !expiresAt || expiresAt.getTime() > Date.now();

            if (sessionDoc?.userId && notExpired) {
              session = { user: { id: String(sessionDoc.userId) } };
            }
          }
        }
      }
    }

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const user = await getAppDb().collection("users").findOne({
      _id: session.user.id,
    });

    if (!user || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "User account not found or inactive",
      });
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        algorithm: "HS256",
      }
    );

    return res.status(200).json({
      success: true,
      message: "JWT generated successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error("JWT Generation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate JWT",
    });
  }
});

export default router;
