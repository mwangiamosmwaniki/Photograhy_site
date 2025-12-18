const express = require("express");
const Portfolio = require("../db/Portfolio");
const upload = require("../middleware/upload");

const router = express.Router();

/* CREATE */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const item = await Portfolio.create({
      title: req.body.title,
      category: req.body.category,
      altText: req.body.altText,
      imageUrl: req.file.path, // ✅ Cloudinary URL
      cloudinaryId: req.file.filename, // ✅ Needed for deletion
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* READ */
router.get("/", async (req, res) => {
  const items = await Portfolio.find().sort({ createdAt: -1 });
  res.json(items);
});

/* DELETE */
router.delete("/:id", async (req, res) => {
  const item = await Portfolio.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Not found" });

  const cloudinary = require("../config/cloudinary");
  await cloudinary.uploader.destroy(item.cloudinaryId);

  await item.deleteOne();
  res.json({ success: true });
});

module.exports = router;
