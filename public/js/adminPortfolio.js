// --- Admin Portfolio Upload Script ---
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("portfolioUploadForm");
  const status = document.getElementById("uploadStatus");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      status.textContent = "Uploading...";
      status.style.color = "#333";

      const formData = new FormData(form);
      const token = localStorage.getItem("token");

      if (!token) {
        status.textContent = "Authentication required. Please login.";
        status.style.color = "red";
        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/admin/api/portfolio/upload`, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.msg || data.message || "Upload failed");
        }

        status.textContent = "Upload successful ✅";
        status.style.color = "green";
        form.reset();

        // Optionally reload the gallery or redirect
        setTimeout(() => {
          status.textContent = "";
        }, 3000);
      } catch (err) {
        console.error("Upload error:", err);
        status.textContent = err.message || "Upload failed ❌";
        status.style.color = "red";
      }
    });
  }
});
