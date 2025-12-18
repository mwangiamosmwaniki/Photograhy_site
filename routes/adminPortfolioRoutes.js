const express = require("express");
const Portfolio = require("../db/Portfolio");
const upload = require("../middleware/upload");
// const { requireAdmin } = require("../middleware/auth"); // use yours

const router = express.Router();

/* CREATE */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const item = await Portfolio.create({
      title: req.body.title,
      category: req.body.category,
      altText: req.body.altText,
      imageUrl: `/uploads/portfolio/${req.file.filename}`,
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
  await Portfolio.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
