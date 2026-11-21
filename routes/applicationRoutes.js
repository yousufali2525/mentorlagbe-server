
import express from "express";
import { ObjectId } from "mongodb";
import { getAppDb } from "../config/db.js";
import {
  verifyToken,
  verifyStudent,
  verifyTutor,
} from "../middleware/auth.js";

const router = express.Router();

const readText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

router.post("/", verifyToken, verifyStudent, async (req, res) => {
  try {
    const db = getAppDb();
    const {
      tuitionId,
      studentPhone,
      preferredSchedule,
      studentNote,
      message,
    } = req.body || {};

    if (!tuitionId || !ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid tuition ID is required",
      });
    }

    const stringFields = {
      studentPhone,
      preferredSchedule,
      studentNote,
      message,
    };

    for (const [field, value] of Object.entries(stringFields)) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`,
        });
      }
    }

    const phone = readText(studentPhone);
    const schedule = readText(preferredSchedule);
    const note = readText(studentNote, message);

    // Legacy clients sent only `message`. Keep that shape working by treating
    // it as the learning note; new requests must include phone and schedule.
    const legacyNoteOnly =
      studentPhone === undefined &&
      preferredSchedule === undefined &&
      studentNote === undefined &&
      typeof message === "string";

    if (!legacyNoteOnly && (!phone || !schedule)) {
      return res.status(400).json({
        success: false,
        message: "studentPhone and preferredSchedule are required",
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

    const appliedAt = new Date();

    const application = {
      tuitionId,
      tuitionTitle: tuition.title || "",
      subject: tuition.subject || "",
      monthlyFee: tuition.monthlyFee ?? tuition.salary ?? null,
      tutorEmail: tuition.tutorEmail || "",
      studentName: req.user.name || "",
      studentEmail: req.user.email || "",
      studentPhone: phone,
      preferredSchedule: schedule,
      studentNote: note,
      status: "pending",
      appliedAt,

      // Retained for existing dashboards and duplicate-prevention queries.
      studentId: req.user.id,
      tutorId: tuition.tutorId || "",
      tutorName: tuition.tutorName || "",
      message: note,
      createdAt: appliedAt,
      updatedAt: appliedAt,
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

    console.error("Application Submit Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to submit application",
    });
  }
});

router.get("/my-applications", verifyToken, verifyStudent, async (req, res) => {
  try {
    const db = getAppDb();

    const applications = await db
      .collection("applications")
      .find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedApplications = await Promise.all(
      applications.map(async (application) => {
        let tuition = null;

        if (
          application.tuitionId &&
          ObjectId.isValid(application.tuitionId)
        ) {
          tuition = await db.collection("tuitions").findOne({
            _id: new ObjectId(application.tuitionId),
          });
        }

        const studentNote =
          application.studentNote || application.message || "";

        return {
          ...application,
          tuition: tuition
            ? {
                _id: tuition._id,
                title: tuition.title || "Tuition Application",
                subject: tuition.subject || "Subject unavailable",
                monthlyFee: tuition.salary ?? tuition.monthlyFee,
                tutorName:
                  tuition.tutorName ||
                  application.tutorName ||
                  "Not available",
                tutorEmail:
                  tuition.tutorEmail ||
                  application.tutorEmail ||
                  "Not available",
              }
            : null,
          tutorName:
            tuition?.tutorName ||
            application.tutorName ||
            application.tutorEmail ||
            "Not available",
          tutorEmail:
            tuition?.tutorEmail ||
            application.tutorEmail ||
            "Not available",
          studentName:
            application.studentName || req.user.name || "Not available",
          studentEmail:
            application.studentEmail || req.user.email || "Not available",
          studentPhone: application.studentPhone || "",
          preferredSchedule: application.preferredSchedule || "",
          studentNote,
          message: studentNote,
          appliedAt: application.appliedAt || application.createdAt,
          tuitionTitle:
            tuition?.title ||
            application.tuitionTitle ||
            "Tuition Application",
          subject:
            tuition?.subject ||
            application.subject ||
            "Subject unavailable",
          monthlyFee:
            tuition?.salary ??
            tuition?.monthlyFee ??
            application.monthlyFee,
        };
      })
    );

    res.status(200).json({
      success: true,
      total: enrichedApplications.length,
      data: enrichedApplications,
    });
  } catch (error) {
    console.error("Fetch Applications Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    });
  }
});

router.delete("/:id", verifyToken, verifyStudent, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    const result = await getAppDb().collection("applications").deleteOne({
      _id: new ObjectId(req.params.id),
      studentId: req.user.id,
      status: "pending",
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending application not found or cannot be cancelled",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel Application Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to cancel application",
    });
  }
});

router.get("/tutor-applicants", verifyToken, verifyTutor, async (req, res) => {
  try {
    const db = getAppDb();
    const applications = await db
      .collection("applications")
      .find({ tutorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedApplications = await Promise.all(
      applications.map(async (application) => {
        let tuition = null;

        if (
          application.tuitionId &&
          ObjectId.isValid(application.tuitionId)
        ) {
          tuition = await db.collection("tuitions").findOne({
            _id: new ObjectId(application.tuitionId),
          });
        }

        const studentNote =
          application.studentNote || application.message || "";

        return {
          ...application,
          tuition: tuition
            ? {
                _id: tuition._id,
                title: tuition.title || "Tuition Application",
                subject: tuition.subject || "Subject unavailable",
                monthlyFee: tuition.salary ?? tuition.monthlyFee,
                tutorEmail: tuition.tutorEmail || "",
              }
            : null,
          tuitionTitle:
            tuition?.title ||
            application.tuitionTitle ||
            "Tuition Application",
          subject:
            tuition?.subject ||
            application.subject ||
            "Subject unavailable",
          monthlyFee:
            tuition?.salary ??
            tuition?.monthlyFee ??
            application.monthlyFee ??
            null,
          tutorEmail:
            tuition?.tutorEmail || application.tutorEmail || "",
          studentName: application.studentName || "Student",
          studentEmail: application.studentEmail || "",
          studentPhone: application.studentPhone || "",
          preferredSchedule: application.preferredSchedule || "",
          studentNote,
          message: studentNote,
          appliedAt: application.appliedAt || application.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      total: enrichedApplications.length,
      data: enrichedApplications,
    });
  } catch (error) {
    console.error("Fetch Applicants Error:", error.message);

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
    console.error("Update Application Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update application",
    });
  }
});

export default router;
