const form = document.getElementById("portfolioUploadForm");
const status = document.getElementById("uploadStatus");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    status.textContent = "Uploading...";

    const formData = new FormData(form);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      status.textContent = "Upload successful ✅";
      status.style.color = "green";
      form.reset();
    } catch (err) {
      status.textContent = err.message || "Upload failed ❌";
      status.style.color = "red";
    }
  });
}
