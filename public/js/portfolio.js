// Portfolio Page Script - Complete working version

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

console.log("🖼️ Portfolio Page Loaded");
console.log("🖼️ API URL:", API_BASE_URL);
console.log("🌍 Hostname:", window.location.hostname);
console.log("🔧 Development mode:", isDevelopment);

// Store filter state
let currentFilter = "all";
let portfolioItems = [];

// Load and display portfolio items
async function loadPortfolioGallery() {
  const gallery = document.getElementById("gallery");

  if (!gallery) {
    console.error("❌ Gallery element #gallery not found!");
    return;
  }

  console.log("✅ Gallery element found");

  // Show loading state
  gallery.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <p style="font-size: 1.2rem; color: #666;">Loading portfolio...</p>
    </div>
  `;

  const portfolioEndpoint = `${API_BASE_URL}/api/portfolio`;
  console.log("📡 Fetching from:", portfolioEndpoint);

  try {
    const response = await fetch(portfolioEndpoint);

    console.log("📊 Response status:", response.status);
    console.log("📊 Response ok:", response.ok);
    console.log("📊 Response URL:", response.url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const items = await response.json();
    portfolioItems = items;

    console.log("📦 Items received:", items.length);

    if (items.length > 0) {
      console.log("📦 First item:", JSON.stringify(items[0], null, 2));
    }

    if (!items.length) {
      gallery.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <p style="font-size: 1.2rem; margin-bottom: 1rem; color: #666;">
            📸 No portfolio items found
          </p>
          <p style="font-size: 0.9rem; color: #999;">
            Upload some images from the admin panel to get started!
          </p>
        </div>
      `;
      return;
    }

    // Clear loading message
    gallery.innerHTML = "";

    // Render portfolio items
    items.forEach((item, index) => {
      const galleryItem = document.createElement("div");
      galleryItem.className = "gallery-item";
      galleryItem.setAttribute("data-category", item.category);

      // Construct image URL
      let imageUrl;
      if (
        item.imageUrl.startsWith("http://") ||
        item.imageUrl.startsWith("https://")
      ) {
        imageUrl = item.imageUrl;
      } else {
        // Ensure clean path
        const cleanPath = item.imageUrl.startsWith("/")
          ? item.imageUrl
          : `/${item.imageUrl}`;
        imageUrl = `${API_BASE_URL}${cleanPath}`;
      }

      console.log(`🖼️  Item ${index + 1}: ${item.title}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Image URL: ${imageUrl}`);

      // Create fallback image SVG
      const fallbackSVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23999'%3EImage not available%3C/text%3E%3C/svg%3E`;

      galleryItem.innerHTML = `
        <img
          src="${imageUrl}"
          alt="${item.altText || item.title}"
          loading="lazy"
          onerror="this.onerror=null; this.src='${fallbackSVG}'; console.error('❌ Image load failed:', '${imageUrl}');"
          onload="console.log('✅ Loaded:', '${item.title}');"
        />
        <div class="gallery-item-overlay">
          <p>${item.title}</p>
        </div>
      `;

      gallery.appendChild(galleryItem);
    });

    console.log("✅ All items rendered!");

    // Initialize filters after items are loaded
    initializeFilters();
  } catch (err) {
    console.error("❌ Error loading portfolio:");
    console.error("   Message:", err.message);
    console.error("   Stack:", err.stack);

    gallery.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <p style="color: #e74c3c; margin-bottom: 1rem; font-size: 1.2rem;">
          ⚠️ Failed to load portfolio
        </p>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
          ${err.message}
        </p>
        <p style="color: #999; font-size: 0.85rem; margin-bottom: 1.5rem;">
          Endpoint: ${portfolioEndpoint}
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 0.75rem 1.5rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: background 0.3s;
          "
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
  console.log("   Filter buttons:", filterBtns.length);
  console.log("   Gallery items:", galleryItems.length);

  if (!filterBtns.length) {
    console.warn("⚠️  No filter buttons found");
    return;
  }

  if (!galleryItems.length) {
    console.warn("⚠️  No gallery items to filter");
    return;
  }

  const filterGallery = (category) => {
    console.log(`🔍 Filtering by: ${category}`);
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

    console.log(`   ✓ Showing ${visibleCount} item(s)`);
  };

  // Add click handlers to filter buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Update active button
      filterBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      // Filter gallery
      const category = e.target.getAttribute("data-filter");
      currentFilter = category;
      filterGallery(category);
    });
  });

  // Show all items by default
  filterGallery(currentFilter);
  console.log("✅ Filters ready!");
}

// Initialize navigation toggle
function initializeNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-links"); // FIXED: Changed from .nav-menu to .nav-links
  const navLinks = document.querySelectorAll(".nav-links a");

  console.log("🧭 Initializing navigation...");
  console.log("   Nav toggle:", navToggle ? "found" : "not found");
  console.log("   Nav menu:", navMenu ? "found" : "not found");
  console.log("   Nav links:", navLinks.length);

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navToggle.classList.toggle("open");
      navMenu.classList.toggle("open");
      console.log("🍔 Menu toggled:", navMenu.classList.contains("open"));
    });

    // Close menu when clicking on a link
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.classList.remove("open");
        navMenu.classList.remove("open");
        console.log("🔗 Link clicked, menu closed");
      });
    });

    console.log("✅ Navigation toggle initialized");
  } else {
    console.warn("⚠️  Navigation elements not found");
  }

  // Set active navigation link
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.style.color = "var(--accent-color)";
      link.style.fontWeight = "700";
      link.classList.add("active-nav-link");
      console.log(`✓ Active link set: ${currentPath}`);
    }
  });

  // Add active link styling dynamically
  const style = document.createElement("style");
  style.textContent = `
    .nav-links a.active-nav-link::after {
      width: 100% !important;
      left: 0 !important;
      background: var(--accent-color) !important;
    }
  `;
  document.head.appendChild(style);
}

// Set current year in footer
function setCurrentYear() {
  const currentYearSpan = document.getElementById("currentYear");
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
    console.log("📅 Footer year updated");
  }
}

// Initialize everything when DOM is ready
console.log("📄 Document ready state:", document.readyState);

if (document.readyState === "loading") {
  console.log("⏳ Waiting for DOMContentLoaded...");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOMContentLoaded fired");
    initializeNavigation();
    setCurrentYear();
    loadPortfolioGallery();
  });
} else {
  console.log("✅ DOM already loaded, initializing immediately");
  initializeNavigation();
  setCurrentYear();
  loadPortfolioGallery();
}
