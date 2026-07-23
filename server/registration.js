const crypto = require("crypto");
const storage = require("./storage");
const email = require("./email");
const calendar = require("./calendar");

const requiredFields = ["firstName", "lastName", "birthday", "email", "mobileNumber", "privacyConsent"];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addOneYear(date) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function computeAge(birthday, today = new Date()) {
  if (!birthday) return "";
  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : "";
}

function validateInput(input) {
  const errors = {};

  for (const field of requiredFields) {
    if (!input[field]) {
      errors[field] = "This field is required.";
    }
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (input.mobileNumber && normalizePhone(input.mobileNumber).length < 10) {
    errors.mobileNumber = "Please enter a valid mobile number.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

function buildMembershipId(registrations, activationDate) {
  const year = new Date(`${activationDate}T00:00:00`).getFullYear();
  const sameYearCount = registrations.filter((item) => item.membershipId?.startsWith(`NEC-${year}-`)).length;
  return `NEC-${year}-${String(sameYearCount + 1).padStart(6, "0")}`;
}

function isMembershipIdConflict(error) {
  return /membership_id|membershipId|duplicate key/i.test(error.message || "");
}

function findActiveDuplicate(registrations, emailAddress, mobileNumber, today) {
  const emailKey = normalizeEmail(emailAddress);
  const mobileKey = normalizePhone(mobileNumber);

  return registrations.find((registration) => {
    const expires = new Date(`${registration.expirationDate}T23:59:59`);
    const active = !Number.isNaN(expires.getTime()) && expires >= today;
    return (
      active &&
      (normalizeEmail(registration.email) === emailKey ||
        normalizePhone(registration.mobileNumber) === mobileKey)
    );
  });
}

function sanitizeInput(input) {
  return {
    firstName: String(input.firstName || "").trim(),
    lastName: String(input.lastName || "").trim(),
    preferredName: String(input.preferredName || "").trim(),
    birthday: String(input.birthday || "").trim(),
    gender: String(input.gender || "").trim(),
    email: normalizeEmail(input.email),
    mobileNumber: String(input.mobileNumber || "").trim(),
    viberNumber: String(input.viberNumber || "").trim(),
    homeAddress: String(input.homeAddress || "").trim(),
    city: String(input.city || "").trim(),
    occupation: String(input.occupation || "").trim(),
    company: String(input.company || "").trim(),
    instagramUsername: String(input.instagramUsername || "").trim(),
    facebookProfile: String(input.facebookProfile || "").trim(),
    medicalConditions: String(input.medicalConditions || "").trim(),
    currentMedications: String(input.currentMedications || "").trim(),
    knownAllergies: String(input.knownAllergies || "").trim(),
    aestheticConcerns: toArray(input.aestheticConcerns),
    serviceInterests: toArray(input.serviceInterests),
    referralSource: String(input.referralSource || "").trim(),
    communicationPreferences: toArray(input.communicationPreferences),
    preferredVisitDate: String(input.preferredVisitDate || "").trim(),
    preferredVisitTime: String(input.preferredVisitTime || "").trim(),
    informationAccuracy: Boolean(input.informationAccuracy),
    marketingConsent: Boolean(input.marketingConsent),
    privacyConsent: Boolean(input.privacyConsent)
  };
}

async function registerMember(rawInput) {
  const input = sanitizeInput(rawInput);
  const validation = validateInput(input);
  if (!validation.ok) {
    return { ok: false, status: 422, errors: validation.errors };
  }

  const registrations = await storage.listRegistrations();
  const today = new Date();
  const duplicate = findActiveDuplicate(registrations, input.email, input.mobileNumber, today);
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      errors: {
        duplicate: `An active membership already exists for this email or mobile number: ${duplicate.membershipId}.`
      }
    };
  }

  const activationDate = formatDate(today);
  const expirationDate = formatDate(addOneYear(today));
  let registration = null;
  let saveError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentRegistrations = attempt === 0 ? registrations : await storage.listRegistrations();
    registration = {
      id: crypto.randomUUID(),
      membershipId: buildMembershipId(currentRegistrations, activationDate),
      activationDate,
      expirationDate,
      age: computeAge(input.birthday, today),
      createdAt: today.toISOString(),
      ...input
    };

    try {
      await storage.saveRegistration(registration);
      saveError = null;
      break;
    } catch (error) {
      saveError = error;
      if (!isMembershipIdConflict(error)) {
        throw error;
      }
    }
  }

  if (saveError) {
    throw saveError;
  }

  let emailResults = [];
  let emailWarning = null;
  try {
    emailResults = await email.sendRegistrationEmails(registration);
  } catch (error) {
    emailWarning = error.message;
    emailResults = [
      {
        type: "registration-email",
        status: "failed",
        provider: "email-service"
      }
    ];
  }

  return {
    ok: true,
    status: 201,
    registration: {
      id: registration.id,
      membershipId: registration.membershipId,
      firstName: registration.firstName,
      lastName: registration.lastName,
      preferredName: registration.preferredName,
      email: registration.email,
      activationDate: registration.activationDate,
      expirationDate: registration.expirationDate,
      calendarLinks: calendar.buildCalendarLinks(registration)
    },
    emailResults: emailResults.map((result) => ({
      type: result.type,
      status: result.status,
      provider: result.provider
    })),
    emailWarning
  };
}

async function findRegistrationById(id) {
  const registrations = await storage.listRegistrations();
  return registrations.find((registration) => registration.id === id);
}

async function searchRegistrations(query = "") {
  const registrations = await storage.listRegistrations();
  const term = String(query || "").trim().toLowerCase();

  if (!term) {
    return registrations;
  }

  return registrations.filter((registration) => {
    const haystack = [
      registration.membershipId,
      registration.firstName,
      registration.lastName,
      registration.preferredName,
      registration.email,
      registration.mobileNumber,
      registration.city,
      registration.company
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

function toCsv(registrations) {
  const headers = [
    "membershipId",
    "firstName",
    "lastName",
    "preferredName",
    "email",
    "mobileNumber",
    "birthday",
    "age",
    "activationDate",
    "expirationDate",
    "city",
    "company",
    "referralSource",
    "createdAt"
  ];

  const rows = registrations.map((registration) =>
    headers.map((key) => csvCell(registration[key])).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports = {
  registerMember,
  searchRegistrations,
  toCsv,
  computeAge,
  findRegistrationById
};
