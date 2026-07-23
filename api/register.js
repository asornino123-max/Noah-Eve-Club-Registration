const registrationService = require("../server/registration");
const { methodNotAllowed, readRequestBody, sendJson } = require("../server/http");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const payload = await readRequestBody(request);
    const result = await registrationService.registerMember(payload);
    sendJson(response, result.status, result);
  } catch (error) {
    sendJson(response, 500, { ok: false, errors: { server: error.message } });
  }
};
