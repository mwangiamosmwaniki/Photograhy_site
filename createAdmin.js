const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./db/userModel");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully.");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists!");
      process.exit(0);
    }

    // Create new admin user
    const admin = new User({
      username: "admin",
      password: "admin123", // Change this to a secure password!
      role: "admin",
    });

    await admin.save();
    console.log("Admin user created successfully!");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log(
      "\n⚠️  IMPORTANT: Please change this password after first login!"
    );

    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
}

createAdmin();
