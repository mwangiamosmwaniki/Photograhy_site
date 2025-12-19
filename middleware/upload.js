const multer = require("multer");
const cloudinary = require("../config/cloudinary"); // Cloudinary v2 config
const streamifier = require("streamifier");

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to upload a single file to Cloudinary
const uploadToCloudinary = (req, res, next) => {
  if (!req.file) return next();

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "portfolio",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
    (error, result) => {
      if (error) {
        console.error("❌ Cloudinary upload error:", error);
        return next(error);
      }

      // Attach URL and public_id for later use
      req.file.cloudinaryUrl = result.secure_url;
      req.file.cloudinaryId = result.public_id;

      next();
    }
  );

  // Pipe the buffer from multer to Cloudinary
  streamifier.createReadStream(req.file.buffer).pipe(stream);
};

module.exports = { upload, uploadToCloudinary };
