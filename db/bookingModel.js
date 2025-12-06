// db/bookingModel.js
const mongoose = require("mongoose");

// Define the schema for a booking
const BookingSchema = new mongoose.Schema({
  // Store name of the client
  name: { type: String, required: true },
  // Store email (used for contact/confirmation)
  email: { type: String, required: true },
  // Store phone number
  phone: { type: String, required: true },
  // Type of session/package booked (e.g., 'Wedding', 'Portrait')
  session_type: { type: String, required: true },
  // Date of the session (stored as a JavaScript Date object)
  date: { type: Date, required: true },
  // Time slot of the session (e.g., '10:00 AM')
  time: { type: String, required: true },
  // Optional notes from the client
  notes: { type: String },
  // Timestamp for when the booking was created
  created_at: { type: Date, default: Date.now },
});

// Create an index to quickly check for double-bookings on a specific date and time
BookingSchema.index({ date: 1, time: 1 }, { unique: true });

// Create and export the Mongoose model
module.exports = mongoose.model("Booking", BookingSchema);
