// --- Booking Page Script ---//
document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("booking-form");
  if (!bookingForm) return; // Only run on the booking page

  // --- DOM Elements ---
  const calendarEl = document.getElementById("booking-calendar");
  const monthYearEl = document.getElementById("current-month-year");
  const prevMonthBtn = document.getElementById("prev-month-btn");
  const nextMonthBtn = document.getElementById("next-month-btn");
  const timeSlotPicker = document.getElementById("time-slot-picker");
  const selectedDateInput = document.getElementById("selected_date");
  const selectedTimeInput = document.getElementById("selected_time");
  const confirmationDiv = document.getElementById("booking-confirmation");
  const submitBtn = document.getElementById("submit-booking-btn");

  // --- State Variables ---
  let currentDate = new Date();
  let bookedSlots = [];
  const availableTimes = [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
  ];

  // --- Utility Functions ---

  /**
   * @function fetchAvailability
   * Fetches all current bookings from the server.
   */
  const fetchAvailability = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/availability`);
      if (!response.ok) throw new Error("Failed to fetch availability.");
      const data = await response.json();
      bookedSlots = data;
      console.log("✅ Booked Slots Loaded:", bookedSlots.length);

      // Re-render calendar and time slots after fetching
      renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
      updateTimeSlots();
    } catch (error) {
      console.error("❌ Error fetching availability:", error);
      alert("Could not load booking availability. Please try again later.");
    }
  };

  /**
   * @function isBooked
   * Checks if a specific date and time is already booked.
   */
  const isBooked = (dateStr, timeStr) => {
    return bookedSlots.some(
      (slot) => slot.date === dateStr && slot.time === timeStr
    );
  };

  /**
   * @function formatDateYMD
   * Formats a Date object to a 'YYYY-MM-DD' string.
   */
  const formatDateYMD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --- Calendar & Time Slot Rendering ---

  /**
   * @function updateTimeSlots
   * Generates and displays the time slots for the currently selected date.
   */
  const updateTimeSlots = () => {
    if (!timeSlotPicker || !selectedDateInput || !selectedTimeInput) return;

    timeSlotPicker.innerHTML = "";
    const selectedDateStr = selectedDateInput.value;

    if (!selectedDateStr) {
      timeSlotPicker.innerHTML = "<p>Please select a date first.</p>";
      return;
    }

    selectedTimeInput.value = "";

    availableTimes.forEach((time) => {
      const isSlotBooked = isBooked(selectedDateStr, time);

      const slotEl = document.createElement("div");
      slotEl.classList.add("time-slot");
      slotEl.textContent = time;

      if (isSlotBooked) {
        slotEl.classList.add("booked");
        slotEl.title = "Booked";
      } else {
        slotEl.addEventListener("click", () => {
          document
            .querySelectorAll(".time-slot")
            .forEach((t) => t.classList.remove("selected"));

          slotEl.classList.add("selected");
          selectedTimeInput.value = time;

          const errorEl = document.getElementById("error-selected_time");
          if (errorEl) errorEl.style.display = "none";
        });
      }

      timeSlotPicker.appendChild(slotEl);
    });
  };

  /**
   * @function renderCalendar
   * Generates and displays the calendar grid for a given month/year.
   */
  const renderCalendar = (year, month) => {
    if (!calendarEl) return;

    calendarEl
      .querySelectorAll(".day:not(.weekday)")
      .forEach((day) => day.remove());

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();
    const startDayIndex = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (monthYearEl) {
      monthYearEl.textContent = firstDay.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }

    // Add empty cells for padding
    for (let i = 0; i < startDayIndex; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.classList.add("day", "disabled");
      calendarEl.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= numDays; day++) {
      const dayEl = document.createElement("div");
      dayEl.classList.add("day", "current-month");
      dayEl.textContent = day;

      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = formatDateYMD(date);

      // Disable past dates
      if (date < today) {
        dayEl.classList.add("disabled");
      } else {
        // Check if all slots are booked
        const isFullyBooked = availableTimes.every((time) =>
          isBooked(dateStr, time)
        );

        if (isFullyBooked) {
          dayEl.classList.add("disabled");
          dayEl.title = "Fully Booked";
        }

        if (!dayEl.classList.contains("disabled")) {
          dayEl.addEventListener("click", () => {
            document
              .querySelectorAll(".day")
              .forEach((d) => d.classList.remove("selected"));

            dayEl.classList.add("selected");
            selectedDateInput.value = dateStr;

            const errorEl = document.getElementById("error-selected_date");
            if (errorEl) errorEl.style.display = "none";

            updateTimeSlots();
          });

          if (selectedDateInput.value === dateStr) {
            dayEl.classList.add("selected");
          }
        }
      }

      calendarEl.appendChild(dayEl);
    }
  };

  // --- Event Listeners for Calendar Navigation ---
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      const checkDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      const todayMonth = new Date();
      if (
        checkDate.getFullYear() < todayMonth.getFullYear() ||
        (checkDate.getFullYear() === todayMonth.getFullYear() &&
          checkDate.getMonth() < todayMonth.getMonth())
      ) {
        return;
      }
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
  }

  // --- Client-Side Validation ---

  const validateField = (inputEl, pattern = null) => {
    if (!inputEl) return false;

    const errorEl = document.getElementById(`error-${inputEl.id}`);
    const value = inputEl.value.trim();
    let isValid = true;
    let errorMessage = "";

    if (inputEl.hasAttribute("required") && value === "") {
      isValid = false;
      errorMessage = "This field is required.";
    } else if (
      inputEl.type === "email" &&
      value !== "" &&
      !/\S+@\S+\.\S+/.test(value)
    ) {
      isValid = false;
      errorMessage = "Please enter a valid email address.";
    } else if (
      inputEl.id === "phone" &&
      value !== "" &&
      !/^[\d\s\-\(\)+]+$/.test(value)
    ) {
      isValid = false;
      errorMessage = "Please enter a valid phone number.";
    } else if (pattern && value !== "" && !pattern.test(value)) {
      isValid = false;
    }

    if (errorEl) {
      if (isValid) {
        errorEl.style.display = "none";
      } else {
        errorEl.textContent =
          errorMessage ||
          `Please enter a valid ${inputEl.id.replace("_", " ")}.`;
        errorEl.style.display = "block";
      }
    }

    return isValid;
  };

  const clientSideValidation = () => {
    let isFormValid = true;

    const fields = [
      "session_type",
      "name",
      "email",
      "phone",
      "selected_date",
      "selected_time",
    ];

    fields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        isFormValid = validateField(field) && isFormValid;
      }
    });

    return isFormValid;
  };

  /**
   * @function showConfirmation
   * Displays the confirmation message and hides the form.
   */
  const showConfirmation = (data) => {
    if (!confirmationDiv) return;

    bookingForm.style.display = "none";

    const confEmail = document.getElementById("conf-email");
    const confPackage = document.getElementById("conf-package");
    const confDate = document.getElementById("conf-date");
    const confTime = document.getElementById("conf-time");
    const confPhone = document.getElementById("conf-phone");

    if (confEmail) confEmail.textContent = data.email;
    if (confPackage) confPackage.textContent = data.session_type;
    if (confDate)
      confDate.textContent = new Date(data.date).toLocaleDateString();
    if (confTime) confTime.textContent = data.time;
    if (confPhone) confPhone.textContent = data.phone;

    confirmationDiv.style.display = "block";

    // Scroll to confirmation
    confirmationDiv.scrollIntoView({ behavior: "smooth" });
  };

  // --- Form Submission Handler ---
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Client-Side Validation
    if (!clientSideValidation()) {
      alert("Please fill out all required fields and correct any errors.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    // Prepare Data
    const formData = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      session_type: document.getElementById("session_type").value,
      date: selectedDateInput.value,
      time: selectedTimeInput.value,
      notes: document.getElementById("notes")?.value.trim() || "",
    };

    console.log("📤 Submitting booking:", formData);

    // API Submission
    try {
      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Booking successful:", data);

        // Show confirmation
        showConfirmation(formData);

        // Open WhatsApp link if available
        if (data.whatsappLink) {
          setTimeout(() => {
            window.open(data.whatsappLink, "_blank");
          }, 1000);
        }

        // Re-fetch availability
        fetchAvailability();
      } else {
        alert(`Booking failed: ${data.msg || "Unknown error."}`);
      }
    } catch (error) {
      console.error("❌ Submission Error:", error);
      alert("A network error occurred. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
    }
  });

  // --- Initialization ---
  console.log("📅 Initializing booking calendar...");
  fetchAvailability();
});
