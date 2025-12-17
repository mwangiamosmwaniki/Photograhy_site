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
      const shouldStay = confirm(
        "You've been inactive for 30 minutes. You'll be logged out in 30 seconds. Click OK to stay logged in."
      );
      if (shouldStay) {
        resetInactivityTimer();
      } else {
        setTimeout(() => logout(), 30000);
      }
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
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById(tabName).classList.add("active");

  if (tabName === "bookings") loadBookings();
  else if (tabName === "users") loadUsers();
}

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
    alert("Failed to load packages");
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
      alert(currentPackageId ? "Package updated!" : "Package created!");
    } else {
      alert("Failed to save package");
    }
  } catch (error) {
    console.error("Error saving package:", error);
    alert("Error saving package");
  }
});

function editPackage(id) {
  openPackageModal(id);
}

async function deletePackage(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    const response = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (response.ok) {
      loadPackages();
      alert("Package deleted!");
    } else {
      alert("Failed to delete package");
    }
  } catch (error) {
    console.error("Error deleting package:", error);
    alert("Error deleting package");
  }
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
    alert("Failed to load bookings");
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

async function deleteBooking(id, name) {
  if (!confirm(`Delete booking for "${name}"?`)) return;
  try {
    const response = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (response.ok) {
      loadBookings();
      alert("Booking deleted!");
    } else {
      alert("Failed to delete booking");
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    alert("Error deleting booking");
  }
}

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
    alert("Failed to load users");
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
      alert(currentUserId ? "User updated!" : "User created!");
    } else {
      const data = await response.json();
      alert(data.msg || "Failed to save user");
    }
  } catch (error) {
    console.error("Error saving user:", error);
    alert("Error saving user");
  }
});

function editUser(id) {
  openUserModal(id);
}

async function deleteUser(id, username) {
  if (!confirm(`Delete user "${username}"?`)) return;
  try {
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (response.ok) {
      loadUsers();
      alert("User deleted!");
    } else {
      const data = await response.json();
      alert(data.msg || "Failed to delete user");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Error deleting user");
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadPackages();
});
