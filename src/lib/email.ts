/**
 * Couche d'envoi d'emails (Resend).
 *
 * Conçue pour être SANS RISQUE en l'absence de configuration : si
 * `RESEND_API_KEY` n'est pas défini, `sendEmail` ne fait rien (log info) et
 * renvoie `{ sent:false, skipped:true }`. Aucun appelant n'a besoin de
 * try/catch — la fonction n'émet jamais d'exception.
 *
 * Pour activer en prod :
 *   - RESEND_API_KEY=...           (clé API Resend)
 *   - EMAIL_FROM="T-ERP <no-reply@terpgroup.com>"   (domaine vérifié dans Resend)
 *   - PUBLIC_APP_URL=https://terpgroup.com          (base des liens dans les emails)
 */
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "T-ERP <no-reply@terpgroup.com>";

export const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || "https://terpgroup.com").replace(/\/$/, "");

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const c = getClient();
  if (!c) {
    console.info(`[email] RESEND_API_KEY absent — email ignoré : "${input.subject}" → ${String(input.to)}`);
    return { sent: false, skipped: true };
  }
  try {
    await c.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    return { sent: true };
  } catch (e) {
    console.error("[email] envoi échoué:", e);
    return { sent: false, error: e instanceof Error ? e.message : "inconnu" };
  }
}

/** Gabarit HTML brandé T-ERP (violet) réutilisable. */
export function emailLayout(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footnote?: string;
}): string {
  const cta = opts.cta
    ? `<tr><td style="padding:8px 0 4px"><a href="${opts.cta.url}" style="display:inline-block;background:#A855F7;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:8px">${opts.cta.label}</a></td></tr>`
    : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f1230">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #ececf1">
        <tr><td style="background:#2A1B3D;padding:18px 24px">
          <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px">T-ERP</span>
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 12px;font-size:18px;color:#1f1230">${opts.heading}</h1>
          <div style="font-size:14px;line-height:1.6;color:#3a3247">${opts.bodyHtml}</div>
          <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #ececf1;font-size:11px;color:#8a8499">
          ${opts.footnote ?? "T-ERP — ERP BTP multi-tenant. Cet email vous est envoyé suite à votre candidature."}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
