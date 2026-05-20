/**
 * Composeurs d'emails du module recrutement (candidats).
 * Tous best-effort : s'appuient sur `sendEmail` qui ne lève jamais et ne fait
 * rien si Resend n'est pas configuré.
 */
import { sendEmail, emailLayout, PUBLIC_APP_URL } from "@/lib/email";

const APP = PUBLIC_APP_URL;

function fmtDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
}

const MODE_LABEL: Record<string, string> = {
  ONSITE: "En présentiel",
  PHONE: "Par téléphone",
  VIDEO: "En visioconférence",
};

export async function mailApplicationReceived(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  tenantName: string;
  tempPassword?: string | null;
}) {
  const access = opts.tempPassword
    ? `<p style="margin:12px 0 0;padding:12px;background:#f6f1fc;border-radius:8px">
        Un espace candidat a été créé pour suivre votre candidature :<br>
        <strong>Identifiant :</strong> ${opts.to}<br>
        <strong>Mot de passe provisoire :</strong> <code style="font-size:14px">${opts.tempPassword}</code><br>
        <span style="font-size:12px;color:#8a8499">Pensez à le changer après votre première connexion.</span>
      </p>`
    : "";
  return sendEmail({
    to: opts.to,
    subject: `Candidature reçue — ${opts.jobTitle}`,
    html: emailLayout({
      heading: "Votre candidature a bien été reçue",
      bodyHtml: `<p>Bonjour ${opts.candidateName},</p>
        <p>Nous confirmons la réception de votre candidature au poste de <strong>${opts.jobTitle}</strong> chez ${opts.tenantName}. Notre équipe RH l'étudie et reviendra vers vous.</p>
        ${access}`,
      cta: { label: "Suivre ma candidature", url: `${APP}/cand/candidatures` },
    }),
  });
}

export async function mailInterviewScheduled(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: Date;
  mode: string;
  location?: string | null;
  durationMin: number;
}) {
  const where = opts.location
    ? `<p><strong>${opts.mode === "VIDEO" ? "Lien" : opts.mode === "PHONE" ? "Numéro" : "Lieu"} :</strong> ${opts.location}</p>`
    : "";
  return sendEmail({
    to: opts.to,
    subject: `Convocation à un entretien — ${opts.jobTitle}`,
    html: emailLayout({
      heading: "Vous êtes convié(e) à un entretien",
      bodyHtml: `<p>Bonjour ${opts.candidateName},</p>
        <p>Dans le cadre de votre candidature au poste de <strong>${opts.jobTitle}</strong>, nous vous convions à un entretien :</p>
        <p><strong>Date :</strong> ${fmtDateTime(opts.scheduledAt)}<br>
        <strong>Durée :</strong> ${opts.durationMin} min<br>
        <strong>Modalité :</strong> ${MODE_LABEL[opts.mode] ?? opts.mode}</p>
        ${where}
        <p>Merci de confirmer votre présence depuis votre espace candidat.</p>`,
      cta: { label: "Confirmer ma présence", url: `${APP}/cand/entretiens` },
    }),
  });
}

export async function mailInterviewCancelled(opts: {
  to: string;
  candidateName: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Entretien annulé",
    html: emailLayout({
      heading: "Votre entretien a été annulé",
      bodyHtml: `<p>Bonjour ${opts.candidateName},</p>
        <p>Un entretien qui était planifié a été annulé par le service RH. Vous serez recontacté(e) prochainement.</p>`,
      cta: { label: "Voir mes entretiens", url: `${APP}/cand/entretiens` },
    }),
  });
}

// Étapes qui déclenchent un email candidat (les autres restent silencieuses).
const STAGE_EMAIL: Record<string, { subject: string; heading: string; body: string } | undefined> = {
  SHORTLISTED: {
    subject: "Votre candidature avance",
    heading: "Bonne nouvelle : vous êtes présélectionné(e)",
    body: "Votre profil a retenu l'attention de notre équipe RH pour le poste de <strong>{job}</strong>. Nous revenons vers vous pour la suite du processus.",
  },
  TECHNICAL_TEST: {
    subject: "Étape suivante : test technique",
    heading: "Vous passez à l'étape test technique",
    body: "Pour le poste de <strong>{job}</strong>, l'étape suivante est un test technique. Notre équipe vous communiquera les détails.",
  },
  OFFER: {
    subject: "Une proposition vous attend",
    heading: "Vous recevez une proposition",
    body: "Suite à votre candidature au poste de <strong>{job}</strong>, nous souhaitons vous faire une proposition. Notre équipe RH va vous contacter.",
  },
  HIRED: {
    subject: "Félicitations — vous êtes retenu(e) !",
    heading: "Bienvenue dans l'équipe 🎉",
    body: "Nous avons le plaisir de vous confirmer votre recrutement au poste de <strong>{job}</strong>. Notre équipe RH reviendra vers vous pour les formalités.",
  },
  REJECTED: {
    subject: "Suite donnée à votre candidature",
    heading: "Réponse à votre candidature",
    body: "Après étude attentive, nous ne donnerons pas suite à votre candidature au poste de <strong>{job}</strong>. Nous conservons votre profil et vous souhaitons une pleine réussite.",
  },
};

export async function mailStageChanged(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  stage: string;
  rhMessage?: string | null;
}) {
  const tpl = STAGE_EMAIL[opts.stage];
  if (!tpl) return { sent: false, skipped: true } as const;
  const extra = opts.rhMessage
    ? `<p style="margin-top:12px;padding:12px;background:#f6f1fc;border-radius:8px">${opts.rhMessage}</p>`
    : "";
  return sendEmail({
    to: opts.to,
    subject: tpl.subject,
    html: emailLayout({
      heading: tpl.heading,
      bodyHtml: `<p>Bonjour ${opts.candidateName},</p><p>${tpl.body.replace("{job}", opts.jobTitle)}</p>${extra}`,
      cta: { label: "Voir ma candidature", url: `${APP}/cand/candidatures` },
    }),
  });
}
