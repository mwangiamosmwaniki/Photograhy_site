// seedPackages.js
// Run this script once to populate your database with initial packages
// Usage: node seedPackages.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Package = require("./db/packageModel");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const packages = [
  {
    name: "Portrait Session",
    price: 250,
    description:
      "Perfect for headshots, personal branding, or casual photoshoots.",
    features: [
      { text: "1 Hour of shooting time", strikethrough: false },
      { text: "1 Location of choice", strikethrough: false },
      { text: "15 Professionally edited images", strikethrough: false },
      { text: "Online proofing gallery", strikethrough: false },
      { text: "Print rights included", strikethrough: true },
    ],
  },
  {
    name: "Family Mini-Session",
    price: 350,
    description: "Ideal for families, maternity, or graduation photos.",
    features: [
      { text: "90 Minutes of shooting time", strikethrough: false },
      { text: "Up to 6 people included", strikethrough: false },
      { text: "30 Professionally edited images", strikethrough: false },
      { text: "Online proofing gallery", strikethrough: false },
      { text: "Print rights included", strikethrough: false },
    ],
  },
  {
    name: "Wedding Package A",
    price: 2000,
    description: "Comprehensive coverage for small to medium weddings.",
    features: [
      { text: "8 Hours of continuous coverage", strikethrough: false },
      { text: "Two photographers", strikethrough: false },
      { text: "350+ Professionally edited images", strikethrough: false },
      { text: "Custom USB drive delivery", strikethrough: false },
      { text: "Print rights included", strikethrough: false },
    ],
  },
];

async function seedPackages() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully.");

    // Clear existing packages (optional - remove this line if you want to keep existing data)
    await Package.deleteMany({});
    console.log("Cleared existing packages.");

    // Insert new packages
    await Package.insertMany(packages);
    console.log("Packages seeded successfully!");

    process.exit(0);
  } catch (err) {
    console.error("Error seeding packages:", err);
    process.exit(1);
  }
}

seedPackages();
