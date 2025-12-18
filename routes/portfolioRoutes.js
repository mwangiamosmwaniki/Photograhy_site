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

module.exports = router;
