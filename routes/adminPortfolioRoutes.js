const express = require("express");
const Portfolio = require("../db/Portfolio");
const { upload, uploadToCloudinary } = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

/* CREATE */
router.post(
  "/",
  upload.single("image"),
  uploadToCloudinary,
  async (req, res) => {
    try {
      const item = await Portfolio.create({
        title: req.body.title,
        category: req.body.category,
        altText: req.body.altText,
        imageUrl: req.file.cloudinaryUrl, // ✅ Cloudinary URL
        cloudinaryId: req.file.cloudinaryId, // ✅ public_id
      });

      res.status(201).json(item);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  }
);

/* READ */
router.get("/", async (req, res) => {
  try {
    const items = await Portfolio.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* DELETE */
router.delete("/:id", async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    if (item.cloudinaryId) {
      await cloudinary.uploader.destroy(item.cloudinaryId); // remove from Cloudinary
    }

    await item.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
