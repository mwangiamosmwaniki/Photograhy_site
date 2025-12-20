// Portfolio Page Script - Updated for separate hosting

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

console.log("🖼️ Portfolio API URL:", API_BASE_URL);

// Load and display portfolio items
document.addEventListener("DOMContentLoaded", async () => {
  const gallery = document.getElementById("gallery");

  if (!gallery) {
    console.error("Gallery element not found");
    return;
  }

  // Show loading state
  gallery.innerHTML =
    '<p style="text-align: center; padding: 2rem;">Loading portfolio...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolio`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const items = await response.json();

    if (!items.length) {
      gallery.innerHTML =
        '<p style="text-align: center; padding: 2rem; color: #666;">No portfolio items found.</p>';
      return;
    }

    // Clear loading message
    gallery.innerHTML = "";

    // Render portfolio items
    items.forEach((item) => {
      const galleryItem = document.createElement("div");
      galleryItem.className = "gallery-item";
      galleryItem.setAttribute("data-category", item.category);

      // Handle image URL - prepend API_BASE_URL if needed
      const imageUrl = item.imageUrl.startsWith("http")
        ? item.imageUrl
        : `${API_BASE_URL}${item.imageUrl}`;

      galleryItem.innerHTML = `
        <img
          src="${imageUrl}"
          alt="${item.altText || item.title}"
          loading="lazy"
        />
        <div class="gallery-item-overlay">
          <p>${item.title}</p>
        </div>
      `;

      gallery.appendChild(galleryItem);
    });

    // After loading, initialize filter functionality if it exists
    initializeFilters();
  } catch (err) {
    console.error("Error loading portfolio:", err);
    gallery.innerHTML = `
      <p style="text-align: center; padding: 2rem; color: #e74c3c;">
        Failed to load portfolio. Please try again later.
      </p>
    `;
  }
});

// Initialize filter functionality
function initializeFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const galleryItems = document.querySelectorAll(".gallery-item");

  if (!filterBtns.length || !galleryItems.length) return;

  const filterGallery = (category) => {
    galleryItems.forEach((item) => {
      const itemCategory = item.getAttribute("data-category");
      if (category === "all" || itemCategory === category) {
        item.style.display = "block";
        item.style.animation = "fadeIn 0.5s ease-out";
      } else {
        item.style.display = "none";
      }
    });
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Update active button state
      filterBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      // Filter the gallery
      const category = e.target.getAttribute("data-filter");
      filterGallery(category);
    });
  });

  // Show all items by default
  filterGallery("all");
}
