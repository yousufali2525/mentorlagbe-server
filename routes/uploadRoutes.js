
import express from "express";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/image", verifyToken, async (req, res) => {
  try {
    const { image, name } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if (!process.env.IMGBB_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "ImgBB API key is not configured",
      });
    }

    const imageMatch = image.match(
      /^data:image\/(png|jpeg|jpg|webp);base64,/i
    );

    const base64Image = imageMatch
      ? image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/i, "")
      : image;

    if (
      !base64Image ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Image) ||
      base64Image.length % 4 !== 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }

    const imageBuffer = Buffer.from(base64Image, "base64");

    if (
      imageBuffer.length === 0 ||
      imageBuffer.length > 8 * 1024 * 1024
    ) {
      return res.status(400).json({
        success: false,
        message: "Image size must be less than 8 MB",
      });
    }

    const formData = new URLSearchParams();
    formData.append("image", base64Image);

    if (name && typeof name === "string") {
      formData.append("name", name);
    }

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(process.env.IMGBB_API_KEY)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return res.status(400).json({
        success: false,
        message: result.error?.message || "Image upload failed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: result.data.url,
        displayUrl: result.data.display_url,
        deleteUrl: result.data.delete_url,
      },
    });
  } catch (error) {
    console.error("Image Upload Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to upload image",
    });
  }
});

export default router;
