const config = require("./config");

const clinicLocation = "Noah & Eve Center";
const visitTitle = "Noah & Eve Club Welcome Visit";
const visitDetails = "Welcome to Noah & Eve Club. Please present your membership ID during your visit.";

function pad(value) {
  return String(value).padStart(2, "0");
}

function getSchedule(registration) {
  const date = registration.preferredVisitDate || registration.activationDate;
  const time = registration.preferredVisitTime || "10:00";
  const start = new Date(`${date}T${time}:00+08:00`);
  const safeStart = Number.isNaN(start.getTime()) ? new Date(`${registration.activationDate}T10:00:00+08:00`) : start;
  const end = new Date(safeStart.getTime() + 60 * 60 * 1000);
  return { start: safeStart, end };
}

function toGoogleDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function toOutlookDate(date) {
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00+08:00`;
}

function toIcsDate(date) {
  return toGoogleDate(date);
}

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildCalendarLinks(registration) {
  const { start, end } = getSchedule(registration);
  const description = `${visitDetails}\n\nMembership ID: ${registration.membershipId}`;

  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", visitTitle);
  google.searchParams.set("dates", `${toGoogleDate(start)}/${toGoogleDate(end)}`);
  google.searchParams.set("details", description);
  google.searchParams.set("location", clinicLocation);

  const outlook = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  outlook.searchParams.set("subject", visitTitle);
  outlook.searchParams.set("body", description.replace(/\n/g, " "));
  outlook.searchParams.set("location", clinicLocation);
  outlook.searchParams.set("startdt", toOutlookDate(start));
  outlook.searchParams.set("enddt", toOutlookDate(end));
  outlook.searchParams.set("path", "/calendar/action/compose");
  outlook.searchParams.set("rru", "addevent");

  return {
    google: google.toString(),
    outlook: outlook.toString(),
    ics: `/api/calendar/${registration.id}.ics`
  };
}

function buildIcs(registration) {
  const { start, end } = getSchedule(registration);
  const description = `${visitDetails}\\nMembership ID: ${registration.membershipId}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Noah and Eve Center//Club Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${registration.id}@noahandeveclub`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(visitTitle)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(clinicLocation)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

module.exports = {
  buildCalendarLinks,
  buildIcs
};
