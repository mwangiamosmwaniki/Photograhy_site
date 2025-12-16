const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  strikethrough: {
    type: Boolean,
    default: false,
  },
});

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  features: [featureSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Package", packageSchema);
