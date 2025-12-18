const express = require("express");
const Portfolio = require("../db/Portfolio");

const router = express.Router();

// GET all portfolio images
router.get("/", async (req, res) => {
  try {
    const items = await Portfolio.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Failed to load portfolio" });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const featured = await Portfolio.find()
      .sort({ createdAt: -1 }) // latest first
      .limit(3); // only 3 items
    res.json(featured);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load featured portfolio" });
  }
});

module.exports = router;
