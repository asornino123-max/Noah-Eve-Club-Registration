const assert = require("assert");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4180";
const adminToken = process.env.ADMIN_TOKEN || "local-dev";
const stamp = Date.now();

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

(async () => {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);

  const payload = {
    firstName: "Test",
    lastName: "Member",
    preferredName: "Test",
    birthday: "1994-03-12",
    gender: "Female",
    email: `test.member.${stamp}@example.com`,
    mobileNumber: `+63917${String(stamp).slice(-7)}`,
    viberNumber: "",
    homeAddress: "Makati City",
    city: "Makati",
    occupation: "Founder",
    company: "Noah & Eve",
    instagramUsername: "@test",
    facebookProfile: "",
    medicalConditions: "None",
    currentMedications: "None",
    knownAllergies: "None",
    aestheticConcerns: ["Wellness", "Skin Brightening"],
    serviceInterests: ["Facials", "IV Drips"],
    referralSource: "Instagram",
    communicationPreferences: ["Promotions", "Community Events"],
    preferredVisitDate: "2026-08-01",
    preferredVisitTime: "10:30",
    informationAccuracy: true,
    marketingConsent: true,
    privacyConsent: true
  };

  const created = await request("/api/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.ok, true);
  assert.match(created.body.registration.membershipId, /^NEC-\d{4}-\d{6}$/);
  assert.equal(created.body.emailResults[0].status, "mock-sent");
  assert.match(created.body.registration.calendarLinks.google, /^https:\/\/calendar\.google\.com/);
  assert.match(created.body.registration.calendarLinks.outlook, /^https:\/\/outlook\.live\.com/);
  assert.match(created.body.registration.calendarLinks.ics, /^\/api\/calendar\/.+\.ics$/);

  const duplicate = await request("/api/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.ok, false);

  const blockedList = await request(`/api/registrations?q=${encodeURIComponent(payload.email)}`);
  assert.equal(blockedList.response.status, 401);

  const privateData = await request("/data/registrations.json");
  assert.equal(privateData.response.status, 404);

  const list = await request(`/api/registrations?q=${encodeURIComponent(payload.email)}`, {
    headers: { "x-admin-token": adminToken }
  });
  assert.equal(list.response.status, 200);
  assert.equal(list.body.registrations.length, 1);

  const csv = await request(`/api/export.csv?token=${encodeURIComponent(adminToken)}`);
  assert.equal(csv.response.status, 200);
  assert.match(csv.body, /membershipId/);

  const ics = await request(created.body.registration.calendarLinks.ics);
  assert.equal(ics.response.status, 200);
  assert.match(ics.body, /BEGIN:VCALENDAR/);

  console.log(
    JSON.stringify(
      {
        ok: true,
        membershipId: created.body.registration.membershipId,
        activationDate: created.body.registration.activationDate,
        expirationDate: created.body.registration.expirationDate,
        emailMode: created.body.emailResults[0].provider
      },
      null,
      2
    )
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
