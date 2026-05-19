"use client";

import { useQuery } from "@tanstack/react-query";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Surcouche de comptes "live" pour la sidebar — synchronisés avec le backend.
 *
 * Retourne une map `{ href -> { value, alert? } }` que la Sidebar superpose aux
 * badges statiques de `sidebar-sections.ts`. Quand un href apparaît ici, sa
 * valeur écrase le placeholder statique. Si la valeur est `null`, le badge
 * disparaît (pas d'alerte rouge sur "0").
 *
 * Approche pragmatique : on n'expose qu'un sous-ensemble de hrefs au début.
 * Ajouter une nouvelle métrique = ajouter une entrée dans la map ci-bas.
 *
 * Toutes les requêtes sont conditionnées par le rôle : un DAF ne déclenche pas
 * de fetch pour le compte DG, etc.
 */
export type SidebarBadge = { value: string; alert?: boolean };

export function useSidebarBadges(): Record<string, SidebarBadge | null> {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;

  const dgPending = useQuery({
    queryKey: ["sidebar-badge", "dg", "validations-pending"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/validations?status=pending`, { credentials: "same-origin" });
      if (!res.ok) return { summary: { total: 0 } };
      return res.json() as Promise<{ summary: { total: number } }>;
    },
    enabled: role === Role.DG || role === Role.TENANT_ADMIN,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    select: (d) => d.summary.total,
  });

  const sgBadges = useQuery({
    queryKey: ["sidebar-badge", "sg", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/sg/sidebar-badges`, { credentials: "same-origin" });
      if (!res.ok) {
        return {
          activeContracts: 0,
          daysToNextMeeting: null,
          activeCases: 0,
          correspondencesPending: 0,
        };
      }
      return res.json() as Promise<{
        activeContracts: number;
        daysToNextMeeting: number | null;
        activeCases: number;
        correspondencesPending: number;
      }>;
    },
    // Le TENANT_ADMIN n'a pas accès au module SG (matrice RBAC retourne 403)
    // — on ne fetch que pour SECRETARY_GENERAL pour éviter le spam 403 console.
    enabled: role === Role.SECRETARY_GENERAL,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Compteurs "rapports techniques" — actif pour tous les rôles auteurs/validateurs
  const reportsBadges = useQuery({
    queryKey: ["sidebar-badge", "reports", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/reports/sidebar-badges`, { credentials: "same-origin" });
      if (!res.ok) return {} as Record<string, number>;
      return res.json() as Promise<Record<string, number>>;
    },
    enabled: !!role,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const map: Record<string, SidebarBadge | null> = {};

  if (typeof dgPending.data === "number") {
    map["/direction-generale/validations"] =
      dgPending.data > 0 ? { value: String(dgPending.data), alert: true } : null;
  }

  if (reportsBadges.data) {
    const r = reportsBadges.data;
    // DTrav : compteurs CC + CDT à valider
    map["/directeur-travaux/validations"] =
      r.dtravValidationsCc && r.dtravValidationsCc > 0
        ? { value: String(r.dtravValidationsCc), alert: r.dtravValidationsCc >= 5 }
        : null;
    map["/directeur-travaux/rapports-cdt"] =
      r.dtravValidationsCdt && r.dtravValidationsCdt > 0
        ? { value: String(r.dtravValidationsCdt), alert: r.dtravValidationsCdt >= 3 }
        : null;
    // DG : compteurs DT + DTrav + QHSE à valider
    map["/direction-generale/rapports-dt"] =
      r.dgValidationsDt && r.dgValidationsDt > 0
        ? { value: String(r.dgValidationsDt), alert: true }
        : null;
    map["/direction-generale/rapports-dtrav"] =
      r.dgValidationsDtrav && r.dgValidationsDtrav > 0
        ? { value: String(r.dgValidationsDtrav), alert: true }
        : null;
    map["/direction-generale/rapports-qhse"] =
      r.dgValidationsQhse && r.dgValidationsQhse > 0
        ? { value: String(r.dgValidationsQhse), alert: true }
        : null;
    // Auteurs : compteurs "à reprendre" (REJECTED)
    map["/chef-chantier/rapports"] =
      r.ccMyRejected && r.ccMyRejected > 0
        ? { value: String(r.ccMyRejected), alert: true }
        : null;
    map["/conducteur-travaux/rapports"] =
      r.cdtMyRejected && r.cdtMyRejected > 0
        ? { value: String(r.cdtMyRejected), alert: true }
        : null;
    map["/direction-technique/rapports-mensuels"] =
      r.dtMyRejected && r.dtMyRejected > 0
        ? { value: String(r.dtMyRejected), alert: true }
        : null;
    map["/direction-technique/rapports-qhse"] =
      r.qhseMyRejected && r.qhseMyRejected > 0
        ? { value: String(r.qhseMyRejected), alert: true }
        : null;
    map["/directeur-travaux/rapports-mensuels"] =
      r.dtravMyRejected && r.dtravMyRejected > 0
        ? { value: String(r.dtravMyRejected), alert: true }
        : null;
  }

  if (sgBadges.data) {
    const d = sgBadges.data;
    map["/secretaire-general/marches"] =
      d.activeContracts > 0 ? { value: String(d.activeContracts), alert: false } : null;
    map["/secretaire-general/gouvernance"] =
      d.daysToNextMeeting !== null
        ? { value: `${d.daysToNextMeeting}j`, alert: d.daysToNextMeeting <= 30 }
        : null;
    map["/secretaire-general/contentieux"] =
      d.activeCases > 0 ? { value: String(d.activeCases), alert: true } : null;
    map["/secretaire-general/courriers"] =
      d.correspondencesPending > 0
        ? { value: String(d.correspondencesPending), alert: d.correspondencesPending >= 5 }
        : null;
  }

  return map;
}
