// public/js/script.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Global Navigation Active State Logic ---
  const navLinks = document.querySelectorAll(".nav-links a");
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    // Check if the link's href matches the current file name
    if (link.getAttribute("href") === currentPath) {
      // Apply a class or inline style for the active state
      link.style.color = "var(--accent-color)";
      link.style.fontWeight = "700";
      // Trigger the underline effect for the active link
      link.classList.add("active-nav-link");
    }
  });

  // Add event listener to dynamically handle the active-nav-link styling
  const styleSheet = document.styleSheets[0];
  const activeLinkRule = `.nav-links a.active-nav-link::after { width: 100% !important; left: 0 !important; background: var(--accent-color) !important; }`;
  styleSheet.insertRule(activeLinkRule, styleSheet.cssRules.length);
  // --- End Global Logic ---

  // --- Portfolio Filtering Logic (for portfolio.html) ---
  const portfolioPage = document.getElementById("portfolio-page");
  if (portfolioPage) {
    const filterBtns = document.querySelectorAll(".filter-btn");
    const galleryItems = document.querySelectorAll(".gallery-item");

    const filterGallery = (category) => {
      galleryItems.forEach((item) => {
        const itemCategory = item.getAttribute("data-category");
        // Check for 'all' or if the category matches
        if (category === "all" || itemCategory === category) {
          item.style.display = "block"; // Show the item
          item.style.animation = "fadeIn 0.5s ease-out"; // Optional: fade in
        } else {
          item.style.display = "none"; // Hide the item
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

    // Initialize to show all items
    filterGallery("all");
  }

  // Hero background slider (crossfade + Ken Burns)
  (function initHeroSlider() {
    const hero = document.getElementById("hero");
    if (!hero) return;

    // read data-images attribute or fallback to single image
    const imagesAttr = hero.getAttribute("data-images") || "";
    const images = imagesAttr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Fallback: if no images found, try to read inline background or keep hero as-is
    if (!images.length) {
      // nothing to do
      return;
    }

    const slider = document.getElementById("hero-slider");
    if (!slider) return;

    // create slide elements
    images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      slide.style.backgroundImage = `url("${src}")`;
      // initial active set on first slide
      if (i === 0) {
        slide.classList.add("active", "kenburns");
      }
      slider.appendChild(slide);
    });

    const slides = Array.from(slider.querySelectorAll(".slide"));
    let current = 0;
    const interval = 7000; // ms between changes
    const fadeDuration = 1200;

    const goTo = (index) => {
      if (index === current) return;
      const prev = slides[current];
      const next = slides[index];

      // ensure kenburns restarts for next
      prev.classList.remove("kenburns");
      next.classList.add("kenburns");

      // fade
      prev.classList.remove("active");
      setTimeout(() => {
        // after fade-out complete, send previous to back (no action needed because opacity handling)
      }, fadeDuration);

      next.classList.add("active");

      current = index;
    };

    // cycle
    let timer = setInterval(() => {
      const nextIndex = (current + 1) % slides.length;
      goTo(nextIndex);
    }, interval);

    // Pause on hover for better UX on touch/desktop
    const heroEl = hero;
    heroEl.addEventListener("mouseenter", () => clearInterval(timer));
    heroEl.addEventListener("mouseleave", () => {
      clearInterval(timer);
      timer = setInterval(() => {
        const nextIndex = (current + 1) % slides.length;
        goTo(nextIndex);
      }, interval);
    });

    // Optional: expose controls for future (not visible now)
    // hero.dataset.sliderInitialized = 'true';
  })();
});

// --- Load Featured Gallery Items Dynamically ---
async function loadFeaturedGallery() {
  try {
    const response = await fetch("/api/portfolio/featured");
    const items = await response.json();

    const gallery = document.querySelector("#preview .gallery");
    gallery.innerHTML = ""; // remove static images

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "gallery-item";
      div.dataset.category = item.category;

      div.innerHTML = `
        <img src="${item.imageUrl}" alt="${item.altText}" />
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
  }
}

document.addEventListener("DOMContentLoaded", loadFeaturedGallery);

// Set current year in footer
document.addEventListener("DOMContentLoaded", function () {
  const currentYearSpan = document.getElementById("currentYear");
  const currentYear = new Date().getFullYear();
  if (currentYearSpan) {
    // Check if the element exists before trying to update it
    currentYearSpan.textContent = currentYear;
  }
});

// --- Mobile Navigation Toggle ---
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-links"); // directly target the nav-links
const navLinks = document.querySelectorAll(".nav-links a");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    navToggle.classList.toggle("open");
    navMenu.classList.toggle("open");
  });

  // Close menu when a link is clicked
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.classList.remove("open");
      navMenu.classList.remove("open");
    });
  });
}
