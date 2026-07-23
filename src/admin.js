(function () {
  const input = document.querySelector("#searchInput");
  const tokenInput = document.querySelector("#adminToken");
  const exportLink = document.querySelector("#exportLink");
  const body = document.querySelector("#registrationsBody");
  const status = document.querySelector("#adminStatus");
  tokenInput.value = localStorage.getItem("noahEveAdminToken") || "local-dev";

  async function loadRegistrations() {
    const query = input.value.trim();
    const token = tokenInput.value.trim();
    localStorage.setItem("noahEveAdminToken", token);
    exportLink.href = `/api/export.csv?token=${encodeURIComponent(token)}`;
    const response = await fetch(`/api/registrations?q=${encodeURIComponent(query)}`, {
      headers: { "x-admin-token": token }
    });
    const result = await response.json();
    if (!response.ok) {
      body.innerHTML = "";
      status.textContent = result.errors?.auth || "Unable to load registrations.";
      return;
    }
    const registrations = result.registrations || [];

    body.innerHTML = registrations
      .map((item) => {
        const active = new Date(`${item.expirationDate}T23:59:59`) >= new Date();
        return `
          <tr>
            <td>${escapeHtml(item.membershipId)}</td>
            <td>${escapeHtml(item.firstName)} ${escapeHtml(item.lastName)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.mobileNumber)}</td>
            <td><span class="status-pill">${active ? "Active" : "Expired"}</span></td>
            <td>${escapeHtml(item.expirationDate)}</td>
          </tr>
        `;
      })
      .join("");

    status.textContent = `${registrations.length} registration${registrations.length === 1 ? "" : "s"} shown.`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(loadRegistrations, 180);
  });

  tokenInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(loadRegistrations, 180);
  });

  loadRegistrations().catch((error) => {
    status.textContent = error.message;
  });
})();
