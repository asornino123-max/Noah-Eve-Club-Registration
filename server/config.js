const path = require("path");

const rootDir = path.resolve(__dirname, "..");

module.exports = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 4180),
  adminToken: process.env.ADMIN_TOKEN || "local-dev",
  rootDir,
  dataDir: path.join(rootDir, "data"),
  publicDir: rootDir,
  bookingUrl: process.env.BOOKING_URL || "https://www.instagram.com/noahandeveclub/",
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    registrationsTable: process.env.SUPABASE_REGISTRATIONS_TABLE || "registrations",
    outboxTable: process.env.SUPABASE_OUTBOX_TABLE || "email_outbox"
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "Noah & Eve Center <members@noahandeve.local>",
    teamNotifyEmail: process.env.TEAM_NOTIFY_EMAIL || "",
    appsScriptWebhookUrl: process.env.APPS_SCRIPT_EMAIL_WEBHOOK_URL || "",
    appsScriptSecret: process.env.APPS_SCRIPT_EMAIL_SECRET || ""
  }
};
