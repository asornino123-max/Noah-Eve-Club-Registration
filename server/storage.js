const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

const registrationsPath = path.join(config.dataDir, "registrations.json");
const outboxPath = path.join(config.dataDir, "email-outbox.json");
const useSupabase = Boolean(config.supabase.url && config.supabase.serviceRoleKey);

function supabaseEndpoint(table, query = "") {
  const base = config.supabase.url.replace(/\/$/, "");
  return `${base}/rest/v1/${table}${query}`;
}

async function supabaseRequest(table, query, options = {}) {
  const response = await fetch(supabaseEndpoint(table, query), {
    ...options,
    headers: {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${table} request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function toRegistrationRow(registration) {
  return {
    id: registration.id,
    membership_id: registration.membershipId,
    first_name: registration.firstName,
    last_name: registration.lastName,
    preferred_name: registration.preferredName,
    email: registration.email,
    mobile_number: registration.mobileNumber,
    activation_date: registration.activationDate,
    expiration_date: registration.expirationDate,
    preferred_visit_date: registration.preferredVisitDate || null,
    preferred_visit_time: registration.preferredVisitTime || null,
    created_at: registration.createdAt,
    payload: registration
  };
}

function fromRegistrationRow(row) {
  if (row.payload) {
    return {
      ...row.payload,
      id: row.id || row.payload.id,
      membershipId: row.membership_id || row.payload.membershipId,
      activationDate: row.activation_date || row.payload.activationDate,
      expirationDate: row.expiration_date || row.payload.expirationDate,
      createdAt: row.created_at || row.payload.createdAt
    };
  }

  return {
    id: row.id,
    membershipId: row.membership_id,
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    email: row.email,
    mobileNumber: row.mobile_number,
    activationDate: row.activation_date,
    expirationDate: row.expiration_date,
    preferredVisitDate: row.preferred_visit_date,
    preferredVisitTime: row.preferred_visit_time,
    createdAt: row.created_at
  };
}

async function ensureDataFiles() {
  await fs.mkdir(config.dataDir, { recursive: true });
  await ensureJsonFile(registrationsPath, []);
  await ensureJsonFile(outboxPath, []);
}

async function ensureJsonFile(filePath, fallback) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
  }
}

async function readJson(filePath, fallback) {
  await ensureDataFiles();
  try {
    const body = await fs.readFile(filePath, "utf8");
    return JSON.parse(body || "null") || fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureDataFiles();
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, filePath);
}

async function listRegistrations() {
  if (useSupabase) {
    const rows = await supabaseRequest(
      config.supabase.registrationsTable,
      "?select=*&order=created_at.desc"
    );
    return rows.map(fromRegistrationRow);
  }

  return readJson(registrationsPath, []);
}

async function saveRegistration(registration) {
  if (useSupabase) {
    const rows = await supabaseRequest(config.supabase.registrationsTable, "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toRegistrationRow(registration))
    });
    return fromRegistrationRow(rows[0]);
  }

  const registrations = await listRegistrations();
  registrations.push(registration);
  await writeJson(registrationsPath, registrations);
  return registration;
}

async function listOutbox() {
  return readJson(outboxPath, []);
}

async function saveOutboxMessage(message) {
  if (useSupabase) {
    const rows = await supabaseRequest(config.supabase.outboxTable, "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: message.id,
        type: message.type,
        registration_id: message.registrationId,
        provider: message.provider,
        status: message.status,
        message: message.message,
        provider_response: message.providerResponse || null,
        created_at: message.createdAt
      })
    });
    return rows[0];
  }

  const outbox = await listOutbox();
  outbox.push(message);
  await writeJson(outboxPath, outbox);
  return message;
}

module.exports = {
  listRegistrations,
  saveRegistration,
  listOutbox,
  saveOutboxMessage,
  useSupabase
};
