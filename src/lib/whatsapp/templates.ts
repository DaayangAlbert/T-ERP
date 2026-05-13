/**
 * Templates WhatsApp Business — Bloc 0 EMP.
 *
 * Les 7 modèles approuvés par la doc PROMPTS_EMP_BLOC0_BLOC1.md utilisés
 * pour notifier les ouvriers et employés bureau (canal préféré au Cameroun).
 *
 * **Stub d'envoi** : ce module ne pousse pas réellement les messages vers
 * l'API WhatsApp Business — l'intégration nécessite des credentials. À ce
 * stade, `sendWhatsappTemplate` se contente de logger et d'enregistrer la
 * tentative en base via le modèle Notification (workflow Bloc 1+).
 */
import { prisma } from "@/lib/prisma";

export type WhatsappTemplateKey =
  | "NEW_PAYSLIP_AVAILABLE"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "PAYMENT_RECEIVED"
  | "CERTIFICATE_EXPIRY"
  | "CONTRACT_ANNIVERSARY"
  | "SITE_CHANGE";

export interface WhatsappTemplate {
  key: WhatsappTemplateKey;
  /** Identifiant officiel WhatsApp Business (Meta) — placeholder à remplacer */
  metaName: string;
  /** Variables ordonnées attendues par le template */
  variables: readonly string[];
  /** Rendu côté serveur pour traçabilité dans Notification.body */
  render: (vars: Record<string, string>) => string;
}

const TEMPLATES: Record<WhatsappTemplateKey, WhatsappTemplate> = {
  NEW_PAYSLIP_AVAILABLE: {
    key: "NEW_PAYSLIP_AVAILABLE",
    metaName: "terp_emp_new_payslip_v1",
    variables: ["nom", "mois", "annee", "montant", "url"],
    render: ({ nom, mois, annee, montant, url }) =>
      `Bonjour ${nom}, votre bulletin ${mois} ${annee} de ${montant} FCFA est disponible. Lien : ${url}`,
  },
  LEAVE_REQUEST_APPROVED: {
    key: "LEAVE_REQUEST_APPROVED",
    metaName: "terp_emp_leave_approved_v1",
    variables: ["nom", "date_debut", "date_fin", "validator"],
    render: ({ nom, date_debut, date_fin, validator }) =>
      `Bonjour ${nom}, votre demande de congé du ${date_debut} au ${date_fin} a été validée par ${validator}.`,
  },
  LEAVE_REQUEST_REJECTED: {
    key: "LEAVE_REQUEST_REJECTED",
    metaName: "terp_emp_leave_rejected_v1",
    variables: ["nom", "date_debut", "date_fin", "validator", "raison"],
    render: ({ nom, date_debut, date_fin, validator, raison }) =>
      `Bonjour ${nom}, votre demande de congé du ${date_debut} au ${date_fin} a été refusée par ${validator}. Motif : ${raison}`,
  },
  PAYMENT_RECEIVED: {
    key: "PAYMENT_RECEIVED",
    metaName: "terp_emp_payment_received_v1",
    variables: ["nom", "montant", "banque", "date", "ref"],
    render: ({ nom, montant, banque, date, ref }) =>
      `Bonjour ${nom}, votre salaire de ${montant} FCFA a été viré sur ${banque} le ${date}. Réf : ${ref}`,
  },
  CERTIFICATE_EXPIRY: {
    key: "CERTIFICATE_EXPIRY",
    metaName: "terp_emp_certificate_expiry_v1",
    variables: ["nom", "certificat", "jours"],
    render: ({ nom, certificat, jours }) =>
      `Bonjour ${nom}, votre ${certificat} expire dans ${jours} jours. Pensez à le renouveler.`,
  },
  CONTRACT_ANNIVERSARY: {
    key: "CONTRACT_ANNIVERSARY",
    metaName: "terp_emp_contract_anniversary_v1",
    variables: ["nom", "annees"],
    render: ({ nom, annees }) =>
      `Bonjour ${nom}, vous fêtez aujourd'hui ${annees} ans chez BatimCAM. Merci pour votre engagement !`,
  },
  SITE_CHANGE: {
    key: "SITE_CHANGE",
    metaName: "terp_emp_site_change_v1",
    variables: ["nom", "nom_chantier", "date"],
    render: ({ nom, nom_chantier, date }) =>
      `Bonjour ${nom}, vous êtes affecté(e) au chantier ${nom_chantier} à partir du ${date}.`,
  },
};

export function getWhatsappTemplate(key: WhatsappTemplateKey): WhatsappTemplate {
  return TEMPLATES[key];
}

export function listWhatsappTemplates(): WhatsappTemplate[] {
  return Object.values(TEMPLATES);
}

export interface SendWhatsappArgs {
  templateKey: WhatsappTemplateKey;
  toUserId: string;
  toPhone: string;
  variables: Record<string, string>;
  /** Lien profond ouvrant la PWA (`/employe/...`) — utile pour l'item interactif */
  deepLink?: string;
}

export interface SendWhatsappResult {
  ok: boolean;
  templateKey: WhatsappTemplateKey;
  toPhone: string;
  renderedBody: string;
  /** Référence simulée du provider (réutilisée pour le suivi) */
  providerRef: string;
}

/**
 * Stub d'envoi WhatsApp Business — log + persistance d'une Notification.
 *
 * En production, remplacer le corps par un appel HTTPS POST sur l'API Meta
 * Cloud (`/v17.0/{phone_number_id}/messages`) avec authentification Bearer.
 */
export async function sendWhatsappTemplate(args: SendWhatsappArgs): Promise<SendWhatsappResult> {
  const template = TEMPLATES[args.templateKey];
  if (!template) throw new Error(`Template WhatsApp inconnu : ${args.templateKey}`);

  const missing = template.variables.filter((v) => !(v in args.variables));
  if (missing.length > 0) {
    throw new Error(`Variables WhatsApp manquantes pour ${args.templateKey} : ${missing.join(", ")}`);
  }

  const renderedBody = template.render(args.variables);
  const providerRef = `wa_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[WhatsApp][stub] → ${args.toPhone} · ${template.metaName} · ${providerRef}`);
  console.log(`  Body: ${renderedBody}`);

  // Trace dans Notification (utile pour l'historique et les KPI Bloc 1+)
  try {
    await prisma.notification.create({
      data: {
        userId: args.toUserId,
        type: `whatsapp:${template.key.toLowerCase()}`,
        title: template.metaName,
        body: renderedBody,
        link: args.deepLink ?? null,
      },
    });
  } catch (err) {
    console.warn("[WhatsApp][stub] Notification non persistée :", (err as Error).message);
  }

  return { ok: true, templateKey: args.templateKey, toPhone: args.toPhone, renderedBody, providerRef };
}
