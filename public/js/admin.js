// admin.js - Admin Dashboard JavaScript

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

// Confirm callback
let confirmCallback = null;

// Authentication and Session Management
(async function checkAuth() {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch("/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
      return;
    }

    const data = await response.json();
    document.getElementById("currentUsername").textContent = data.user.username;
    resetInactivityTimer();
  } catch (error) {
    console.error("Auth error:", error);
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

// Update fetch to include auth token
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const token = localStorage.getItem("adminToken");
  if (token) {
    if (args[1]) {
      args[1].headers = {
        ...args[1].headers,
        Authorization: `Bearer ${token}`,
      };
    } else {
      args[1] = { headers: { Authorization: `Bearer ${token}` } };
    }
  }
  return originalFetch.apply(this, args);
};

// Tab Switching
function switchTab(event, tabName) {
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

  // Call your specific tab loaders
  if (tabName === "bookings") loadBookings();
  else if (tabName === "users") loadUsers();
  else if (tabName === "portfolio") loadPortfolio();

  // Save the active tab in localStorage
  localStorage.setItem("activeTab", tabName);
}

// On page load, restore the active tab
document.addEventListener("DOMContentLoaded", () => {
  const savedTab = localStorage.getItem("activeTab") || "packages"; // default tab
  const tabButton = document.querySelector(`.tab[onclick*="'${savedTab}'"]`);
  if (tabButton) {
    tabButton.click(); // triggers switchTab
  }
});

// Packages
async function loadPackages() {
  try {
    const response = await fetch("/api/packages");
    packagesData = await response.json();
    document.getElementById("packagesLoading").style.display = "none";

    if (packagesData.length === 0) {
      document.getElementById("packagesEmpty").style.display = "block";
      document.getElementById("packagesContent").style.display = "none";
    } else {
      document.getElementById("packagesEmpty").style.display = "none";
      document.getElementById("packagesContent").style.display = "block";
      renderPackages();
    }
  } catch (error) {
    console.error("Error loading packages:", error);
    showToast({
      title: "Error",
      message: "Failed to load packages",
      type: "error",
    });
  }
}

function renderPackages() {
  const tbody = document.getElementById("packagesTableBody");
  tbody.innerHTML = "";

  packagesData.forEach((pkg) => {
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
  form.reset();
  document.getElementById("featuresList").innerHTML = "";

  if (packageId) {
    document.getElementById("packageModalTitle").textContent = "Edit Package";
    const pkg = packagesData.find((p) => p._id === packageId);
    if (pkg) {
      document.getElementById("packageId").value = pkg._id;
      document.getElementById("packageName").value = pkg.name;
      document.getElementById("packagePrice").value = pkg.price;
      document.getElementById("packageDescription").value = pkg.description;
      pkg.features.forEach((f) => addFeatureInput(f.text, f.strikethrough));
    }
  } else {
    document.getElementById("packageModalTitle").textContent = "Add Package";
    addFeatureInput();
  }
  modal.classList.add("active");
}

function closePackageModal() {
  document.getElementById("packageModal").classList.remove("active");
  currentPackageId = null;
}

function addFeatureInput(text = "", strikethrough = false) {
  const featuresList = document.getElementById("featuresList");
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

document.getElementById("packageForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const featureItems = document.querySelectorAll("#featuresList .feature-item");
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

  try {
    const url = currentPackageId
      ? `/api/packages/${currentPackageId}`
      : "/api/packages";
    const method = currentPackageId ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packageData),
    });

    if (response.ok) {
      closePackageModal();
      loadPackages();
      showToast({
        title: "Success",
        message: currentPackageId ? "Package updated!" : "Package created!",
        type: "success",
      });
    } else {
      showToast({
        title: "Error",
        message: "Failed to save package",
        type: "error",
      });
    }
  } catch (error) {
    console.error("Error saving package:", error);
    showToast({
      title: "Error",
      message: "Error saving package",
      type: "error",
    });
  }
});

function editPackage(id) {
  openPackageModal(id);
}

// Bookings
async function loadBookings() {
  try {
    const response = await fetch("/api/bookings");
    bookingsData = await response.json();
    document.getElementById("bookingsLoading").style.display = "none";

    if (bookingsData.length === 0) {
      document.getElementById("bookingsEmpty").style.display = "block";
      document.getElementById("bookingsContent").style.display = "none";
    } else {
      document.getElementById("bookingsEmpty").style.display = "none";
      document.getElementById("bookingsContent").style.display = "block";
      updateBookingStats();
      renderBookings();
    }
  } catch (error) {
    console.error("Error loading bookings:", error);
    showToast({
      title: "Error",
      message: "Failed to load bookings",
      type: "error",
    });
  }
}

function updateBookingStats() {
  const total = bookingsData.length;
  const now = new Date();
  const upcoming = bookingsData.filter((b) => new Date(b.date) >= now).length;
  document.getElementById("totalBookings").textContent = total;
  document.getElementById("upcomingBookings").textContent = upcoming;
}

function renderBookings() {
  const tbody = document.getElementById("bookingsTableBody");
  tbody.innerHTML = "";
  bookingsData.sort((a, b) => new Date(b.date) - new Date(a.date));

  bookingsData.forEach((booking) => {
    const row = document.createElement("tr");
    const formattedDate = new Date(booking.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    row.innerHTML = `
      <td><strong>${booking.name}</strong></td>
      <td>${booking.email}</td>
      <td>${booking.phone}</td>
      <td>${booking.session_type}</td>
      <td>${formattedDate}</td>
      <td>${booking.time}</td>
      <td>
        <div class="actions">
          <button class="icon-btn btn-danger" onclick="deleteBooking('${booking._id}', '${booking.name}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Portfolio
async function loadPortfolio() {
  try {
    const response = await fetch("/api/portfolio");
    portfolioData = await response.json();
    document.getElementById("portfolioLoading").style.display = "none";

    if (portfolioData.length === 0) {
      document.getElementById("portfolioEmpty").style.display = "block";
      document.getElementById("portfolioGrid").style.display = "none";
    } else {
      document.getElementById("portfolioEmpty").style.display = "none";
      document.getElementById("portfolioGrid").style.display = "grid";
      renderPortfolio();
    }
  } catch (error) {
    console.error("Error loading portfolio:", error);
    document.getElementById("uploadStatus").innerHTML =
      '<span style="color: #e74c3c;">Failed to load portfolio</span>';
  }
}

function renderPortfolio() {
  const grid = document.getElementById("portfolioGrid");
  grid.innerHTML = "";

  portfolioData.forEach((item) => {
    const portfolioItem = document.createElement("div");
    portfolioItem.className = "portfolio-item";
    portfolioItem.innerHTML = `
      <img src="${item.imageUrl}" alt="${item.altText}" loading="lazy" />
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
const form = document.getElementById("portfolioUploadForm");
const status = document.getElementById("uploadStatus");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  status.textContent = "Uploading...";
  status.style.color = "black";

  const formData = new FormData(form);
  const token = localStorage.getItem("adminToken");

  try {
    const response = await fetch("/admin/api/portfolio", {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.msg || "Upload failed");

    status.textContent = "Upload successful ✅";
    status.style.color = "green";
    form.reset();
  } catch (err) {
    console.error("UPLOAD ERROR ↓↓↓");
    console.error(err);

    status.textContent = err.message || "Upload failed ❌";
    status.style.color = "red";
  }
});

// Users
async function loadUsers() {
  try {
    const response = await fetch("/api/users");
    usersData = await response.json();
    document.getElementById("usersLoading").style.display = "none";

    if (usersData.length === 0) {
      document.getElementById("usersEmpty").style.display = "block";
      document.getElementById("usersContent").style.display = "none";
    } else {
      document.getElementById("usersEmpty").style.display = "none";
      document.getElementById("usersContent").style.display = "block";
      renderUsers();
    }
  } catch (error) {
    console.error("Error loading users:", error);
    showToast({
      title: "Error",
      message: "Failed to load users",
      type: "error",
    });
  }
}

function renderUsers() {
  const tbody = document.getElementById("usersTableBody");
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
  form.reset();

  if (userId) {
    document.getElementById("userModalTitle").textContent = "Edit User";
    const user = usersData.find((u) => u._id === userId);
    if (user) {
      document.getElementById("userId").value = user._id;
      document.getElementById("userUsername").value = user.username;
      document.getElementById("userRole").value = user.role;
      document.getElementById("userPassword").required = false;
    }
  } else {
    document.getElementById("userModalTitle").textContent = "Add User";
    document.getElementById("userPassword").required = true;
  }
  modal.classList.add("active");
}

function closeUserModal() {
  document.getElementById("userModal").classList.remove("active");
  currentUserId = null;
}

document.getElementById("userForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const userData = {
    username: document.getElementById("userUsername").value,
    role: document.getElementById("userRole").value,
  };

  const password = document.getElementById("userPassword").value;
  if (password) userData.password = password;

  try {
    const url = currentUserId ? `/api/users/${currentUserId}` : "/api/users";
    const method = currentUserId ? "PUT" : "POST";
    const response = await fetch(url, {
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
    showToast({ title: "Error", message: "Error saving user", type: "error" });
  }
});

function editUser(id) {
  openUserModal(id);
}

async function deletePackage(id, name) {
  showConfirm({
    title: "Delete Package",
    message: `Delete "${name}"? This action cannot be undone.`,
    type: "danger",
    confirmText: "Delete",
    confirmClass: "btn-danger",
    onConfirm: async () => {
      try {
        const response = await fetch(`/api/packages/${id}`, {
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
        const response = await fetch(`/api/bookings/${id}`, {
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
        const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
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
        const response = await fetch(`/admin/api/portfolio/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
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

// ========== CONFIRMATION DIALOG ==========
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

  const icons = {
    danger: "🗑️",
    warning: "⚠️",
    info: "ℹ️",
    success: "✓",
  };

  confirmCallback = null; // Reset previous callback

  icon.textContent = icons[type] || icons.warning;
  icon.className = `confirm-icon ${type}`;
  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  confirmBtn.className = `btn ${confirmClass}`;

  confirmCallback = typeof onConfirm === "function" ? onConfirm : null;

  dialog.classList.add("active");
}

function closeConfirmDialog() {
  document.getElementById("confirmDialog").classList.remove("active");
  confirmCallback = null;
}

function confirmAction() {
  if (confirmCallback) confirmCallback();
  closeConfirmDialog();
}

document
  .getElementById("confirmDialog")
  .addEventListener("click", function (e) {
    if (e.target === this) closeConfirmDialog();
  });

// ========== TOAST NOTIFICATIONS ==========
function showToast(options) {
  const {
    title = "Notification",
    message = "",
    type = "info",
    duration = 4000,
  } = options;

  const container = document.getElementById("toastContainer");
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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadPackages();
});
