// public/js/booking.js

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
  const API_BASE_URL = window.location.origin; // Assumes backend runs on same host/port

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
      console.log("Booked Slots:", bookedSlots);
      // Re-render calendar and time slots after fetching
      renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
      updateTimeSlots();
    } catch (error) {
      console.error("Error fetching availability:", error);
      alert("Could not load booking availability. Please try again later.");
    }
  };

  /**
   * @function isBooked
   * Checks if a specific date and time is already booked.
   * @param {string} dateStr - 'YYYY-MM-DD' format
   * @param {string} timeStr - 'HH:MM' format
   * @returns {boolean} True if the slot is booked.
   */
  const isBooked = (dateStr, timeStr) => {
    return bookedSlots.some(
      (slot) => slot.date === dateStr && slot.time === timeStr
    );
  };

  /**
   * @function formatDateYMD
   * Formats a Date object to a 'YYYY-MM-DD' string.
   * @param {Date} date
   * @returns {string}
   */
  const formatDateYMD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // --- Calendar & Time Slot Rendering ---

  /**
   * @function renderTimeSlots
   * Generates and displays the time slots for the currently selected date.
   */
  const updateTimeSlots = () => {
    // Defensive checks: ensure the DOM elements exist
    if (!timeSlotPicker || !selectedDateInput || !selectedTimeInput) return;

    timeSlotPicker.innerHTML = "";
    const selectedDateStr = selectedDateInput.value;

    if (!selectedDateStr) {
      timeSlotPicker.innerHTML = "<p>Please select a date first.</p>";
      return;
    }

    // Clear previously selected time
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
          // Remove 'selected' from all other slots
          document
            .querySelectorAll(".time-slot")
            .forEach((t) => t.classList.remove("selected"));

          // Select the clicked slot
          slotEl.classList.add("selected");
          selectedTimeInput.value = time;

          const errorEl = document.getElementById("error-time");
          if (errorEl) errorEl.style.display = "none"; // Clear error
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
    calendarEl
      .querySelectorAll(".day:not(.weekday)")
      .forEach((day) => day.remove()); // Clear previous days

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const numDays = lastDay.getDate();
    const startDayIndex = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    monthYearEl.textContent = firstDay.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Add empty cells for padding before the first day
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
        // Check if any time slots are booked on this date (visual indicator)
        const isFullyBooked = availableTimes.every((time) =>
          isBooked(dateStr, time)
        );
        if (isFullyBooked) {
          dayEl.classList.add("disabled");
          dayEl.title = "Fully Booked";
        }

        // If not disabled, make it clickable
        if (!dayEl.classList.contains("disabled")) {
          dayEl.addEventListener("click", () => {
            // Remove selection from all days
            document
              .querySelectorAll(".day")
              .forEach((d) => d.classList.remove("selected"));

            // Select the clicked day
            dayEl.classList.add("selected");

            // Update hidden input and time slots
            selectedDateInput.value = dateStr;
            document.getElementById("error-date").style.display = "none"; // Clear error
            updateTimeSlots();
          });

          // Set initial selection if input is already set (e.g., re-rendering)
          if (selectedDateInput.value === dateStr) {
            dayEl.classList.add("selected");
          }
        }
      }

      calendarEl.appendChild(dayEl);
    }
  };

  // --- Event Listeners for Calendar Navigation ---
  prevMonthBtn.addEventListener("click", () => {
    // Prevent going to past months from today
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

  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
  });

  // --- Client-Side Validation & Submission ---

  /**
   * @function validateField
   * Basic client-side validation for a single field.
   * @param {HTMLElement} inputEl
   * @param {RegExp} pattern (optional)
   * @returns {boolean} True if valid.
   */

  const clientSideValidation = () => {
    let isFormValid = true;

    // Validate visible inputs
    isFormValid &= validateField(document.getElementById("session_type"));
    isFormValid &= validateField(document.getElementById("name"));
    isFormValid &= validateField(document.getElementById("email"));
    isFormValid &= validateField(document.getElementById("phone"));

    // Validate hidden inputs (date/time)
    isFormValid &= validateField(selectedDateInput, null); // optional error element handling
    isFormValid &= validateField(selectedTimeInput, null);

    return Boolean(isFormValid);
  };

  const validateField = (inputEl, pattern = null) => {
    const errorEl = document.getElementById(`error-${inputEl.id}`);
    const value = inputEl.value.trim();
    let isValid = true;
    let errorMessage = "";

    if (inputEl.hasAttribute("required") && value === "") {
      isValid = false;
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
      !/^[\d\s\-\(\)]+$/.test(value)
    ) {
      isValid = false;
      errorMessage = "Please enter a valid phone number.";
    } else if (pattern && value !== "" && !pattern.test(value)) {
      isValid = false;
    }

    // Only update the error element if it exists
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

  /**
   * @function showConfirmation
   * Displays the confirmation message and hides the form.
   */
  const showConfirmation = (data) => {
    bookingForm.style.display = "none";

    document.getElementById("conf-email").textContent = data.email;
    document.getElementById("conf-package").textContent = data.session_type;
    document.getElementById("conf-date").textContent = new Date(
      data.date
    ).toLocaleDateString();
    document.getElementById("conf-time").textContent = data.time;

    confirmationDiv.style.display = "block";
  };

  // --- Form Submission Handler ---
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Client-Side Validation
    if (!clientSideValidation()) {
      alert("Please fill out all required fields and correct any errors.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    // 2. Prepare Data
    const formData = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      session_type: document.getElementById("session_type").value,
      date: selectedDateInput.value, // YYYY-MM-DD
      time: selectedTimeInput.value, // HH:MM
      notes: document.getElementById("notes").value,
    };

    // 3. API Submission
    try {
      const response = await fetch(`${API_BASE_URL}/api/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        showConfirmation(formData);
        // Optionally: Re-fetch availability to update calendar on the client
        fetchAvailability();
      } else {
        // Server validation/Error (e.g., double booking)
        alert(`Booking failed: ${data.msg || "Unknown error."}`);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      alert("A network error occurred. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
    }
  });

  // --- Initialization ---
  // Start by fetching current availability and rendering the calendar for the current month
  fetchAvailability();
});
