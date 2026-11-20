
import express from "express";
import { getAppDb, getAuthDb } from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await getAppDb().collection("users").findOne(
      { _id: req.user.id },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          plan: 1,
          profileImage: 1,
          phone: 1,
          location: 1,
          bio: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

router.patch("/me", verifyToken, async (req, res) => {
  try {
    const fields = {
      name: 100,
      phone: 20,
      location: 150,
      bio: 1000,
      profileImage: 2048,
    };

    const updateData = {};

    for (const [field, maxLength] of Object.entries(fields)) {
      const value = req.body[field];

      if (value !== undefined) {
        if (typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string`,
          });
        }

        const trimmedValue = value.trim();

        if (trimmedValue.length > maxLength) {
          return res.status(400).json({
            success: false,
            message: `${field} is too long`,
          });
        }

        if (field === "name" && !trimmedValue) {
          return res.status(400).json({
            success: false,
            message: "Name is required",
          });
        }

        if (
          field === "profileImage" &&
          trimmedValue &&
          !/^https:\/\/.+/i.test(trimmedValue)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid profile image URL",
          });
        }

        updateData[field] = trimmedValue;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No profile information provided",
      });
    }

    updateData.updatedAt = new Date();

    const db = getAppDb();

    const result = await db.collection("users").updateOne(
      { _id: req.user.id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    const authUpdate = {};

    if (updateData.name !== undefined) {
      authUpdate.name = updateData.name;
    }

    if (updateData.profileImage !== undefined) {
      authUpdate.image = updateData.profileImage || null;
    }

    if (Object.keys(authUpdate).length > 0) {
      await getAuthDb().collection("user").updateOne(
        { _id: req.user.id },
        { $set: authUpdate }
      );
    }

    const updatedUser = await db.collection("users").findOne(
      { _id: req.user.id },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          plan: 1,
          profileImage: 1,
          phone: 1,
          location: 1,
          bio: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile Update Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

export default router;
