"use client";

import { Role } from "@prisma/client";

const ROLE_INFO: Record<string, { label: string; family: string; description: string }> = {
  DG: { label: "Directeur Général", family: "Direction", description: "Validation finale, accès toutes données, configuration tenant." },
  DAF: { label: "Directeur Administratif et Financier", family: "Direction", description: "Validation N2 paie/dépenses/achats, finance, comptabilité." },
  SG: { label: "Secrétaire Générale", family: "Direction", description: "Documents, courriers, gestion administrative." },
  HR: { label: "Responsable RH", family: "Direction", description: "Validation N1 paie/embauches, dossiers employés, contrats." },
  TECH_DIRECTOR: { label: "Directeur Technique", family: "Production", description: "Stratégie technique, marchés, recrutements ingénieurs." },
  WORKS_DIRECTOR: { label: "Directeur de Travaux", family: "Production", description: "Pilotage projet, budget chantier, équipes." },
  WORKS_MANAGER: { label: "Conducteur de Travaux", family: "Production", description: "Exécution, suivi avancement, reporting." },
  SITE_MANAGER: { label: "Chef de Chantier", family: "Production", description: "Équipes terrain, sécurité, qualité, pointage." },
  WORKER: { label: "Ouvrier", family: "Production", description: "Profil employé : pointage, bulletin, demandes." },
  ACCOUNTANT: { label: "Comptable", family: "Support", description: "Saisie écritures, paie, déclarations sociales et fiscales." },
  LOGISTICS: { label: "Logistique", family: "Support", description: "Achats, fournisseurs, BC, livraisons." },
  WAREHOUSE: { label: "Magasinier", family: "Support", description: "Stocks matériel, mouvements, inventaires." },
  GED: { label: "Gestionnaire documentaire", family: "Support", description: "Archivage, classement, indexation OCR." },
  EMPLOYEE: { label: "Employé bureau", family: "Support", description: "Profil minimal : son dossier, messagerie, validations qui le concernent." },
  TENANT_ADMIN: { label: "Informaticien d'entreprise", family: "Admin", description: "Sécurité, comptes, configuration tenant, support utilisateurs." },
  CANDIDATE: { label: "Candidat", family: "Externe", description: "Portail emploi, candidatures, suivi dossier." },
  SUPER_ADMIN: { label: "Super-admin SaaS", family: "Plateforme", description: "Console plateforme T-ERP (multi-tenant)." },
};

export function RolesPanel() {
  const families = ["Direction", "Production", "Support", "Admin", "Externe"];
  return (
    <div className="space-y-4">
      {families.map((fam) => (
        <section key={fam} className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-700">{fam}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_INFO)
              .filter(([, v]) => v.family === fam)
              .map(([k, info]) => (
                <li key={k} className="rounded-lg border border-line bg-surface-alt p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-ink">{info.label}</span>
                    <span className="rounded bg-primary-50 px-1 py-0.5 font-mono text-[10px] text-primary-700">
                      {Object.values(Role).includes(k as Role) ? k : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-3">{info.description}</p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
