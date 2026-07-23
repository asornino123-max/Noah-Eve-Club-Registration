const config = require("./config");
const storage = require("./storage");

function buildWelcomeEmail(registration) {
  const firstName = registration.firstName || "there";
  return {
    to: registration.email,
    from: config.email.from,
    subject: "Welcome to Noah & Eve Club - Your Membership is Now Active",
    text: [
      `Hello ${firstName},`,
      "",
      "Welcome to the Noah & Eve Club.",
      "",
      "Thank you for becoming part of our growing community dedicated to confidence, wellness, and long-term aesthetic care.",
      "",
      "Your 1-year membership is now active, and you may now enjoy the following exclusive privileges:",
      "- 10% OFF all aesthetic treatments and doctor services",
      "- 10% OFF all Noah & Eve merchandise",
      "- An additional 2% OFF on top of any ongoing clinic promotions",
      "- One (1) FREE Birthday Facial during your birthday month",
      "- FREE LED Light Therapy for your skin or hair with every clinic visit",
      "- FREE access to all Noah & Eve Club community events, wellness talks, and exclusive member gatherings",
      "",
      `Membership ID: ${registration.membershipId}`,
      `Activation Date: ${registration.activationDate}`,
      `Expiration Date: ${registration.expirationDate}`,
      "",
      "To redeem your benefits, simply inform our team that you are a Noah & Eve Club member during your visit.",
      "",
      "If you have any questions, we're always happy to help.",
      "Viber: 0917 301 7806",
      "Instagram: @noahandeveclub",
      "",
      "We look forward to being part of your wellness and aesthetic journey.",
      "",
      "With care,",
      "The Noah & Eve Center Team"
    ].join("\n")
  };
}

function buildTeamNotification(registration) {
  if (!config.email.teamNotifyEmail) {
    return null;
  }

  return {
    to: config.email.teamNotifyEmail,
    from: config.email.from,
    subject: `New Noah & Eve Club Registration - ${registration.membershipId}`,
    text: [
      "A new Noah & Eve Club registration was received.",
      "",
      `Name: ${registration.firstName} ${registration.lastName}`,
      `Preferred Name: ${registration.preferredName || "-"}`,
      `Membership ID: ${registration.membershipId}`,
      `Email: ${registration.email}`,
      `Mobile: ${registration.mobileNumber}`,
      `Activation Date: ${registration.activationDate}`,
      `Expiration Date: ${registration.expirationDate}`,
      "",
      "Full registration details are saved in the local database/admin export."
    ].join("\n")
  };
}

async function sendViaResend(message) {
  if (config.email.from.includes("noahandeve.local")) {
    throw new Error("EMAIL_FROM must be a verified sender before Resend can send live email.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.email.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed: ${response.status} ${detail}`);
  }

  return response.json();
}

async function deliver(message, type, registrationId) {
  const envelope = {
    id: `${Date.now()}-${type}`,
    type,
    registrationId,
    createdAt: new Date().toISOString(),
    provider: config.email.resendApiKey ? "resend" : "local-outbox",
    message
  };

  if (config.email.resendApiKey) {
    const result = await sendViaResend(message);
    return { ...envelope, status: "sent", providerResponse: result };
  }

  await storage.saveOutboxMessage({ ...envelope, status: "mock-sent" });
  return { ...envelope, status: "mock-sent" };
}

async function sendRegistrationEmails(registration) {
  const messages = [buildWelcomeEmail(registration), buildTeamNotification(registration)].filter(Boolean);
  const results = [];

  for (const message of messages) {
    const type = message.to === registration.email ? "welcome" : "team-notification";
    results.push(await deliver(message, type, registration.id));
  }

  return results;
}

module.exports = {
  buildWelcomeEmail,
  buildTeamNotification,
  sendRegistrationEmails
};
