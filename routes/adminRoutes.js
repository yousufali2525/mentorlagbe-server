
import express from "express";
import { getAppDb } from "../config/db.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middleware/auth.js";

const router = express.Router();

const normalizeTuition = (tuition) => {
  if (!tuition || typeof tuition !== "object") return tuition;
  const monthlyFee = tuition.monthlyFee ?? tuition.salary ?? null;
  const bannerImage = tuition.bannerImage ?? tuition.banner ?? "";
  return {
    ...tuition,
    monthlyFee,
    salary: tuition.salary ?? monthlyFee,
    bannerImage,
    banner: tuition.banner ?? bannerImage,
  };
};

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
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
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
      db.collection("users")
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

    const userId = req.params.id;
    const db = getAppDb();

    if (req.user?.id && userId === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    const targetUser = await db.collection("users").findOne(
      { _id: userId },
      { projection: { role: 1 } }
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be deactivated here",
      });
    }

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
        },
      }
    );

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

router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["student", "tutor", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be student, tutor, or admin",
      });
    }

    const userId = req.params.id;
    const db = getAppDb();

    const targetUser = await db.collection("users").findOne(
      { _id: userId },
      { projection: { role: 1 } }
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      req.user?.id &&
      userId === String(req.user.id) &&
      targetUser.role === "admin" &&
      role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      role,
    });
  } catch (error) {
    console.error("Admin user role error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
});

router.get("/tuitions", async (req, res) => {
  try {
    const db = getAppDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (["pending", "approved", "rejected"].includes(req.query.status)) {
      filter.approvalStatus = req.query.status;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const searchRegex = { $regex: escapedSearch, $options: "i" };
        filter.$or = [
          { title: searchRegex },
          { subject: searchRegex },
          { tutorName: searchRegex },
          { tutorEmail: searchRegex },
        ];
      }
    }

    const [tuitions, total] = await Promise.all([
      db
        .collection("tuitions")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("tuitions").countDocuments(filter),
    ]);

    const normalizedTuitions = tuitions.map(normalizeTuition);

    res.status(200).json({
      success: true,
      tuitions: normalizedTuitions,
      data: normalizedTuitions,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Admin tuitions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuitions",
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
      tuitions: tuitions.map(normalizeTuition),
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
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [payments, totalPayments, revenueResult] = await Promise.all([
      db.collection("payments")
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection("payments").countDocuments(),

      db.collection("payments")
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ])
        .toArray(),
    ]);

    res.status(200).json({
      success: true,
      payments,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
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
