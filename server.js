// Add this new function after the sendEmailConfirmation function

/**
 * Send admin notification email about new booking
 */
async function sendAdminNotification(bookingDetails) {
  console.log(
    "📧 Sending admin notification email to:",
    process.env.EMAIL_USER
  );

  const mailOptions = {
    from: `"Jr Photography Bookings" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // Admin email
    subject: `🔔 New Booking: ${bookingDetails.name} - ${bookingDetails.date}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .detail-row { margin: 10px 0; padding: 10px; background-color: white; border-left: 4px solid #2196F3; }
          .label { font-weight: bold; color: #555; display: inline-block; min-width: 120px; }
          .highlight { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Booking Received!</h1>
          </div>
          <div class="content">
            <div class="highlight">
              <strong>⚡ Action Required:</strong> A new photography session has been booked. Please review the details below and prepare accordingly.
            </div>
            
            <h2>Customer Information</h2>
            <div class="detail-row">
              <span class="label">👤 Name:</span> <strong>${
                bookingDetails.name
              }</strong>
            </div>
            
            <div class="detail-row">
              <span class="label">📧 Email:</span> ${bookingDetails.email}
            </div>
            
            <div class="detail-row">
              <span class="label">📱 Phone:</span> ${bookingDetails.phone}
            </div>
            
            <h2>Session Details</h2>
            <div class="detail-row">
              <span class="label">📅 Date:</span> <strong>${
                bookingDetails.date
              }</strong>
            </div>
            
            <div class="detail-row">
              <span class="label">⏰ Time:</span> <strong>${
                bookingDetails.time
              }</strong>
            </div>
            
            <div class="detail-row">
              <span class="label">📦 Package:</span> <strong>${
                bookingDetails.session_type
              }</strong>
            </div>
            
            ${
              bookingDetails.notes
                ? `
            <h2>Additional Notes</h2>
            <div class="detail-row">
              <span class="label">📝 Notes:</span> ${bookingDetails.notes}
            </div>
            `
                : ""
            }
            
            <div style="margin-top: 30px; padding: 15px; background-color: #e8f5e9; border-radius: 5px;">
              <p style="margin: 0;"><strong>✅ Customer Confirmation:</strong> An automatic confirmation email has been sent to ${
                bookingDetails.email
              }</p>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
              <p style="font-size: 14px; color: #666;">
                You can manage this booking from your admin dashboard or contact the customer directly.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Jr Photography booking system.</p>
            <p>Received at: ${new Date().toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Admin notification email sent successfully!");
    console.log("Message ID:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Failed to send admin notification email:", error);
    throw error;
  }
}

// Then update the /api/book endpoint to send BOTH emails:

/**
 * @route POST /api/book
 * @desc Create a new booking and send confirmations to customer AND admin
 * OPTIMIZED: Sends emails asynchronously in background
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

    // 🚀 Send customer confirmation email in background
    sendEmailConfirmation(email, bookingDetails, whatsappLink)
      .then(() => {
        console.log("✅ Customer confirmation email sent to:", email);
      })
      .catch((emailError) => {
        console.error("❌ Customer email error:", emailError);
        console.error("Error details:", {
          message: emailError.message,
          code: emailError.code,
        });
      });

    // 🚀 Send admin notification email in background
    sendAdminNotification(bookingDetails)
      .then(() => {
        console.log(
          "✅ Admin notification email sent to:",
          process.env.EMAIL_USER
        );
      })
      .catch((emailError) => {
        console.error("❌ Admin notification email error:", emailError);
        console.error("Error details:", {
          message: emailError.message,
          code: emailError.code,
        });
      });

    // ⚡ Return response IMMEDIATELY (don't wait for emails)
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
      emailStatus: "pending", // Emails are being sent in background
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
