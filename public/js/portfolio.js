// Portfolio Page Script - Updated for separate hosting with debugging

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
console.log("🌍 Current hostname:", window.location.hostname);
console.log("🔧 Development mode:", isDevelopment);

// Load and display portfolio items
document.addEventListener("DOMContentLoaded", async () => {
  const gallery = document.getElementById("gallery");

  if (!gallery) {
    console.error("❌ Gallery element not found");
    return;
  }

  // Show loading state
  gallery.innerHTML =
    '<p style="text-align: center; padding: 2rem;">Loading portfolio...</p>';

  const portfolioEndpoint = `${API_BASE_URL}/api/portfolio`;
  console.log("📡 Fetching from:", portfolioEndpoint);

  try {
    const response = await fetch(portfolioEndpoint);

    console.log("📊 Response status:", response.status);
    console.log("📊 Response ok:", response.ok);
    console.log("📊 Response headers:", [...response.headers.entries()]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const items = await response.json();
    console.log("📦 Portfolio items received:", items.length);
    console.log("📦 First item (if exists):", items[0]);

    if (!items.length) {
      gallery.innerHTML =
        '<p style="text-align: center; padding: 2rem; color: #666;">No portfolio items found. Upload some images from the admin panel!</p>';
      return;
    }

    // Clear loading message
    gallery.innerHTML = "";

    // Render portfolio items
    items.forEach((item, index) => {
      console.log(`🖼️ Processing item ${index + 1}:`, {
        title: item.title,
        category: item.category,
        imageUrl: item.imageUrl,
      });

      const galleryItem = document.createElement("div");
      galleryItem.className = "gallery-item";
      galleryItem.setAttribute("data-category", item.category);

      // Handle image URL - prepend API_BASE_URL if needed
      let imageUrl;
      if (item.imageUrl.startsWith("http")) {
        imageUrl = item.imageUrl;
        console.log(`  ✓ Using absolute URL: ${imageUrl}`);
      } else {
        // Remove leading slash if present to avoid double slashes
        const cleanPath = item.imageUrl.startsWith("/")
          ? item.imageUrl
          : `/${item.imageUrl}`;
        imageUrl = `${API_BASE_URL}${cleanPath}`;
        console.log(`  ✓ Constructed URL: ${imageUrl}`);
      }

      galleryItem.innerHTML = `
        <img
          src="${imageUrl}"
          alt="${item.altText || item.title}"
          loading="lazy"
          onerror="console.error('❌ Failed to load image:', '${imageUrl}'); this.style.border='2px solid red';"
          onload="console.log('✅ Image loaded:', '${imageUrl}');"
        />
        <div class="gallery-item-overlay">
          <p>${item.title}</p>
        </div>
      `;

      gallery.appendChild(galleryItem);
    });

    console.log("✅ Portfolio rendering complete!");

    // After loading, initialize filter functionality if it exists
    initializeFilters();
  } catch (err) {
    console.error("❌ Error loading portfolio:", err);
    console.error("❌ Error details:", {
      message: err.message,
      stack: err.stack,
    });

    gallery.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: #e74c3c; margin-bottom: 1rem;">
          Failed to load portfolio. Please try again later.
        </p>
        <p style="color: #666; font-size: 0.9rem;">
          Error: ${err.message}
        </p>
        <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
          Endpoint: ${portfolioEndpoint}
        </p>
        <button 
          onclick="location.reload()" 
          style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;"
        >
          Retry
        </button>
      </div>
    `;
  }
});

// Initialize filter functionality
function initializeFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const galleryItems = document.querySelectorAll(".gallery-item");

  console.log("🎯 Initializing filters...");
  console.log("🎯 Filter buttons found:", filterBtns.length);
  console.log("🎯 Gallery items found:", galleryItems.length);

  if (!filterBtns.length || !galleryItems.length) {
    console.warn("⚠️ No filter buttons or gallery items found");
    return;
  }

  const filterGallery = (category) => {
    console.log(`🔍 Filtering by category: ${category}`);
    let visibleCount = 0;

    galleryItems.forEach((item) => {
      const itemCategory = item.getAttribute("data-category");
      if (category === "all" || itemCategory === category) {
        item.style.display = "block";
        item.style.animation = "fadeIn 0.5s ease-out";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    console.log(`✓ Showing ${visibleCount} items`);
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
  console.log("✅ Filters initialized!");
}
