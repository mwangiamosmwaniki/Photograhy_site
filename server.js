// server.js - Updated for separate frontend/backend hosting
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

// --- CORS Configuration for Separate Frontend ---
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3001", // Alternative local dev
  "http://localhost:8080", // Another common dev port
  "http://127.0.0.1:5173", // Local IP variant
  "https://jr-photography.onrender.com", // ✅ YOUR FRONTEND URL
  "https://photography-site-8pct.onrender.com", // ✅ BACKEND URL (for testing)
  process.env.FRONTEND_URL, // From environment variable
  process.env.FRONTEND_URL_2, // Optional second frontend URL
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      console.log("✅ Allowing request with no origin");
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log("✅ Allowed by CORS:", origin);
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      console.log("📋 Allowed origins:", allowedOrigins);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests
app.options("*", cors(corsOptions));

// --- Middleware ---
app.use(express.json()); // Body parsing middleware for JSON
app.use(express.urlencoded({ extended: true })); // For form data

// --- Database Connection ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully."))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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

const nodemailer = require("nodemailer");

// Email Configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @route POST /api/contact
 * @desc Send email from general contact form
 */
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        msg: "Please include name, email, and message.",
      });
    }

    // Email options
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_USER,
      subject: subject || `New contact form message from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || "N/A"}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Contact form email sent:", info.messageId);

    res.json({ success: true, msg: "Message sent successfully!" });
  } catch (err) {
    console.error("❌ Contact form error:", err);
    res.status(500).json({ success: false, msg: "Failed to send message." });
  }
});

/**
 * Format phone number for WhatsApp Web link
 */
function formatPhoneForWhatsApp(phoneNumber) {
  // Clean phone number (remove spaces, dashes, parentheses)
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");

  // Add country code if not present (assuming Kenya +254)
  let formattedNumber = cleanNumber;
  if (!formattedNumber.startsWith("+")) {
    if (formattedNumber.startsWith("0")) {
      formattedNumber = "254" + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith("254")) {
      formattedNumber = formattedNumber;
    } else {
      formattedNumber = "254" + formattedNumber;
    }
  } else {
    // Remove + sign for WhatsApp link
    formattedNumber = formattedNumber.substring(1);
  }

  return formattedNumber;
}

/**
 * Generate WhatsApp message link
 */
function generateWhatsAppLink(phoneNumber, bookingDetails) {
  const formattedNumber = formatPhoneForWhatsApp(phoneNumber);

  const message = `✅ *Booking Confirmed!*

Hi ${bookingDetails.name},

Your photography session has been confirmed:

📅 *Date:* ${bookingDetails.date}
⏰ *Time:* ${bookingDetails.time}
📦 *Package:* ${bookingDetails.session_type}

We look forward to capturing your special moments!

- Jr Photography`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
}

/**
 * Send email confirmation with WhatsApp link
 */
async function sendEmailConfirmation(email, bookingDetails, whatsappLink) {
  console.log("📧 Attempting to send email to:", email);

  const mailOptions = {
    from: `"Jr Photography" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Booking Confirmation - Jr Photography",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .detail-row { margin: 10px 0; padding: 10px; background-color: white; }
          .label { font-weight: bold; color: #555; }
          .whatsapp-btn { 
            display: inline-block; 
            background-color: #25D366; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${bookingDetails.name},</p>
            <p>Thank you for booking with Jr Photography! Your session has been confirmed.</p>
            
            <div class="detail-row">
              <span class="label">📅 Date:</span> ${bookingDetails.date}
            </div>
            
            <div class="detail-row">
              <span class="label">⏰ Time:</span> ${bookingDetails.time}
            </div>
            
            <div class="detail-row">
              <span class="label">📦 Package:</span> ${
                bookingDetails.session_type
              }
            </div>
            
            <div class="detail-row">
              <span class="label">📱 Phone:</span> ${bookingDetails.phone}
            </div>
            
            ${
              bookingDetails.notes
                ? `
            <div class="detail-row">
              <span class="label">📝 Notes:</span> ${bookingDetails.notes}
            </div>
            `
                : ""
            }
            
            <div style="text-align: center;">
              <a href="${whatsappLink}" class="whatsapp-btn">
                💬 Confirm via WhatsApp
              </a>
              <p style="font-size: 12px; color: #666;">Click the button above to send us a quick confirmation via WhatsApp</p>
            </div>
            
            <p style="margin-top: 20px;">If you need to reschedule or have any questions, please contact us at ${
              process.env.EMAIL_USER
            } or via WhatsApp.</p>
            
            <p>We look forward to capturing your special moments!</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>Jr Photography Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated confirmation email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    console.log("📤 Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);

    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    console.error("Error code:", error.code);
    console.error("Error response:", error.response);

    // Re-throw to be caught by calling function
    throw error;
  }
}

/**
 * @route POST /api/book
 * @desc Create a new booking and send confirmation
 * OPTIMIZED: Sends email asynchronously in background
 */
app.post("/api/book", async (req, res) => {
  try {
    const { name, email, phone, session_type, date, time, notes } = req.body;

    // Validation
    if (!name || !email || !phone || !session_type || !date || !time) {
      return res
        .status(400)
        .json({ success: false, msg: "Please include all required fields." });
    }

    // Create the booking
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
    console.log("✅ Booking saved to database:", booking._id);

    // Prepare booking details
    const bookingDetails = {
      name,
      email,
      phone,
      session_type,
      date: new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time,
      notes,
    };

    // Generate WhatsApp link
    const whatsappLink = generateWhatsAppLink(
      process.env.BUSINESS_WHATSAPP_NUMBER,
      bookingDetails
    );

    console.log("📱 WhatsApp link generated:", whatsappLink);

    // 🚀 Send email in background (don't await - fire and forget)
    sendEmailConfirmation(email, bookingDetails, whatsappLink)
      .then(() => {
        console.log("✅ Background email sent successfully to:", email);
      })
      .catch((emailError) => {
        console.error("❌ Background email sending error:", emailError);
        console.error("Error details:", {
          message: emailError.message,
          code: emailError.code,
          command: emailError.command,
        });
      });

    // ⚡ Return response IMMEDIATELY (don't wait for email)
    res.status(201).json({
      success: true,
      msg: "Booking confirmed successfully!",
      booking: {
        id: booking._id,
        name: booking.name,
        date: booking.date,
        time: booking.time,
        session_type: booking.session_type,
      },
      whatsappLink: whatsappLink,
      emailStatus: "pending", // Email is being sent in background
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "This date and time slot is already booked. Please choose another.",
      });
    }
    console.error("❌ Booking error:", err);
    res.status(500).json({
      success: false,
      msg: "Server error during booking.",
      error: err.message,
    });
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

// --- Portfolio Routes ---
app.use("/api/portfolio", require("./routes/portfolioRoutes"));
app.use("/admin/api/portfolio", require("./routes/adminPortfolioRoutes"));

// --- Static file serving for uploads (images) ---
// This is needed even with separate frontend to serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// --- Health Check Endpoint ---
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Jr Photography API is running",
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins,
  });
});

// --- 404 Handler for undefined routes ---
app.use((req, res) => {
  res.status(404).json({
    msg: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    msg: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Allowed Origins:`, allowedOrigins);
  console.log(`🔐 JWT Secret: ${JWT_SECRET ? "✓ Set" : "✗ Not Set"}`);
  console.log(
    `📧 Email User: ${process.env.EMAIL_USER ? "✓ Set" : "✗ Not Set"}`
  );
  console.log(
    `📱 WhatsApp Number: ${
      process.env.BUSINESS_WHATSAPP_NUMBER ? "✓ Set" : "✗ Not Set"
    }`
  );
  console.log(`\n⚡ Ready to accept requests!\n`);
});
