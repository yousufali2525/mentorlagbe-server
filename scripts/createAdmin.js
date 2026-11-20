
import "dotenv/config";
import {
  connectDB,
  getAppDb,
  getAuthDb,
  client,
} from "../config/db.js";

const promoteAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!email) {
      throw new Error("ADMIN_EMAIL is required in .env");
    }

    await connectDB();

    const authDb = getAuthDb();
    const appDb = getAppDb();

    const authUser = await authDb.collection("user").findOne({ email });
    const appUser = await appDb.collection("users").findOne({ email });

    if (!authUser || !appUser) {
      throw new Error("User was not found in both databases");
    }

    if (authUser._id.toString() !== String(appUser._id)) {
      throw new Error("User IDs do not match between databases");
    }

    if (appUser.isActive === false) {
      throw new Error("This account is inactive");
    }

    await authDb.collection("user").updateOne(
      { _id: authUser._id },
      { $set: { role: "admin", updatedAt: new Date() } }
    );

    await appDb.collection("users").updateOne(
      { _id: appUser._id },
      { $set: { role: "admin", updatedAt: new Date() } }
    );

    console.log("Admin role updated successfully");
    console.log("Admin Email:", email);
    console.log("Admin Role: admin");
    console.log("Existing password and plan preserved");
  } catch (error) {
    console.error("Admin update failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client?.close();
  }
};

promoteAdmin();
