// Portfolio Page Script - Updated for separate hosting with proper initialization

// --- API Configuration ---
const PORTFOLIO_CONFIG = {
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
  ? PORTFOLIO_CONFIG.development.apiUrl
  : PORTFOLIO_CONFIG.production.apiUrl;

console.log("🖼️ Portfolio API URL:", API_BASE_URL);
console.log("🌍 Current hostname:", window.location.hostname);
console.log("🔧 Development mode:", isDevelopment);

// Store filter state
let currentFilter = "all";

// Load and display portfolio items
async function loadPortfolioGallery() {
  const gallery = document.getElementById("gallery");

  if (!gallery) {
    console.error("❌ Gallery element not found");
    return;
  }

  // Show loading state
  gallery.innerHTML =
    '<p style="text-align: center; padding: 2rem; font-size: 1.2rem;">Loading portfolio...</p>';

  const portfolioEndpoint = `${API_BASE_URL}/api/portfolio`;
  console.log("📡 Fetching from:", portfolioEndpoint);

  try {
    const response = await fetch(portfolioEndpoint);

    console.log("📊 Response status:", response.status);
    console.log("📊 Response ok:", response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const items = await response.json();
    console.log("📦 Portfolio items received:", items.length);

    if (items.length > 0) {
      console.log("📦 Sample item:", items[0]);
    }

    if (!items.length) {
      gallery.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <p style="font-size: 1.2rem; margin-bottom: 1rem;">No portfolio items found.</p>
          <p style="font-size: 0.9rem;">Upload some images from the admin panel to get started!</p>
        </div>
      `;
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
          onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2216%22 fill=%22%23999%22%3EImage not found%3C/text%3E%3C/svg%3E'; console.error('❌ Failed to load:', '${imageUrl}');"
          onload="console.log('✅ Image loaded:', '${imageUrl.substring(
            0,
            50
          )}...');"
        />
        <div class="gallery-item-overlay">
          <p>${item.title}</p>
        </div>
      `;

      gallery.appendChild(galleryItem);
    });

    console.log("✅ Portfolio rendering complete!");

    // Initialize filters after items are loaded
    initializeFilters();
  } catch (err) {
    console.error("❌ Error loading portfolio:", err);
    console.error("❌ Error details:", {
      message: err.message,
      stack: err.stack,
    });

    gallery.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color: #e74c3c; margin-bottom: 1rem; font-size: 1.2rem;">
          ⚠️ Failed to load portfolio
        </p>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
          Error: ${err.message}
        </p>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
          Endpoint: ${portfolioEndpoint}
        </p>
        <button 
          onclick="location.reload()" 
          style="padding: 0.75rem 1.5rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 600;"
          onmouseover="this.style.background='#2980b9'"
          onmouseout="this.style.background='#3498db'"
        >
          🔄 Retry
        </button>
      </div>
    `;
  }
}

// Initialize filter functionality
function initializeFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const galleryItems = document.querySelectorAll(".gallery-item");

  console.log("🎯 Initializing filters...");
  console.log("🎯 Filter buttons found:", filterBtns.length);
  console.log("🎯 Gallery items found:", galleryItems.length);

  if (!filterBtns.length) {
    console.warn("⚠️ No filter buttons found");
    return;
  }

  if (!galleryItems.length) {
    console.warn("⚠️ No gallery items found to filter");
    return;
  }

  const filterGallery = (category) => {
    console.log(`🔍 Filtering by category: ${category}`);
    let visibleCount = 0;
    let hiddenCount = 0;

    galleryItems.forEach((item) => {
      const itemCategory = item.getAttribute("data-category");

      if (category === "all" || itemCategory === category) {
        item.style.display = "block";
        item.style.animation = "fadeIn 0.5s ease-out";
        visibleCount++;
      } else {
        item.style.display = "none";
        hiddenCount++;
      }
    });

    console.log(`✓ Showing ${visibleCount} items, hiding ${hiddenCount} items`);

    // Update the filter counts in the UI (optional)
    updateFilterCounts(category, visibleCount);
  };

  const updateFilterCounts = (activeCategory, count) => {
    // Optional: Show count in the active filter button
    filterBtns.forEach((btn) => {
      const btnCategory = btn.getAttribute("data-filter");
      if (btnCategory === activeCategory) {
        const originalText = btn.textContent.split(" (")[0];
        btn.textContent = `${originalText} (${count})`;
      }
    });
  };

  // Add click handlers to filter buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Update active button state
      filterBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      // Get category and filter
      const category = e.target.getAttribute("data-filter");
      currentFilter = category;
      filterGallery(category);
    });
  });

  // Show all items by default
  filterGallery(currentFilter);
  console.log("✅ Filters initialized!");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPortfolioGallery);
} else {
  // DOM already loaded
  loadPortfolioGallery();
}
