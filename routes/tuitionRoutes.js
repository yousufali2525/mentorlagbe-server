
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
    data.title.trim().length > 0 &&
    typeof data.subject === "string" &&
    data.subject.trim().length > 0 &&
    typeof data.classLevel === "string" &&
    data.classLevel.trim().length > 0 &&
    ["Online", "Offline"].includes(data.mode) &&
    typeof data.description === "string" &&
    data.description.trim().length > 0 &&
    typeof data.location === "string" &&
    data.location.trim().length > 0 &&
    Number(data.monthlyFee ?? data.salary) > 0 &&
    Number.isInteger(Number(data.daysPerWeek)) &&
    Number(data.daysPerWeek) >= 1 &&
    Number(data.daysPerWeek) <= 7
  );
};

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

router.get("/", async (req, res) => {
  try {
    const { search, subject, classLevel, mode, location, category } = req.query;

    const filter = {
      approvalStatus: "approved",
      isActive: true,
    };

    const escapeRegex = (value) =>
      String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (search) {
      const searchRegex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [
        { title: searchRegex },
        { subject: searchRegex },
      ];
    }

    if (subject) {
      filter.subject = { $regex: escapeRegex(subject), $options: "i" };
    }

    if (classLevel) {
      filter.classLevel = { $regex: escapeRegex(classLevel), $options: "i" };
    }

    if (mode) {
      filter.mode = { $regex: `^${escapeRegex(mode)}$`, $options: "i" };
    }

    if (location) {
      filter.location = { $regex: escapeRegex(location), $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 9)
    );
    const skip = (page - 1) * limit;

    const collection = getAppDb().collection("tuitions");
    const [tuitions, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const normalizedTuitions = tuitions.map(normalizeTuition);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const payload = {
      success: true,
      data: normalizedTuitions,
      tuitions: normalizedTuitions,
      total,
      page,
      limit,
      totalPages,
      count: total,
    };

    if (!hasPagination) {
      // Keep legacy compatibility for callers that expect the old shape.
      return res.status(200).json(payload);
    }

    return res.status(200).json(payload);
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
      tuitions: tuitions.map(normalizeTuition),
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
      tuition: normalizeTuition(tuition),
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
        message: "Please provide all required tuition information",
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

    const fee = Number(data.monthlyFee ?? data.salary);
    const bannerImage = data.bannerImage || data.banner || "";

    const tuition = {
      title: data.title.trim(),
      subject: data.subject.trim(),
      classLevel: data.classLevel.trim(),
      mode: data.mode,
      location: data.location.trim(),
      monthlyFee: fee,
      salary: fee,
      daysPerWeek: Number(data.daysPerWeek),
      description: data.description.trim(),
      category: data.category || "General",
      bannerImage,
      banner: bannerImage,
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
      tuition: normalizeTuition({
        ...tuition,
        _id: result.insertedId,
      }),
    });
  } catch (error) {
    console.error("Create Tuition Error:", error);

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

    // Allow owner to toggle isActive without sending full tuition payload.
    if (
      typeof data.isActive === "boolean" &&
      data.title === undefined &&
      data.subject === undefined &&
      data.classLevel === undefined &&
      data.mode === undefined &&
      data.description === undefined &&
      data.location === undefined &&
      data.salary === undefined &&
      data.daysPerWeek === undefined
    ) {
      const result = await getAppDb().collection("tuitions").updateOne(
        {
          _id: new ObjectId(req.params.id),
          tutorId: req.user.id,
        },
        {
          $set: {
            isActive: data.isActive,
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

      return res.status(200).json({
        success: true,
        message: `Tuition ${data.isActive ? "activated" : "deactivated"} successfully`,
        isActive: data.isActive,
      });
    }

    if (!validTuition(data)) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required tuition information",
      });
    }

    const fee = Number(data.monthlyFee ?? data.salary);
    const bannerImage = data.bannerImage || data.banner || "";

    const result = await getAppDb().collection("tuitions").updateOne(
      {
        _id: new ObjectId(req.params.id),
        tutorId: req.user.id,
      },
      {
        $set: {
          title: data.title.trim(),
          subject: data.subject.trim(),
          classLevel: data.classLevel.trim(),
          mode: data.mode,
          location: data.location.trim(),
          monthlyFee: fee,
          salary: fee,
          daysPerWeek: Number(data.daysPerWeek),
          description: data.description.trim(),
          category: data.category || "General",
          bannerImage,
          banner: bannerImage,
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

router.patch("/:id/active", verifyToken, verifyTutor, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tuition ID",
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    const result = await getAppDb().collection("tuitions").updateOne(
      {
        _id: new ObjectId(req.params.id),
        tutorId: req.user.id,
      },
      {
        $set: {
          isActive,
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

    return res.status(200).json({
      success: true,
      message: `Tuition ${isActive ? "activated" : "deactivated"} successfully`,
      isActive,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update tuition active status",
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
