// public/js/script.js - Updated for separate frontend/backend hosting

// --- Configuration for API Base URL ---
const config = {
  development: {
    apiUrl: "http://localhost:3000",
  },
  production: {
    apiUrl: "https://photography-site-8pct.onrender.com",
  },
};

// Automatically detect environment
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE_URL = isDevelopment
  ? config.development.apiUrl
  : config.production.apiUrl;

console.log("🌐 API Base URL:", API_BASE_URL);
console.log("🏠 Environment:", isDevelopment ? "Development" : "Production");

// --- Global Navigation Active State Logic ---
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-links a");
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.style.color = "var(--accent-color)";
      link.style.fontWeight = "700";
      link.classList.add("active-nav-link");
    }
  });

  // Add active link styling
  const styleSheet = document.styleSheets[0];
  const activeLinkRule = `.nav-links a.active-nav-link::after { width: 100% !important; left: 0 !important; background: var(--accent-color) !important; }`;
  styleSheet.insertRule(activeLinkRule, styleSheet.cssRules.length);

  // --- Portfolio Filtering Logic (ONLY for non-portfolio pages with static content) ---
  const portfolioPage = document.getElementById("portfolio-page");

  // IMPORTANT: Skip filter initialization on portfolio page - let portfolio.js handle it
  if (!portfolioPage) {
    // This is for OTHER pages that might have static portfolio previews
    const filterBtns = document.querySelectorAll(".filter-btn");
    const galleryItems = document.querySelectorAll(".gallery-item");

    if (filterBtns.length && galleryItems.length) {
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
          filterBtns.forEach((b) => b.classList.remove("active"));
          e.target.classList.add("active");
          const category = e.target.getAttribute("data-filter");
          filterGallery(category);
        });
      });

      filterGallery("all");
    }
  } else {
    console.log(
      "📸 Portfolio page detected - skipping script.js filter initialization"
    );
  }

  // --- Hero Background Slider ---
  initHeroSlider();
});

// Hero Slider Function
function initHeroSlider() {
  const hero = document.getElementById("hero");
  if (!hero) return;

  const imagesAttr = hero.getAttribute("data-images") || "";
  const images = imagesAttr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!images.length) return;

  const slider = document.getElementById("hero-slider");
  if (!slider) return;

  images.forEach((src, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.style.backgroundImage = `url("${src}")`;
    if (i === 0) {
      slide.classList.add("active", "kenburns");
    }
    slider.appendChild(slide);
  });

  const slides = Array.from(slider.querySelectorAll(".slide"));
  let current = 0;
  const interval = 7000;
  const fadeDuration = 1200;

  const goTo = (index) => {
    if (index === current) return;
    const prev = slides[current];
    const next = slides[index];

    prev.classList.remove("kenburns");
    next.classList.add("kenburns");
    prev.classList.remove("active");

    setTimeout(() => {}, fadeDuration);

    next.classList.add("active");
    current = index;
  };

  let timer = setInterval(() => {
    const nextIndex = (current + 1) % slides.length;
    goTo(nextIndex);
  }, interval);

  hero.addEventListener("mouseenter", () => clearInterval(timer));
  hero.addEventListener("mouseleave", () => {
    clearInterval(timer);
    timer = setInterval(() => {
      const nextIndex = (current + 1) % slides.length;
      goTo(nextIndex);
    }, interval);
  });
}

// --- Load Featured Gallery Items Dynamically ---
async function loadFeaturedGallery() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolio/featured`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const items = await response.json();

    const gallery = document.querySelector("#preview .gallery");
    if (!gallery) return;

    gallery.innerHTML = "";

    if (items.length === 0) {
      gallery.innerHTML =
        '<p style="text-align: center; color: #666;">No featured items available.</p>';
      return;
    }

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "gallery-item";
      div.dataset.category = item.category;

      // Use full API URL for images if they're served from backend
      const imageUrl = item.imageUrl.startsWith("http")
        ? item.imageUrl
        : `${API_BASE_URL}${item.imageUrl}`;

      div.innerHTML = `
        <img src="${imageUrl}" alt="${
        item.altText || "Portfolio image"
      }" loading="lazy" />
        <div class="gallery-item-overlay">
          <p>${
            item.category.charAt(0).toUpperCase() + item.category.slice(1)
          }</p>
        </div>
      `;

      gallery.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading featured gallery:", err);
    const gallery = document.querySelector("#preview .gallery");
    if (gallery) {
      gallery.innerHTML =
        '<p style="text-align: center; color: #666;">Unable to load gallery items.</p>';
    }
  }
}

document.addEventListener("DOMContentLoaded", loadFeaturedGallery);

// --- Set Current Year in Footer ---
document.addEventListener("DOMContentLoaded", function () {
  const currentYearSpan = document.getElementById("currentYear");
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }
});

// --- Mobile Navigation Toggle ---
document.addEventListener("DOMContentLoaded", function () {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-links");
  const navLinks = document.querySelectorAll(".nav-links a");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navToggle.classList.toggle("open");
      navMenu.classList.toggle("open");
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.classList.remove("open");
        navMenu.classList.remove("open");
      });
    });
  }
});

// Close menu when clicking outside
document.addEventListener("click", (e) => {
  const header = document.querySelector("header");
  const navMenu = document.querySelector(".nav-links");
  const isClickInsideNav = header.contains(e.target);
  const isMenuOpen = navMenu.classList.contains("open");

  if (!isClickInsideNav && isMenuOpen) {
    document.querySelector(".nav-toggle").classList.remove("open");
    navMenu.classList.remove("open");
    console.log("🖱️ Clicked outside, menu closed");
  }
});

// Close menu when pressing Escape key
document.addEventListener("keydown", (e) => {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-links");

  if (e.key === "Escape" && navMenu.classList.contains("open")) {
    navToggle.classList.remove("open");
    navMenu.classList.remove("open");
    console.log("⌨️ Escape pressed, menu closed");
  }
});
