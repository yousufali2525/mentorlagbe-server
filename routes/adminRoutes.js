
import express from "express";
import { ObjectId } from "mongodb";
import { getAppDb } from "../config/db.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken, verifyAdmin);

router.get("/stats", async (req, res) => {
  try {
    const db = getAppDb();

    const [
      totalUsers,
      totalStudents,
      totalTutors,
      totalAdmins,
      totalTuitions,
      pendingTuitions,
      approvedTuitions,
      rejectedTuitions,
      totalApplications,
      totalPayments,
      paidPayments,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({ role: "student" }),
      db.collection("users").countDocuments({ role: "tutor" }),
      db.collection("users").countDocuments({ role: "admin" }),
      db.collection("tuitions").countDocuments(),
      db.collection("tuitions").countDocuments({ approvalStatus: "pending" }),
      db.collection("tuitions").countDocuments({ approvalStatus: "approved" }),
      db.collection("tuitions").countDocuments({ approvalStatus: "rejected" }),
      db.collection("applications").countDocuments(),
      db.collection("payments").countDocuments(),
      db.collection("payments").countDocuments({ paymentStatus: "paid" }),
    ]);

    const revenueResult = await db
      .collection("payments")
      .aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalTutors,
        totalAdmins,
        totalTuitions,
        pendingTuitions,
        approvedTuitions,
        rejectedTuitions,
        totalApplications,
        totalPayments,
        paidPayments,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const db = getAppDb();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (page - 1) * limit;

    const filter = {};

    if (["student", "tutor", "admin"].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);

      if (search) {
        const escapedSearch = search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        filter.$or = [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
        ];
      }
    }

    const [users, totalUsers] = await Promise.all([
      db
        .collection("users")
        .find(filter, {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            plan: 1,
            profileImage: 1,
            isActive: 1,
            createdAt: 1,
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection("users").countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const userId = new ObjectId(req.params.id);

    if (userId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    const result = await getAppDb()
      .collection("users")
      .updateOne(
        { _id: userId },
        {
          $set: {
            isActive,
            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Admin user status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
});

router.get("/tuitions/pending", async (req, res) => {
  try {
    const db = getAppDb();

    const tuitions = await db
      .collection("tuitions")
      .find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error("Admin pending tuitions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pending tuitions",
    });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const db = getAppDb();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );
    const skip = (page - 1) * limit;

    const [payments, totalPayments] = await Promise.all([
      db
        .collection("payments")
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection("payments").countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      payments,
      pagination: {
        totalPayments,
        currentPage: page,
        totalPages: Math.ceil(totalPayments / limit),
      },
    });
  } catch (error) {
    console.error("Admin payments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment transactions",
    });
  }
});

export default router;
