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

// Import the Booking model
const Booking = require("./db/bookingModel");

// --- Middleware ---
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Body parsing middleware for JSON
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

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
      // Convert date string to a Date object, ensuring consistency
      date: new Date(date),
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
    // Check for double-booking error (Mongoose unique index error code 11000)
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
 * @desc Returns a list of all booked date/time slots to prevent double-booking.
 */
app.get("/api/availability", async (req, res) => {
  try {
    // Find all bookings and project only the date and time fields
    const bookedSlots = await Booking.find({}, "date time");

    // Format the output for easier client-side consumption (e.g., 'YYYY-MM-DD HH:MM')
    const formattedBookedSlots = bookedSlots.map((slot) => ({
      // Format the date to 'YYYY-MM-DD' string for client-side comparison
      date: slot.date.toISOString().split("T")[0],
      time: slot.time,
    }));

    res.json(formattedBookedSlots);
  } catch (err) {
    console.error("Availability fetch error:", err);
    res.status(500).json({ msg: "Server error fetching availability." });
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
