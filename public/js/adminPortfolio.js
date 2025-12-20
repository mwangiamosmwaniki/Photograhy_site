// --- Admin Portfolio Upload Script - Updated for separate hosting ---

// --- API Configuration ---
const ADMIN_PORTFOLIO_CONFIG = {
  development: {
    apiUrl: "http://localhost:3000",
  },
  production: {
    apiUrl: "https://photography-site-8pct.onrender.com",
  },
};

const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE_URL = isDevelopment
  ? ADMIN_PORTFOLIO_CONFIG.development.apiUrl
  : ADMIN_PORTFOLIO_CONFIG.production.apiUrl;

console.log("📤 Admin Portfolio Upload API URL:", API_BASE_URL);
console.log("🌍 Current hostname:", window.location.hostname);
console.log("🔧 Development mode:", isDevelopment);

// --- Admin Portfolio Upload Script ---
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("portfolioUploadForm");
  const status = document.getElementById("uploadStatus");

  if (!form) {
    console.warn("⚠️ Portfolio upload form not found");
    return;
  }

  if (!status) {
    console.warn("⚠️ Upload status element not found");
    return;
  }

  console.log("✅ Portfolio upload form initialized");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Update status
    status.textContent = "Uploading...";
    status.style.color = "#333";

    // Get form data
    const formData = new FormData(form);

    // Log form data for debugging
    console.log("📋 Form data:");
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    // Get token - check both "token" and "adminToken" for compatibility
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("token");

    if (!token) {
      console.error("❌ No authentication token found");
      status.textContent = "Authentication required. Please login.";
      status.style.color = "red";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }

    console.log("🔐 Token found:", token.substring(0, 20) + "...");

    const uploadEndpoint = `${API_BASE_URL}/admin/api/portfolio`;
    console.log("📡 Uploading to:", uploadEndpoint);

    try {
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📊 Upload response status:", res.status);
      console.log("📊 Upload response ok:", res.ok);

      const data = await res.json();
      console.log("📦 Upload response data:", data);

      if (!res.ok) {
        throw new Error(data.msg || data.message || "Upload failed");
      }

      // Success!
      console.log("✅ Upload successful!");
      status.textContent = "Upload successful ✅";
      status.style.color = "green";
      form.reset();

      // Show success for 3 seconds
      setTimeout(() => {
        status.textContent = "";

        // Reload portfolio if we're on the admin page
        if (typeof loadPortfolio === "function") {
          console.log("🔄 Reloading portfolio...");
          loadPortfolio();
        }
      }, 3000);
    } catch (err) {
      console.error("❌ Upload error:", err);
      console.error("❌ Error details:", {
        message: err.message,
        stack: err.stack,
      });

      status.textContent = err.message || "Upload failed ❌";
      status.style.color = "red";

      // Clear error after 5 seconds
      setTimeout(() => {
        status.style.color = "#666";
      }, 5000);
    }
  });

  // Add file input change listener for validation
  const fileInput = form.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        console.log("📁 File selected:", {
          name: file.name,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          type: file.type,
        });

        // Validate file size (e.g., max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          status.textContent = `⚠️ File too large. Maximum size is 5MB.`;
          status.style.color = "orange";
          fileInput.value = "";
          return;
        }

        // Validate file type
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];
        if (!validTypes.includes(file.type)) {
          status.textContent = `⚠️ Invalid file type. Please upload JPG, PNG, or WebP images.`;
          status.style.color = "orange";
          fileInput.value = "";
          return;
        }

        status.textContent = `✓ File ready: ${file.name}`;
        status.style.color = "green";
      }
    });
  }
});
