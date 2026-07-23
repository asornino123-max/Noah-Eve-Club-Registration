const EMAIL_SECRET = "REPLACE_WITH_LONG_RANDOM_SECRET";
const FROM_NAME = "Noah & Eve Center";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    if (payload.secret !== EMAIL_SECRET) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }

    GmailApp.sendEmail(payload.to, payload.subject, payload.text, {
      name: FROM_NAME
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
