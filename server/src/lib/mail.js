// Invio email da amministrazione@toscanadiagnostica.it tramite Microsoft Graph (client credentials).
// Richiede sull'app registration il permesso applicativo Mail.Send, limitato alla casella mittente
// con una Application Access Policy di Exchange Online (vedi README).
import { config } from '../config.js';

let cached = { token: null, exp: 0 };

async function graphToken() {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const { tenantId, clientId, clientSecret } = config.entra;
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' });
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, { method: 'POST', body });
  const j = await res.json();
  if (!res.ok) throw new Error(`Token Graph non ottenuto: ${j.error_description || res.status}`);
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Layout nello stile delle webapp aziendali
export function layout({ title, intro, rows = [], button, note }) {
  const trs = rows.filter((r) => r[1] != null && r[1] !== '').map(([k, v]) => `<tr><td style="padding:6px 10px;color:#5b6f75;font-size:12px;white-space:nowrap">${esc(k)}</td><td style="padding:6px 10px;font-weight:600;color:#0f2a33">${esc(v)}</td></tr>`).join('');
  return `<!doctype html><html lang="it"><body style="margin:0;background:#f3f6f6;font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#0f2a33">
<div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #dbe5e7;border-radius:12px;overflow:hidden">
<div style="background:#01212C;padding:18px 24px;color:#FFFAE3"><div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#71B1BD;font-weight:700">Toscana Diagnostica · Finance</div><div style="font-size:18px;font-weight:700;margin-top:6px">${esc(title)}</div></div>
<div style="padding:20px 24px;font-size:14px;line-height:1.5">${intro ? `<p style="margin:0 0 14px">${intro}</p>` : ''}
${trs ? `<table style="border-collapse:collapse;width:100%;background:#fafcfc;border:1px solid #dbe5e7;border-radius:8px">${trs}</table>` : ''}
${button ? `<p style="margin:20px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#1C505E;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:9px">${esc(button.label)}</a></p><p style="font-size:12px;color:#5b6f75">Se il pulsante non funziona copia questo indirizzo nel browser:<br><span style="word-break:break-all">${esc(button.url)}</span></p>` : ''}
${note ? `<p style="font-size:12px;color:#5b6f75;margin-top:16px">${note}</p>` : ''}
</div>
<div style="padding:12px 24px;background:#fafcfc;border-top:1px solid #dbe5e7;font-size:11px;color:#5b6f75">Messaggio automatico di Toscana Diagnostica · Finance (${esc(config.baseUrl)}). Non rispondere a questa email.</div>
</div></body></html>`;
}

export async function sendMail({ to, cc, subject, html, attachments = [] }) {
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const ccList = (Array.isArray(cc) ? cc : [cc]).filter(Boolean).filter((a) => !toList.includes(a));
  if (config.mail.mode !== 'GRAPH') {
    console.log(`[mail:${config.mail.mode}] a: ${toList.join(', ')}${ccList.length ? ` cc: ${ccList.join(', ')}` : ''} · ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600)}`);
    return { ok: true, mode: config.mail.mode };
  }
  const token = await graphToken();
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    from: { emailAddress: { address: config.mail.sender, name: config.mail.senderName } },
    toRecipients: toList.map((address) => ({ emailAddress: { address } })),
    ccRecipients: ccList.map((address) => ({ emailAddress: { address } })),
    attachments: attachments.map((a) => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: a.filename, contentType: a.mime, contentBytes: a.data.toString('base64') })),
  };
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.mail.sender)}/sendMail`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Invio email non riuscito (${res.status}): ${t.slice(0, 300)}`);
  }
  return { ok: true, mode: 'GRAPH' };
}

export async function mailAvailable() {
  if (config.mail.mode !== 'GRAPH') return { ok: false, mode: config.mail.mode };
  try { await graphToken(); return { ok: true, mode: 'GRAPH' }; } catch (e) { return { ok: false, mode: 'GRAPH', error: e.message }; }
}
