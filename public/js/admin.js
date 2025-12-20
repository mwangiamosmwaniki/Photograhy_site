// admin.js - Admin Dashboard JavaScript - Fixed version

// --- API Configuration ---
const config = {
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
  ? config.development.apiUrl
  : config.production.apiUrl;

console.log("🔐 Admin Panel API URL:", API_BASE_URL);
console.log("🌍 Environment:", isDevelopment ? "Development" : "Production");

// Session timeout configuration (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
let inactivityTimer;
let logoutWarningShown = false;
let currentPackageId = null;
let currentUserId = null;
let packagesData = [];
let bookingsData = [];
let usersData = [];
let portfolioData = [];
let confirmCallback = null;

// Authentication and Session Management
(async function checkAuth() {
  const token = localStorage.getItem("adminToken");
  console.log("🔑 Token present:", !!token);

  if (!token) {
    console.log("❌ No token found, redirecting to login");
    window.location.href = "login.html";
    return;
  }

  try {
    console.log("🔍 Verifying token...");
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("📊 Verify response status:", response.status);

    if (!response.ok) {
      console.log("❌ Token invalid, redirecting to login");
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
      return;
    }

    const data = await response.json();
    console.log("✅ Authentication successful:", data.user);

    const usernameEl = document.getElementById("currentUsername");
    if (usernameEl) {
      usernameEl.textContent = data.user.username;
    }
    resetInactivityTimer();

    // Load packages immediately after auth
    loadPackages();
  } catch (error) {
    console.error("❌ Auth error:", error);
    localStorage.removeItem("adminToken");
    window.location.href = "login.html";
  }
})();

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  logoutWarningShown = false;

  inactivityTimer = setTimeout(() => {
    if (!logoutWarningShown) {
      logoutWarningShown = true;
      showConfirm({
        title: "Inactivity Logout",
        message:
          "You've been inactive for 30 minutes. You'll be logged out in 30 seconds. Click Confirm to stay logged in.",
        type: "warning",
        confirmText: "Stay Logged In",
        confirmClass: "btn-primary",
        onConfirm: () => {
          resetInactivityTimer();
        },
      });
      setTimeout(() => logout(), 30000);
    }
  }, SESSION_TIMEOUT);
}

["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
  document.addEventListener(event, resetInactivityTimer, true);
});

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

// Helper function for authenticated fetch
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("adminToken");
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  console.log(`📡 Auth Fetch: ${options.method || "GET"} ${fullUrl}`);

  const config = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };

  return fetch(fullUrl, config);
}

// Tab Switching
function switchTab(event, tabName) {
  console.log("🔄 Switching to tab:", tabName);

  // Remove active classes
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Set active classes
  event.target.classList.add("active");
  document.getElementById(tabName).classList.add("active");

  // Call specific tab loaders
  if (tabName === "bookings") loadBookings();
  else if (tabName === "users") loadUsers();
  else if (tabName === "packages") loadPackages();
  else if (tabName === "portfolio") loadPortfolio();

  // Save the active tab in localStorage
  localStorage.setItem("activeTab", tabName);
}

// Packages
async function loadPackages() {
  console.log("📦 Loading packages...");

  const loadingEl = document.getElementById("packagesLoading");
  const contentEl = document.getElementById("packagesContent");
  const emptyEl = document.getElementById("packagesEmpty");
  const errorEl = document.getElementById("packagesError");

  // Show loading
  if (loadingEl) loadingEl.style.display = "block";
  if (contentEl) contentEl.style.display = "none";
  if (emptyEl) emptyEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/api/packages`);
    console.log("📊 Packages response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    packagesData = await response.json();
    console.log("✅ Packages loaded:", packagesData.length);

    if (loadingEl) loadingEl.style.display = "none";

    if (packagesData.length === 0) {
      console.log("📭 No packages found");
      if (emptyEl) emptyEl.style.display = "block";
      if (contentEl) contentEl.style.display = "none";
    } else {
      console.log("📋 Rendering packages");
      if (emptyEl) emptyEl.style.display = "none";
      if (contentEl) contentEl.style.display = "block";
      renderPackages();
    }
  } catch (error) {
    console.error("❌ Error loading packages:", error);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) {
      errorEl.textContent = `Failed to load packages: ${error.message}`;
      errorEl.style.display = "block";
    }
    showToast({
      title: "Error",
      message: `Failed to load packages: ${error.message}`,
      type: "error",
    });
  }
}

function renderPackages() {
  const tbody = document.getElementById("packagesTableBody");
  if (!tbody) {
    console.error("❌ packagesTableBody not found");
    return;
  }

  tbody.innerHTML = "";
  console.log("🎨 Rendering", packagesData.length, "packages");

  packagesData.forEach((pkg, index) => {
    console.log(`📝 Rendering package ${index + 1}:`, pkg.name);
    const row = document.createElement("tr");
    const featuresText = pkg.features
      .map((f) => (f.strikethrough ? `~~${f.text}~~` : f.text))
      .join(", ");

    row.innerHTML = `
      <td><strong>${pkg.name}</strong></td>
      <td>Ksh ${pkg.price.toLocaleString()}</td>
      <td>${pkg.description}</td>
      <td>${featuresText}</td>
      <td>
        <div class="actions">
          <button class="icon-btn btn-primary" onclick="editPackage('${
            pkg._id
          }')">Edit</button>
          <button class="icon-btn btn-danger" onclick="deletePackage('${
            pkg._id
          }', '${pkg.name}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openPackageModal(packageId = null) {
  currentPackageId = packageId;
  const modal = document.getElementById("packageModal");
  const form = document.getElementById("packageForm");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("featuresList").innerHTML = "";

  if (packageId) {
    const titleEl = document.getElementById("packageModalTitle");
    if (titleEl) titleEl.textContent = "Edit Package";

    const pkg = packagesData.find((p) => p._id === packageId);
    if (pkg) {
      document.getElementById("packageId").value = pkg._id;
      document.getElementById("packageName").value = pkg.name;
      document.getElementById("packagePrice").value = pkg.price;
      document.getElementById("packageDescription").value = pkg.description;
      pkg.features.forEach((f) => addFeatureInput(f.text, f.strikethrough));
    }
  } else {
    const titleEl = document.getElementById("packageModalTitle");
    if (titleEl) titleEl.textContent = "Add Package";
    addFeatureInput();
  }
  modal.classList.add("active");
}

function closePackageModal() {
  const modal = document.getElementById("packageModal");
  if (modal) modal.classList.remove("active");
  currentPackageId = null;
}

function addFeatureInput(text = "", strikethrough = false) {
  const featuresList = document.getElementById("featuresList");
  if (!featuresList) return;

  const featureItem = document.createElement("div");
  featureItem.className = "feature-item";
  featureItem.innerHTML = `
    <input type="text" placeholder="Feature text" value="${text}">
    <label style="display:flex;align-items:center;gap:0.25rem;white-space:nowrap;">
      <input type="checkbox" ${strikethrough ? "checked" : ""}>
      <span style="font-size:0.9rem;">Strike</span>
    </label>
    <button type="button" onclick="this.parentElement.remove()">Remove</button>
  `;
  featuresList.appendChild(featureItem);
}

const packageForm = document.getElementById("packageForm");
if (packageForm) {
  packageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("💾 Saving package...");

    const featureItems = document.querySelectorAll(
      "#featuresList .feature-item"
    );
    const features = Array.from(featureItems)
      .map((item) => ({
        text: item.querySelector('input[type="text"]').value,
        strikethrough: item.querySelector('input[type="checkbox"]').checked,
      }))
      .filter((f) => f.text.trim() !== "");

    const packageData = {
      name: document.getElementById("packageName").value,
      price: parseFloat(document.getElementById("packagePrice").value),
      description: document.getElementById("packageDescription").value,
      features,
    };

    console.log("📦 Package data:", packageData);

    try {
      const url = currentPackageId
        ? `${API_BASE_URL}/api/packages/${currentPackageId}`
        : `${API_BASE_URL}/api/packages`;
      const method = currentPackageId ? "PUT" : "POST";

      console.log(`📡 ${method} ${url}`);

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packageData),
      });

      console.log("📊 Save response status:", response.status);

      if (response.ok) {
        closePackageModal();
        loadPackages();
        showToast({
          title: "Success",
          message: currentPackageId ? "Package updated!" : "Package created!",
          type: "success",
        });
      } else {
        const data = await response.json();
        console.error("❌ Save failed:", data);
        showToast({
          title: "Error",
          message: data.msg || "Failed to save package",
          type: "error",
        });
      }
    } catch (error) {
      console.error("❌ Error saving package:", error);
      showToast({
        title: "Error",
        message: "Error saving package",
        type: "error",
      });
    }
  });
}

function editPackage(id) {
  openPackageModal(id);
}

// Bookings
async function loadBookings() {
  console.log("📅 Loading bookings...");

  const loadingEl = document.getElementById("bookingsLoading");
  const contentEl = document.getElementById("bookingsContent");
  const emptyEl = document.getElementById("bookingsEmpty");
  const errorEl = document.getElementById("bookingsError");

  if (loadingEl) loadingEl.style.display = "block";
  if (contentEl) contentEl.style.display = "none";
  if (emptyEl) emptyEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  try {
    const response = await authFetch(`${API_BASE_URL}/api/bookings`);
    console.log("📊 Bookings response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    bookingsData = await response.json();
    console.log("✅ Bookings loaded:", bookingsData.length);

    if (loadingEl) loadingEl.style.display = "none";

    if (bookingsData.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (contentEl) contentEl.style.display = "none";
    } else {
      if (emptyEl) emptyEl.style.display = "none";
      if (contentEl) contentEl.style.display = "block";
      updateBookingStats();
      renderBookings();
    }
  } catch (error) {
    console.error("❌ Error loading bookings:", error);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) {
      errorEl.textContent = `Failed to load bookings: ${error.message}`;
      errorEl.style.display = "block";
    }
    showToast({
      title: "Error",
      message: `Failed to load bookings: ${error.message}`,
      type: "error",
    });
  }
}

function updateBookingStats() {
  const total = bookingsData.length;
  const now = new Date();
  const upcoming = bookingsData.filter((b) => new Date(b.date) >= now).length;

  const totalEl = document.getElementById("totalBookings");
  const upcomingEl = document.getElementById("upcomingBookings");
  if (totalEl) totalEl.textContent = total;
  if (upcomingEl) upcomingEl.textContent = upcoming;
}

function renderBookings() {
  const tbody = document.getElementById("bookingsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  bookingsData.sort((a, b) => new Date(b.date) - new Date(a.date));

  bookingsData.forEach((booking) => {
    const row = document.createElement("tr");
    const formattedDate = new Date(booking.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const whatsappLink = generateWhatsAppLink(booking);

    row.innerHTML = `
      <td><strong>${booking.name}</strong></td>
      <td>${booking.email}</td>
      <td>
        ${booking.phone}
        <br>
        <a 
          href="${whatsappLink}" 
          target="_blank"
          style="
            display: inline-block;
            margin-top: 5px;
            background-color: #25D366;
            color: white;
            padding: 5px 12px;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          "
        >
          💬 WhatsApp
        </a>
      </td>
      <td>${booking.session_type}</td>
      <td>${formattedDate}</td>
      <td>${booking.time}</td>
      <td>${booking.notes || "N/A"}</td>
      <td>
        <div class="actions">
          <button class="icon-btn btn-danger" onclick="deleteBooking('${
            booking._id
          }', '${booking.name}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function formatPhoneForWhatsApp(phone) {
  const cleanNumber = phone.replace(/[\s\-\(\)]/g, "");
  let formattedNumber = cleanNumber;

  if (!formattedNumber.startsWith("+")) {
    if (formattedNumber.startsWith("0")) {
      formattedNumber = "254" + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith("254")) {
      formattedNumber = "254" + formattedNumber;
    }
  } else {
    formattedNumber = formattedNumber.substring(1);
  }

  return formattedNumber;
}

function generateWhatsAppLink(booking) {
  const formattedNumber = formatPhoneForWhatsApp(booking.phone);
  const date = new Date(booking.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = `✅ Hi ${booking.name}, this is Jr Photography confirming your ${booking.session_type} session on ${date} at ${booking.time}. We look forward to capturing your special moments! 📸`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
}

// Portfolio
async function loadPortfolio() {
  console.log("🖼️ Loading portfolio...");

  const loadingEl = document.getElementById("portfolioLoading");
  const gridEl = document.getElementById("portfolioGrid");
  const emptyEl = document.getElementById("portfolioEmpty");

  if (loadingEl) loadingEl.style.display = "block";
  if (gridEl) gridEl.style.display = "none";
  if (emptyEl) emptyEl.style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolio`);
    console.log("📊 Portfolio response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    portfolioData = await response.json();
    console.log("✅ Portfolio loaded:", portfolioData.length);

    if (loadingEl) loadingEl.style.display = "none";

    if (portfolioData.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (gridEl) gridEl.style.display = "none";
    } else {
      if (emptyEl) emptyEl.style.display = "none";
      if (gridEl) gridEl.style.display = "grid";
      renderPortfolio();
    }
  } catch (error) {
    console.error("❌ Error loading portfolio:", error);
    if (loadingEl) loadingEl.style.display = "none";
    const statusEl = document.getElementById("uploadStatus");
    if (statusEl) {
      statusEl.innerHTML =
        '<span style="color: #e74c3c;">Failed to load portfolio</span>';
    }
  }
}

function renderPortfolio() {
  const grid = document.getElementById("portfolioGrid");
  if (!grid) return;

  grid.innerHTML = "";

  portfolioData.forEach((item) => {
    const portfolioItem = document.createElement("div");
    portfolioItem.className = "portfolio-item";

    // Handle image URL
    const imageUrl = item.imageUrl.startsWith("http")
      ? item.imageUrl
      : `${API_BASE_URL}${item.imageUrl}`;

    portfolioItem.innerHTML = `
      <img src="${imageUrl}" alt="${item.altText}" loading="lazy" />
      <div class="portfolio-item-info">
        <h4>${item.title}</h4>
        <span class="category">${item.category}</span>
        <button class="btn btn-danger" onclick="deletePortfolioItem('${item._id}', '${item.title}')">
          Delete
        </button>
      </div>
    `;
    grid.appendChild(portfolioItem);
  });
}

// Handle portfolio upload form submission
const portfolioForm = document.getElementById("portfolioUploadForm");
const uploadStatus = document.getElementById("uploadStatus");

if (portfolioForm && uploadStatus) {
  portfolioForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Uploading portfolio image...");

    uploadStatus.textContent = "Uploading...";
    uploadStatus.style.color = "black";

    const formData = new FormData(portfolioForm);
    const token = localStorage.getItem("adminToken");

    if (!token) {
      uploadStatus.textContent = "Authentication required. Please login.";
      uploadStatus.style.color = "red";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/api/portfolio`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📊 Upload response status:", response.status);

      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || "Upload failed");

      uploadStatus.textContent = "Upload successful ✅";
      uploadStatus.style.color = "green";
      portfolioForm.reset();

      // Reload portfolio
      loadPortfolio();
    } catch (err) {
      console.error("❌ UPLOAD ERROR:", err);
      uploadStatus.textContent = err.message || "Upload failed ❌";
      uploadStatus.style.color = "red";
    }
  });
}

async function deletePortfolioItem(id, title) {
  showConfirm({
    title: "Delete Portfolio Item",
    message: `Delete "${title}"? This action cannot be undone.`,
    type: "danger",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      const token = localStorage.getItem("adminToken");
      try {
        const response = await fetch(
          `${API_BASE_URL}/admin/api/portfolio/${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.msg || "Failed to delete portfolio item");
        loadPortfolio();
        showToast({
          title: "Deleted",
          message: "Portfolio item deleted",
          type: "success",
        });
      } catch (err) {
        console.error(err);
        showToast({
          title: "Error",
          message: err.message || "Error deleting portfolio item",
          type: "error",
        });
      }
    },
  });
}

// Users
async function loadUsers() {
  console.log("👥 Loading users...");

  const loadingEl = document.getElementById("usersLoading");
  const contentEl = document.getElementById("usersContent");
  const emptyEl = document.getElementById("usersEmpty");
  const errorEl = document.getElementById("usersError");

  if (loadingEl) loadingEl.style.display = "block";
  if (contentEl) contentEl.style.display = "none";
  if (emptyEl) emptyEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  try {
    const response = await authFetch(`${API_BASE_URL}/api/users`);
    console.log("📊 Users response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    usersData = await response.json();
    console.log("✅ Users loaded:", usersData.length);

    if (loadingEl) loadingEl.style.display = "none";

    if (usersData.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (contentEl) contentEl.style.display = "none";
    } else {
      if (emptyEl) emptyEl.style.display = "none";
      if (contentEl) contentEl.style.display = "block";
      renderUsers();
    }
  } catch (error) {
    console.error("❌ Error loading users:", error);
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) {
      errorEl.textContent = `Failed to load users: ${error.message}`;
      errorEl.style.display = "block";
    }
    showToast({
      title: "Error",
      message: `Failed to load users: ${error.message}`,
      type: "error",
    });
  }
}

function renderUsers() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  usersData.forEach((user) => {
    const row = document.createElement("tr");
    const createdDate = new Date(user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    row.innerHTML = `
      <td><strong>${user.username}</strong></td>
      <td><span class="badge">${user.role}</span></td>
      <td>${createdDate}</td>
      <td>
        <div class="actions">
          <button class="icon-btn btn-primary" onclick="editUser('${user._id}')">Edit</button>
          <button class="icon-btn btn-danger" onclick="deleteUser('${user._id}', '${user.username}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openUserModal(userId = null) {
  currentUserId = userId;
  const modal = document.getElementById("userModal");
  const form = document.getElementById("userForm");
  if (!modal || !form) return;

  form.reset();

  if (userId) {
    const titleEl = document.getElementById("userModalTitle");
    if (titleEl) titleEl.textContent = "Edit User";

    const user = usersData.find((u) => u._id === userId);
    if (user) {
      document.getElementById("userId").value = user._id;
      document.getElementById("userUsername").value = user.username;
      document.getElementById("userRole").value = user.role;
      const passwordField = document.getElementById("userPassword");
      if (passwordField) passwordField.required = false;
    }
  } else {
    const titleEl = document.getElementById("userModalTitle");
    if (titleEl) titleEl.textContent = "Add User";
    const passwordField = document.getElementById("userPassword");
    if (passwordField) passwordField.required = true;
  }
  modal.classList.add("active");
}

function closeUserModal() {
  const modal = document.getElementById("userModal");
  if (modal) modal.classList.remove("active");
  currentUserId = null;
}

const userForm = document.getElementById("userForm");
if (userForm) {
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userData = {
      username: document.getElementById("userUsername").value,
      role: document.getElementById("userRole").value,
    };

    const password = document.getElementById("userPassword").value;
    if (password) userData.password = password;

    try {
      const url = currentUserId
        ? `${API_BASE_URL}/api/users/${currentUserId}`
        : `${API_BASE_URL}/api/users`;
      const method = currentUserId ? "PUT" : "POST";
      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        closeUserModal();
        loadUsers();
        showToast({
          title: "Success",
          message: currentUserId ? "User updated!" : "User created!",
          type: "success",
        });
      } else {
        const data = await response.json();
        showToast({
          title: "Error",
          message: data.msg || "Failed to save user",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error saving user:", error);
      showToast({
        title: "Error",
        message: "Error saving user",
        type: "error",
      });
    }
  });
}

function editUser(id) {
  openUserModal(id);
}

// Delete Functions
async function deletePackage(id, name) {
  showConfirm({
    title: "Delete Package",
    message: `Delete "${name}"? This action cannot be undone.`,
    type: "danger",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/packages/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          loadPackages();
          showToast({
            title: "Deleted",
            message: "Package deleted successfully",
            type: "success",
          });
        } else {
          showToast({
            title: "Error",
            message: "Failed to delete package",
            type: "error",
          });
        }
      } catch (err) {
        console.error(err);
        showToast({
          title: "Error",
          message: "Error deleting package",
          type: "error",
        });
      }
    },
  });
}

async function deleteBooking(id, name) {
  showConfirm({
    title: "Delete Booking",
    message: `Delete booking for "${name}"?`,
    type: "danger",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/bookings/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          loadBookings();
          showToast({
            title: "Deleted",
            message: "Booking deleted successfully",
            type: "success",
          });
        } else {
          showToast({
            title: "Error",
            message: "Failed to delete booking",
            type: "error",
          });
        }
      } catch (err) {
        console.error(err);
        showToast({
          title: "Error",
          message: "Error deleting booking",
          type: "error",
        });
      }
    },
  });
}

async function deleteUser(id, username) {
  showConfirm({
    title: "Delete User",
    message: `Delete user "${username}"?`,
    type: "danger",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/users/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          loadUsers();
          showToast({
            title: "Deleted",
            message: "User deleted successfully",
            type: "success",
          });
        } else {
          const data = await response.json();
          showToast({
            title: "Error",
            message: data.msg || "Failed to delete user",
            type: "error",
          });
        }
      } catch (err) {
        console.error(err);
        showToast({
          title: "Error",
          message: "Error deleting user",
          type: "error",
        });
      }
    },
  });
}

// Confirmation Dialog
function showConfirm(options = {}) {
  const {
    title = "Confirm Action",
    message = "Are you sure?",
    type = "warning",
    confirmText = "Confirm",
    confirmClass = "btn-danger",
    onConfirm = () => {},
  } = options;

  const dialog = document.getElementById("confirmDialog");
  const icon = document.getElementById("confirmIcon");
  const titleEl = document.getElementById("confirmTitle");
  const messageEl = document.getElementById("confirmMessage");
  const confirmBtn = document.getElementById("confirmActionBtn");

  if (!dialog || !icon || !titleEl || !messageEl || !confirmBtn) return;

  const icons = {
    danger: "🗑️",
    warning: "⚠️",
    info: "ℹ️",
    success: "✓",
  };

  confirmCallback = null;

  icon.textContent = icons[type] || icons.warning;
  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  confirmBtn.className = `btn ${confirmClass}`;

  confirmCallback = typeof onConfirm === "function" ? onConfirm : null;

  dialog.classList.add("active");
}

function closeConfirmDialog() {
  const dialog = document.getElementById("confirmDialog");
  if (dialog) dialog.classList.remove("active");
  confirmCallback = null;
}

function confirmAction() {
  if (confirmCallback) confirmCallback();
  closeConfirmDialog();
}

const confirmDialog = document.getElementById("confirmDialog");
if (confirmDialog) {
  confirmDialog.addEventListener("click", function (e) {
    if (e.target === this) closeConfirmDialog();
  });
}

// Toast Notifications
function showToast(options) {
  const {
    title = "Notification",
    message = "",
    type = "info",
    duration = 4000,
  } = options;

  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      ${message ? `<p class="toast-message">${message}</p>` : ""}
    </div>
    <button class="toast-close" onclick="removeToast(this.parentElement)">×</button>
  `;

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

function removeToast(toast) {
  toast.classList.add("removing");
  setTimeout(() => {
    if (toast.parentElement) toast.parentElement.removeChild(toast);
  }, 300);
}
