// seedPortfolioWithImages.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Portfolio = require("./db/Portfolio");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra"); // convenient for copying files

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

// Folder where your seed images are stored
const SEED_IMAGES_FOLDER = path.join(__dirname, "public/images/portfolio");
// Destination folder for uploads
const UPLOADS_FOLDER = path.join(__dirname, "uploads/portfolio");

// Ensure uploads folder exists
fse.ensureDirSync(UPLOADS_FOLDER);

// Define seed portfolio data
const seedData = [
  {
    title: "Wedding Bliss",
    category: "wedding",
    fileName: "wedding-1.jpg",
    altText: "Bride and groom on wedding day",
  },
  {
    title: "Corporate Event",
    category: "event",
    fileName: "event-1.jpg",
    altText: "Corporate gathering",
  },
  {
    title: "Portrait Studio",
    category: "portrait",
    fileName: "portrait-1.jpg",
    altText: "Professional portrait photography",
  },
  {
    title: "Commercial Shoot",
    category: "commercial",
    fileName: "commercial-1.jpg",
    altText: "Product commercial photography",
  },
];

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected.");

    // Clear existing portfolio
    await Portfolio.deleteMany({});
    console.log("Cleared existing portfolio items.");

    // Copy images and insert data
    for (const item of seedData) {
      const srcPath = path.join(SEED_IMAGES_FOLDER, item.fileName);
      const destPath = path.join(UPLOADS_FOLDER, item.fileName);

      // Copy image
      await fse.copy(srcPath, destPath);
      console.log(`Copied ${item.fileName} to uploads folder.`);

      // Insert into MongoDB
      await Portfolio.create({
        title: item.title,
        category: item.category,
        imageUrl: `/uploads/portfolio/${item.fileName}`,
        altText: item.altText,
      });
      console.log(`Inserted ${item.title} into portfolio collection.`);
    }

    console.log("Seeding completed successfully.");
    process.exit();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
