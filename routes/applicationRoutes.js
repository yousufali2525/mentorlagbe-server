
import express from "express";
import { ObjectId } from "mongodb";
import { getAppDb } from "../config/db.js";
import {
  verifyToken,
  verifyStudent,
  verifyTutor,
} from "../middleware/auth.js";

const router = express.Router();

router.post("/", verifyToken, verifyStudent, async (req, res) => {
  try {
    const db = getAppDb();
    const { tuitionId, message } = req.body;

    if (!tuitionId || !ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid tuition ID is required",
      });
    }

    if (message !== undefined && typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message must be a string",
      });
    }

    const tuition = await db.collection("tuitions").findOne({
      _id: new ObjectId(tuitionId),
      approvalStatus: "approved",
      isActive: true,
    });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found or unavailable",
      });
    }

    if (tuition.tutorId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You cannot apply to your own tuition",
      });
    }

    const existingApplication = await db.collection("applications").findOne({
      tuitionId,
      studentId: req.user.id,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this tuition",
      });
    }

    const application = {
      tuitionId,
      studentId: req.user.id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      tutorId: tuition.tutorId,
      tutorEmail: tuition.tutorEmail,
      message: message ? message.trim() : "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("applications").insertOne(application);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: {
        ...application,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this tuition",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit application",
    });
  }
});

router.get("/my-applications", verifyToken, verifyStudent, async (req, res) => {
  try {
    const applications = await getAppDb()
      .collection("applications")
      .find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    });
  }
});

router.get("/tutor-applicants", verifyToken, verifyTutor, async (req, res) => {
  try {
    const applications = await getAppDb()
      .collection("applications")
      .find({ tutorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch applicants",
    });
  }
});

router.patch("/:id/status", verifyToken, verifyTutor, async (req, res) => {
  try {
    const { status } = req.body;

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected",
      });
    }

    const result = await getAppDb().collection("applications").updateOne(
      {
        _id: new ObjectId(req.params.id),
        tutorId: req.user.id,
        status: "pending",
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending application not found or access denied",
      });
    }

    res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update application",
    });
  }
});

export default router;
