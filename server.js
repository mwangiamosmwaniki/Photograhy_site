// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Import models
const Booking = require("./db/bookingModel");
const Package = require("./db/packageModel");
const User = require("./db/userModel");

// Import middleware
const authMiddleware = require("./middleware/authMiddleware");

// --- Middleware ---
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Body parsing middleware for JSON

// --- Database Connection ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => console.error("MongoDB connection error:", err));

// --- Authentication Endpoints ---

/**
 * @route POST /api/auth/login
 * @desc Login admin user
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ msg: "Please provide username and password" });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error during login" });
  }
});

/**
 * @route GET /api/auth/verify
 * @desc Verify token
 */
app.get("/api/auth/verify", authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// --- Public API Endpoints ---

/**
 * @route POST /api/book
 * @desc Inserts a new booking into the database.
 */
app.post("/api/book", async (req, res) => {
  try {
    const { name, email, phone, session_type, date, time, notes } = req.body;

    if (!name || !email || !phone || !session_type || !date || !time) {
      return res
        .status(400)
        .json({ msg: "Please include all required fields." });
    }

    const newBooking = new Booking({
      name,
      email,
      phone,
      session_type,
      date: new Date(date),
      time,
      notes,
    });

    const booking = await newBooking.save();
    res.status(201).json({
      msg: "Booking confirmed successfully!",
      booking_id: booking._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        msg: "This date and time slot is already booked. Please choose another.",
      });
    }
    console.error("Booking error:", err);
    res.status(500).json({ msg: "Server error during booking." });
  }
});

/**
 * @route GET /api/availability
 * @desc Returns a list of all booked date/time slots.
 */
app.get("/api/availability", async (req, res) => {
  try {
    const bookedSlots = await Booking.find({}, "date time");

    const formattedBookedSlots = bookedSlots.map((slot) => ({
      date: slot.date.toISOString().split("T")[0],
      time: slot.time,
    }));

    res.json(formattedBookedSlots);
  } catch (err) {
    console.error("Availability fetch error:", err);
    res.status(500).json({ msg: "Server error fetching availability." });
  }
});

/**
 * @route GET /api/packages
 * @desc Returns all photography packages from the database.
 */
app.get("/api/packages", async (req, res) => {
  try {
    const packages = await Package.find({}).sort({ price: 1 });
    res.json(packages);
  } catch (err) {
    console.error("Packages fetch error:", err);
    res.status(500).json({ msg: "Server error fetching packages." });
  }
});

/**
 * @route GET /api/packages/:id
 * @desc Returns a single package by ID.
 */
app.get("/api/packages/:id", async (req, res) => {
  try {
    const package = await Package.findById(req.params.id);

    if (!package) {
      return res.status(404).json({ msg: "Package not found." });
    }

    res.json(package);
  } catch (err) {
    console.error("Package fetch error:", err);
    res.status(500).json({ msg: "Server error fetching package." });
  }
});

// --- Protected Admin Endpoints ---

/**
 * @route GET /api/bookings
 * @desc Returns all bookings from the database (PROTECTED)
 */
app.get("/api/bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({}).sort({ date: -1 });
    res.json(bookings);
  } catch (err) {
    console.error("Bookings fetch error:", err);
    res.status(500).json({ msg: "Server error fetching bookings." });
  }
});

/**
 * @route DELETE /api/bookings/:id
 * @desc Deletes a booking (PROTECTED)
 */
app.delete("/api/bookings/:id", authMiddleware, async (req, res) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);

    if (!deletedBooking) {
      return res.status(404).json({ msg: "Booking not found." });
    }

    res.json({ msg: "Booking deleted successfully." });
  } catch (err) {
    console.error("Booking deletion error:", err);
    res.status(500).json({ msg: "Server error deleting booking." });
  }
});

/**
 * @route POST /api/packages
 * @desc Creates a new package (PROTECTED)
 */
app.post("/api/packages", authMiddleware, async (req, res) => {
  try {
    const { name, price, description, features } = req.body;

    if (!name || !price || !description) {
      return res
        .status(400)
        .json({ msg: "Please include all required fields." });
    }

    const newPackage = new Package({
      name,
      price,
      description,
      features: features || [],
    });

    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ msg: "A package with this name already exists." });
    }
    console.error("Package creation error:", err);
    res.status(500).json({ msg: "Server error creating package." });
  }
});

/**
 * @route PUT /api/packages/:id
 * @desc Updates an existing package (PROTECTED)
 */
app.put("/api/packages/:id", authMiddleware, async (req, res) => {
  try {
    const { name, price, description, features } = req.body;

    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      { name, price, description, features },
      { new: true, runValidators: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ msg: "Package not found." });
    }

    res.json(updatedPackage);
  } catch (err) {
    console.error("Package update error:", err);
    res.status(500).json({ msg: "Server error updating package." });
  }
});

/**
 * @route DELETE /api/packages/:id
 * @desc Deletes a package (PROTECTED)
 */
app.delete("/api/packages/:id", authMiddleware, async (req, res) => {
  try {
    const deletedPackage = await Package.findByIdAndDelete(req.params.id);

    if (!deletedPackage) {
      return res.status(404).json({ msg: "Package not found." });
    }

    res.json({ msg: "Package deleted successfully." });
  } catch (err) {
    console.error("Package deletion error:", err);
    res.status(500).json({ msg: "Server error deleting package." });
  }
});

// ---image management endpoints would go here---
app.use("/api/portfolio", require("./routes/portfolioRoutes"));
app.use("/admin/api/portfolio", require("./routes/adminPortfolioRoutes"));
app.use("/uploads", express.static("uploads"));

// --- User Management Endpoints (PROTECTED) ---

/**
 * @route GET /api/users
 * @desc Get all users (PROTECTED)
 */
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Users fetch error:", err);
    res.status(500).json({ msg: "Server error fetching users." });
  }
});

/**
 * @route POST /api/users
 * @desc Create a new user (PROTECTED)
 */
app.post("/api/users", authMiddleware, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ msg: "Username and password are required." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ msg: "Username already exists." });
    }

    const newUser = new User({
      username,
      password,
      role: role || "admin",
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (err) {
    console.error("User creation error:", err);
    res.status(500).json({ msg: "Server error creating user." });
  }
});

/**
 * @route PUT /api/users/:id
 * @desc Update a user (PROTECTED)
 */
app.put("/api/users/:id", authMiddleware, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    if (username) user.username = username;
    if (role) user.role = role;
    if (password) user.password = password;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ msg: "Server error updating user." });
  }
});

/**
 * @route DELETE /api/users/:id
 * @desc Delete a user (PROTECTED)
 */
app.delete("/api/users/:id", authMiddleware, async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.user.id === req.params.id) {
      return res
        .status(400)
        .json({ msg: "You cannot delete your own account." });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ msg: "User not found." });
    }

    res.json({ msg: "User deleted successfully." });
  } catch (err) {
    console.error("User deletion error:", err);
    res.status(500).json({ msg: "Server error deleting user." });
  }
});

// --- Static Files (must come AFTER API routes) ---
app.use(express.static(path.join(__dirname, "public")));

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Admin login at http://localhost:${PORT}/login.html`);
  console.log(`Admin dashboard at http://localhost:${PORT}/admin.html`);
});
