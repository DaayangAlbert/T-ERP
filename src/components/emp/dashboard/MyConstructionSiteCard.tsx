import { Building2, User, HardHat, Users } from "lucide-react";

interface Props {
  site: {
    code: string;
    name: string;
    client: string;
    region: string | null;
    progress: number;
    startDate: string;
    plannedEndDate: string;
    managerName: string | null; // DTrav
    siteManagerName: string | null; // CC
    workforceCount: number;
    presentCount: number;
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Card "Mon chantier" — informations de contexte projet pour l'ouvrier.
 * Barre de progression violette. Lignes superviseurs DTrav + CC + effectif.
 */
export function MyConstructionSiteCard({ site }: Props) {
  const presentLabel = site.workforceCount > 0
    ? `${site.presentCount}/${site.workforceCount} présents`
    : `${site.workforceCount} ouvriers`;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
        Mon chantier · {site.name}
      </h2>
      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{site.name}</p>
            <p className="text-xs text-ink-3">
              {site.code} · {site.client}
              {site.region ? ` · ${site.region}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-ink-3">
              {formatDate(site.startDate)} → {formatDate(site.plannedEndDate)}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-3">Avancement</span>
            <span className="font-semibold text-purple-700">{site.progress}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-purple-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500"
              style={{ width: `${Math.max(0, Math.min(100, site.progress))}%` }}
            />
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-y-1.5 text-xs text-ink-2 sm:grid-cols-2 sm:gap-x-3">
          {site.managerName && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-ink-3" />
              <span className="text-ink-3">DTrav :</span>
              <span className="font-medium text-ink">{site.managerName}</span>
            </div>
          )}
          {site.siteManagerName && (
            <div className="flex items-center gap-2">
              <HardHat className="h-3.5 w-3.5 text-ink-3" />
              <span className="text-ink-3">CC :</span>
              <span className="font-medium text-ink">{site.siteManagerName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 sm:col-span-2">
            <Users className="h-3.5 w-3.5 text-ink-3" />
            <span className="text-ink-3">Équipe :</span>
            <span className="font-medium text-ink">{presentLabel}</span>
          </div>
        </dl>
      </div>
    </section>
  );
}
