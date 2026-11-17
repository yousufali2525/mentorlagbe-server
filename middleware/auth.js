
import jwt from "jsonwebtoken";
import { getAppDb } from "../config/db.js";

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    const userId = decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    const user = await getAppDb()
      .collection("users")
      .findOne({ _id: userId });

    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "User not found or account is inactive.",
      });
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

const checkRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden. Permission denied.",
      });
    }

    next();
  };
};

const verifyStudent = checkRole("student");
const verifyTutor = checkRole("tutor");
const verifyAdmin = checkRole("admin");

export {
  verifyToken,
  verifyStudent,
  verifyTutor,
  verifyAdmin,
};
