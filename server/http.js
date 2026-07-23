function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

function sendText(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  });
  response.end(body);
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function isAdminRequest(request, url, adminToken) {
  const header = request.headers["x-admin-token"];
  const query = url.searchParams.get("token");
  return Boolean(adminToken && (header === adminToken || query === adminToken));
}

function methodNotAllowed(response, allowed) {
  response.writeHead(405, {
    "Content-Type": "application/json; charset=utf-8",
    Allow: allowed.join(", ")
  });
  response.end(JSON.stringify({ ok: false, errors: { method: "Method not allowed." } }));
}

module.exports = {
  sendJson,
  sendText,
  readRequestBody,
  isAdminRequest,
  methodNotAllowed
};
