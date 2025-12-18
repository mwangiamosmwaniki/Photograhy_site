const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["wedding", "portrait", "event", "commercial"],
      required: true,
    },
    imageUrl: { type: String, required: true }, // Cloudinary URL
    cloudinaryId: { type: String, required: true }, // Cloudinary public_id
    altText: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
