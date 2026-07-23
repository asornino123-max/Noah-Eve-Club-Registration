const { methodNotAllowed, sendJson } = require("../server/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  sendJson(response, 200, { ok: true, service: "noah-eve-club-registration" });
};
