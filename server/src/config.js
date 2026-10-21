// Configurazione da variabili d'ambiente
const env = process.env;

export const config = {
  port: Number(env.PORT || 3000),
  baseUrl: env.BASE_URL || 'http://localhost:3000',
  databaseUrl: env.DATABASE_URL || 'postgres://postgres:dev@localhost:5432/finance',
  sessionSecret: env.SESSION_SECRET || 'dev-only-change-me',
  secureCookies: env.NODE_ENV === 'production',
  sessionHours: Number(env.SESSION_HOURS || 10),
  requireTotpForAdmins: (env.REQUIRE_TOTP_FOR_ADMINS || 'true') === 'true',
  maxUploadMb: Number(env.MAX_UPLOAD_MB || 25),
  sofficeBin: env.SOFFICE_BIN || 'soffice',
  // La firma richiede una sessione Microsoft 365. SIGN_ALLOW_LOCAL=true solo per sviluppo locale.
  signAllowLocal: (env.SIGN_ALLOW_LOCAL || 'false') === 'true',
  entra: {
    tenantId: env.ENTRA_TENANT_ID || '',
    clientId: env.ENTRA_CLIENT_ID || '',
    clientSecret: env.ENTRA_CLIENT_SECRET || '',
    get enabled() { return Boolean(this.tenantId && this.clientId && this.clientSecret); },
  },
  mail: {
    // GRAPH: invio tramite Microsoft Graph con la stessa app registration (permesso applicativo Mail.Send).
    // LOG: nessun invio, il contenuto e il link di firma finiscono nel log del server (sviluppo).
    mode: (env.MAIL_MODE || (env.ENTRA_TENANT_ID ? 'GRAPH' : 'LOG')).toUpperCase(),
    sender: env.MAIL_SENDER || 'amministrazione@toscanadiagnostica.it',
    senderName: env.MAIL_SENDER_NAME || 'Toscana Diagnostica · Amministrazione',
  },
  seed: {
    adminEmail: env.SEED_ADMIN_EMAIL || '',
    adminName: env.SEED_ADMIN_NAME || 'Amministratore',
    adminPassword: env.SEED_ADMIN_PASSWORD || '',
  },
  appName: 'Toscana Diagnostica · Finance',
};

if (env.NODE_ENV === 'production' && config.sessionSecret === 'dev-only-change-me') {
  throw new Error('SESSION_SECRET obbligatorio in produzione');
}
