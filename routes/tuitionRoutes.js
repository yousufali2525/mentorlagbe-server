
import express from "express";
import { ObjectId } from "mongodb";
import { getAppDb } from "../config/db.js";
import {
  verifyToken,
  verifyTutor,
  verifyAdmin,
} from "../middleware/auth.js";

const router = express.Router();

const validTuition = (data) => {
  return (
    typeof data.title === "string" &&
    data.title.trim() &&
    typeof data.subject === "string" &&
    data.subject.trim() &&
    typeof data.description === "string" &&
    data.description.trim() &&
    typeof data.location === "string" &&
    data.location.trim() &&
    Number(data.salary) > 0
  );
};

router.get("/", async (req, res) => {
  try {
    const { search, subject, location, category } = req.query;

    const filter = {
      approvalStatus: "approved",
      isActive: true,
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    if (subject) filter.subject = { $regex: subject, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (category) filter.category = category;

    const tuitions = await getAppDb()
      .collection("tuitions")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuitions",
    });
  }
});

router.get("/my-tuitions", verifyToken, verifyTutor, async (req, res) => {
  try {
    const tuitions = await getAppDb()
      .collection("tuitions")
      .find({ tutorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      tuitions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your tuitions",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID",
      });
    }

    const tuition = await getAppDb()
      .collection("tuitions")
      .findOne({
        _id: new ObjectId(req.params.id),
        approvalStatus: "approved",
        isActive: true,
      });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found",
      });
    }

    res.status(200).json({
      success: true,
      tuition,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuition",
    });
  }
});

router.post("/", verifyToken, verifyTutor, async (req, res) => {
  try {
    const data = req.body;

    if (!validTuition(data)) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid tuition information",
      });
    }

    const db = getAppDb();

    if (req.user.plan !== "pro") {
      const total = await db.collection("tuitions").countDocuments({
        tutorId: req.user.id,
      });

      if (total >= 2) {
        return res.status(403).json({
          success: false,
          message: "Free tutors can post a maximum of 2 tuitions",
        });
      }
    }

    const tuition = {
      title: data.title.trim(),
      subject: data.subject.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      salary: Number(data.salary),
      category: data.category || "General",
      banner: data.banner || "",
      tutorId: req.user.id,
      tutorName: req.user.name,
      tutorEmail: req.user.email,
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("tuitions").insertOne(tuition);

    res.status(201).json({
      success: true,
      message: "Tuition submitted for admin approval",
      tuition: { ...tuition, _id: result.insertedId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create tuition",
    });
  }
});

router.patch("/:id", verifyToken, verifyTutor, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID",
      });
    }

    const data = req.body;

    if (!validTuition(data)) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid tuition information",
      });
    }

    const result = await getAppDb().collection("tuitions").updateOne(
      {
        _id: new ObjectId(req.params.id),
        tutorId: req.user.id,
      },
      {
        $set: {
          title: data.title.trim(),
          subject: data.subject.trim(),
          description: data.description.trim(),
          location: data.location.trim(),
          salary: Number(data.salary),
          category: data.category || "General",
          banner: data.banner || "",
          approvalStatus: "pending",
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition updated and sent for approval",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update tuition",
    });
  }
});

router.delete("/:id", verifyToken, verifyTutor, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID",
      });
    }

    const result = await getAppDb().collection("tuitions").deleteOne({
      _id: new ObjectId(req.params.id),
      tutorId: req.user.id,
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Tuition not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tuition deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete tuition",
    });
  }
});

router.patch(
  "/admin/:id/status",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be approved or rejected",
        });
      }

      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tuition ID",
        });
      }

      const result = await getAppDb().collection("tuitions").updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            approvalStatus: status,
            updatedAt: new Date(),
          },
        }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          success: false,
          message: "Tuition not found",
        });
      }

      res.status(200).json({
        success: true,
        message: `Tuition ${status} successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update tuition status",
      });
    }
  }
);

export default router;
