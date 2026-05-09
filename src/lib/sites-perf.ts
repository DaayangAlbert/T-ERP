/**
 * Helpers de performance chantier (Phase 2 / Bloc 3 — fn 3.1).
 *
 * Calcule des métriques dérivées : avancement financier vs physique,
 * écart, marge prévue vs réalisée. Le DG s'en sert pour identifier les
 * dérives sans attendre les revues mensuelles.
 */

export interface SitePerfRow {
  id: string;
  code: string;
  name: string;
  client: string;
  status: string;
  region: string | null;
  budget: string;
  progress: number; // physique 0..100
  margin: number; // marge planifiée
  // Dérivées
  financialProgress: number; // % budget consommé (synthétisé : progress * 1.05 si dérive, sinon ~progress)
  variance: number; // écart physique - financier (positif = bon)
  realizedMargin: number; // marge réalisée (synthétisée à partir de la dérive)
  dso: number; // délai paiement client en jours
  hseStatus: "GOOD" | "WATCH" | "INCIDENT";
}

const HSE_BY_STATUS: Record<string, SitePerfRow["hseStatus"]> = {
  ACTIVE: "GOOD",
  AT_RISK: "WATCH",
  DRIFTING: "WATCH",
  COMPLETED: "GOOD",
  PLANNED: "GOOD",
  ON_HOLD: "WATCH",
  ARCHIVED: "GOOD",
};

export function computePerf(site: {
  id: string;
  code: string;
  name: string;
  client: string;
  status: string;
  region: string | null;
  budget: bigint;
  progress: number;
  margin: number;
}): SitePerfRow {
  const isDrifting = site.status === "DRIFTING";
  const isAtRisk = site.status === "AT_RISK";

  const financialProgress = isDrifting
    ? Math.min(100, Math.round(site.progress * 1.18))
    : isAtRisk
    ? Math.min(100, Math.round(site.progress * 1.06))
    : Math.max(0, Math.round(site.progress * 0.98));

  const variance = site.progress - financialProgress;
  const realizedMargin = isDrifting
    ? Number((site.margin - 4.5).toFixed(1))
    : isAtRisk
    ? Number((site.margin - 2.0).toFixed(1))
    : Number((site.margin + 0.4).toFixed(1));

  // DSO synthétisé : marchés publics ~ 60-90j, privés ~ 30-45j
  const isPublic = /minisystèm|min\s|FEICOM|MINHDU|MINTP|commune|mairie/i.test(site.client);
  const dso = isPublic ? 70 + Math.floor(Math.random() * 20) : 35 + Math.floor(Math.random() * 15);

  return {
    id: site.id,
    code: site.code,
    name: site.name,
    client: site.client,
    status: site.status,
    region: site.region,
    budget: site.budget.toString(),
    progress: site.progress,
    margin: site.margin,
    financialProgress,
    variance,
    realizedMargin,
    dso,
    hseStatus: HSE_BY_STATUS[site.status] ?? "GOOD",
  };
}
