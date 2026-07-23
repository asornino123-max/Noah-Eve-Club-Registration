const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const config = require("./config");
const registrationService = require("./registration");
const calendarService = require("./calendar");
const { isAdminRequest, readRequestBody, sendJson } = require("./http");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function routeApi(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/register") {
    try {
      const payload = await readRequestBody(request);
      const result = await registrationService.registerMember(payload);
      sendJson(response, result.status, result);
    } catch (error) {
      sendJson(response, 500, { ok: false, errors: { server: error.message } });
    }
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/registrations") {
    if (!isAdminRequest(request, url, config.adminToken)) {
      sendJson(response, 401, { ok: false, errors: { auth: "Admin token required." } });
      return true;
    }
    const registrations = await registrationService.searchRegistrations(url.searchParams.get("q") || "");
    sendJson(response, 200, { ok: true, registrations });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/export.csv") {
    if (!isAdminRequest(request, url, config.adminToken)) {
      sendJson(response, 401, { ok: false, errors: { auth: "Admin token required." } });
      return true;
    }
    const registrations = await registrationService.searchRegistrations(url.searchParams.get("q") || "");
    response.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=noah-eve-club-registrations.csv"
    });
    response.end(registrationService.toCsv(registrations));
    return true;
  }

  const calendarMatch = url.pathname.match(/^\/api\/calendar\/([a-f0-9-]+)\.ics$/i);
  if (request.method === "GET" && calendarMatch) {
    const registration = await registrationService.findRegistrationById(calendarMatch[1]);
    if (!registration) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Calendar file not found");
      return true;
    }
    response.writeHead(200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=${registration.membershipId.toLowerCase()}-welcome-visit.ics`
    });
    response.end(calendarService.buildIcs(registration));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "noah-eve-club-registration" });
    return true;
  }

  return false;
}

async function serveStatic(request, response, url) {
  if (isPrivatePath(url.pathname)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const safePath = path
    .normalize(decodeURIComponent(url.pathname))
    .replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(config.publicDir, safePath);

  if (!filePath.startsWith(config.publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    const publicFilePath = path.join(config.rootDir, "public", safePath);
    try {
      const stat = await fs.stat(publicFilePath);
      filePath = stat.isDirectory() ? path.join(publicFilePath, "index.html") : publicFilePath;
    } catch {
      filePath = path.join(config.publicDir, "index.html");
    }
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function isPrivatePath(pathname) {
  return /^\/(?:data|server|tools|node_modules)(?:\/|$)/.test(pathname) || /^\/(?:\.env|\.git|package|README)/.test(pathname);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${config.host}:${config.port}`);
  const handled = await routeApi(request, response, url);
  if (!handled) {
    await serveStatic(request, response, url);
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Noah & Eve Club registration running at http://${config.host}:${config.port}/`);
});
