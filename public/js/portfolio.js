document.addEventListener("DOMContentLoaded", async () => {
  const gallery = document.getElementById("gallery");

  try {
    const res = await fetch("/api/portfolio");
    const items = await res.json();

    if (!items.length) {
      gallery.innerHTML = "<p>No portfolio items found.</p>";
      return;
    }

    gallery.innerHTML = items
      .map(
        (item) => `
          <div class="gallery-item" data-category="${item.category}">
            <img
              src="${item.imageUrl}"
              alt="${item.altText}"
              loading="lazy"
            />
            <div class="gallery-item-overlay">
              <p>${item.title}</p>
            </div>
          </div>
        `
      )
      .join("");
  } catch (err) {
    console.error(err);
    gallery.innerHTML = "<p>Failed to load portfolio.</p>";
  }
});
