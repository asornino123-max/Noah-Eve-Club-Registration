const calendarService = require("../../server/calendar");
const registrationService = require("../../server/registration");
const { methodNotAllowed, sendText } = require("../../server/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  const url = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const fileName = decodeURIComponent(url.pathname.split("/").pop() || "");
  const id = fileName.replace(/\.ics$/i, "");
  const registration = await registrationService.findRegistrationById(id);

  if (!registration) {
    sendText(response, 404, "Calendar file not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename=${registration.membershipId.toLowerCase()}-welcome-visit.ics`
  });
  response.end(calendarService.buildIcs(registration));
};
