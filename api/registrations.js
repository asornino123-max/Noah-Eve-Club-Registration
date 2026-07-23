const config = require("../server/config");
const registrationService = require("../server/registration");
const { isAdminRequest, methodNotAllowed, sendJson } = require("../server/http");

module.exports = async function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);

  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  if (!isAdminRequest(request, url, config.adminToken)) {
    sendJson(response, 401, { ok: false, errors: { auth: "Admin token required." } });
    return;
  }

  const registrations = await registrationService.searchRegistrations(url.searchParams.get("q") || "");
  sendJson(response, 200, { ok: true, registrations });
};
