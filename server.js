// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Import models
const Booking = require("./db/bookingModel");
const Package = require("./db/packageModel");

// --- Middleware ---
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Body parsing middleware for JSON

// --- Database Connection ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => console.error("MongoDB connection error:", err));

// --- API Endpoints ---

/**
 * @route POST /api/book
 * @desc Inserts a new booking into the database.
 */
app.post("/api/book", async (req, res) => {
  try {
    const { name, email, phone, session_type, date, time, notes } = req.body;

    // Basic check for required fields
    if (!name || !email || !phone || !session_type || !date || !time) {
      return res
        .status(400)
        .json({ msg: "Please include all required fields." });
    }

    // Create a new Booking document
    const newBooking = new Booking({
      name,
      email,
      phone,
      session_type,
      date: new Date(date), // Ensure date object
      time,
      notes,
    });

    // Save the booking to the database
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

/**
 * @route POST /api/packages
 * @desc Creates a new package.
 */
app.post("/api/packages", async (req, res) => {
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
 * @desc Updates an existing package.
 */
app.put("/api/packages/:id", async (req, res) => {
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
 * @desc Deletes a package.
 */
app.delete("/api/packages/:id", async (req, res) => {
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

/**
 * @route GET /api/bookings
 * @desc Returns all bookings from the database.
 */
app.get("/api/bookings", async (req, res) => {
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
 * @desc Deletes a booking.
 */
app.delete("/api/bookings/:id", async (req, res) => {
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

// --- Static Files (must come AFTER API routes) ---
app.use(express.static(path.join(__dirname, "public")));

// OPTIONAL: If you're using a single-page application (React/Vue/SPA),
// uncomment this so refresh routes work.
/*
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
*/

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(
    `Admin dashboard available at http://localhost:${PORT}/admin.html`
  );
});
