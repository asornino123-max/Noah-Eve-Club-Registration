(function () {
  const concernOptions = [
    "Acne",
    "Acne scars",
    "Pigmentation",
    "Aging",
    "Wrinkles",
    "Hair loss",
    "Weight Management",
    "Skin Brightening",
    "Body Contouring",
    "Wellness",
    "Others"
  ];

  const serviceOptions = [
    "Botox",
    "Fillers",
    "Skin Boosters",
    "Bio-Stimulators",
    "IV Drips",
    "Weight Loss",
    "Laser Treatments",
    "Facials",
    "Body Treatments",
    "Hair Restoration",
    "Wellbeing Services",
    "Other"
  ];

  const communicationOptions = [
    "Promotions",
    "New Treatment Launches",
    "Community Events",
    "Doctor Talks",
    "Wellness Tips"
  ];

  const groupOptions = {
    aestheticConcerns: concernOptions,
    serviceInterests: serviceOptions,
    communicationPreferences: communicationOptions
  };

  const form = document.querySelector("#registrationForm");
  const status = document.querySelector("#formStatus");
  const successPanel = document.querySelector("#successPanel");
  let currentStep = 1;

  function renderGroups() {
    document.querySelectorAll("[data-checkbox-group]").forEach((container) => {
      const name = container.dataset.checkboxGroup;
      container.innerHTML = groupOptions[name]
        .map(
          (option) => `
            <label class="chip">
              <input type="checkbox" name="${name}" value="${option}">
              <span>${option}</span>
            </label>
          `
        )
        .join("");
    });
  }

  function computeAge(value) {
    if (!value) return "";
    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age >= 0 && age < 130 ? String(age) : "";
  }

  function setError(name, message) {
    const target = document.querySelector(`[data-error-for="${name}"]`);
    if (target) target.textContent = message || "";
  }

  function collectForm() {
    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      if (groupOptions[key]) {
        payload[key] = formData.getAll(key);
      } else {
        payload[key] = typeof value === "string" ? value.trim() : value;
      }
    }

    for (const groupName of Object.keys(groupOptions)) {
      payload[groupName] = formData.getAll(groupName);
    }

    payload.informationAccuracy = form.elements.informationAccuracy.checked;
    payload.marketingConsent = form.elements.marketingConsent.checked;
    payload.privacyConsent = form.elements.privacyConsent.checked;
    return payload;
  }

  function setStep(step) {
    currentStep = step;
    document.querySelectorAll("[data-step-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.stepPanel !== String(step);
    });
    document.querySelectorAll("[data-step-dot]").forEach((dot) => {
      dot.classList.toggle("is-active", Number(dot.dataset.stepDot) <= step);
    });
    document.querySelector("[data-prev-step]").hidden = step === 1;
    document.querySelector("[data-next-step]").hidden = step === 2;
    form.querySelector('button[type="submit"]').hidden = step !== 2;
    status.textContent = "";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validateStepOne() {
    const required = ["firstName", "lastName", "birthday", "email", "mobileNumber"];
    let valid = true;
    clearErrors();
    required.forEach((name) => {
      if (!form.elements[name].value.trim()) {
        setError(name, "This field is required.");
        valid = false;
      }
    });
    if (form.elements.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value)) {
      setError("email", "Please enter a valid email address.");
      valid = false;
    }
    if (!valid) status.textContent = "Please complete the required personal details.";
    return valid;
  }

  function clearErrors() {
    document.querySelectorAll("[data-error-for]").forEach((item) => {
      item.textContent = "";
    });
  }

  function showErrors(errors) {
    clearErrors();
    Object.entries(errors || {}).forEach(([key, message]) => {
      setError(key, message);
    });
    status.textContent = errors?.duplicate || "Please review the required details.";
  }

  function showSuccess(result) {
    const registration = result.registration;
    document.querySelector("#successName").textContent = `${registration.firstName} ${registration.lastName}`;
    document.querySelector("#successId").textContent = registration.membershipId;
    document.querySelector("#successActivation").textContent = registration.activationDate;
    document.querySelector("#successExpiration").textContent = registration.expirationDate;
    document.querySelector("#successEmailMessage").textContent = result.emailWarning
      ? "Your membership is registered. The email confirmation needs to be resent by the team."
      : "Please check your email for your membership confirmation and benefits guide.";
    document.querySelector("#googleCalendarLink").href = registration.calendarLinks.google;
    document.querySelector("#outlookCalendarLink").href = registration.calendarLinks.outlook;
    document.querySelector("#icsCalendarLink").href = registration.calendarLinks.ics;
    form.closest(".registration-shell").hidden = true;
    successPanel.hidden = false;
    successPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  renderGroups();
  if (window.lucide) window.lucide.createIcons();

  document.querySelector("#birthday").addEventListener("change", (event) => {
    document.querySelector("#age").value = computeAge(event.target.value);
  });

  document.querySelector("[data-next-step]").addEventListener("click", () => {
    if (validateStepOne()) setStep(2);
  });

  document.querySelector("[data-prev-step]").addEventListener("click", () => {
    setStep(1);
  });

  form.addEventListener("input", (event) => {
    if (event.target.name) setError(event.target.name, "");
    status.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    status.textContent = "";
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Registering...";

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectForm())
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        showErrors(result.errors);
        return;
      }
      showSuccess(result);
    } catch (error) {
      status.textContent = `Unable to submit right now: ${error.message}`;
    } finally {
      button.disabled = false;
      button.textContent = "Join Noah & Eve Club";
    }
  });

  setStep(1);
})();
