"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Factory,
  HardHat,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { Role } from "@prisma/client";
import { useSitesLookup } from "@/hooks/useWarehouses";
import { formatFCFA } from "@/lib/format";

type Category = "CADRE" | "ETAM" | "OUVRIER" | "EMPLOYE";
type Attachment = "DIRECTION" | "PROJECT" | "BOTH" | "UNATTACHED";

interface PersonItem {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  position: string | null;
  avatarUrl: string | null;
  hireDate: string | null;
  department: string | null;
  professionalCategory: string | null;
  category: Category;
  direction: { code: string; label: string };
  projects: Array<{ id: string; code: string; name: string; asManager: boolean }>;
  baseSalary: string | null;
  attachment: Attachment;
  tenant: { id: string; slug: string; name: string } | null;
}

interface PersonResponse {
  items: PersonItem[];
  summary: {
    headcount: number;
    totalSalary: number;
    byCategory: Record<Category, number>;
    byAttachment: Record<Attachment, number>;
    salaryByAttachment: { DIRECTION: number; PROJECT: number; UNATTACHED: number };
  };
}

const DIRECTION_ROLES: Array<{ value: Role; label: string }> = [
  { value: "DG" as Role, label: "Direction Générale (DG)" },
  { value: "DAF" as Role, label: "Direction Admin. & Financière (DAF)" },
  { value: "HR" as Role, label: "Direction RH" },
  { value: "SECRETARY_GENERAL" as Role, label: "Secrétariat Général" },
  { value: "TECH_DIRECTOR" as Role, label: "Direction Technique" },
  { value: "WORKS_DIRECTOR" as Role, label: "Direction Travaux" },
  { value: "ACCOUNTANT" as Role, label: "Comptabilité" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  CADRE: "Cadre",
  ETAM: "ETAM",
  OUVRIER: "Ouvrier",
  EMPLOYE: "Employé",
};

const ATTACHMENT_BADGE: Record<Attachment, { label: string; tone: string }> = {
  DIRECTION: { label: "Direction", tone: "bg-primary-50 text-primary-700" },
  PROJECT: { label: "Projet", tone: "bg-emerald-50 text-emerald-700" },
  BOTH: { label: "Direction + Projet", tone: "bg-blue-50 text-blue-700" },
  UNATTACHED: { label: "Non rattaché", tone: "bg-amber-50 text-amber-700" },
};

export function PersonnelCoutsPanel() {
  const [role, setRole] = useState<Role | "all">("all");
  const [siteId, setSiteId] = useState<string | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [attachment, setAttachment] = useState<Attachment | "all">("all");

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (role !== "all") sp.set("role", role);
    if (siteId !== "all") sp.set("siteId", siteId);
    if (category !== "all") sp.set("category", category);
    if (attachment !== "all") sp.set("attachment", attachment);
    return sp.toString();
  }, [role, siteId, category, attachment]);

  const { data, isLoading } = useQuery({
    queryKey: ["daf", "personnel-couts", role, siteId, category, attachment],
    queryFn: async (): Promise<PersonResponse> => {
      const res = await fetch(`/api/daf/personnel-couts${qs ? `?${qs}` : ""}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const { data: sitesData } = useSitesLookup();
  const sites = sitesData?.items ?? [];

  const hasFilter = role !== "all" || siteId !== "all" || category !== "all" || attachment !== "all";

  const reset = () => {
    setRole("all");
    setSiteId("all");
    setCategory("all");
    setAttachment("all");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-primary-50/50 px-3 py-2 text-[12px] text-ink-2">
        Liste du personnel avec salaire de base contractuel, rattachement à une
        direction (frais de structure) ou un projet (coût imputable au marché).
        Filtres combinables pour la ventilation analytique.
      </div>

      {/* KPIs */}
      {data && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            icon={<Users className="h-4 w-4" />}
            label="Effectif total"
            value={data.summary.headcount.toString()}
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Masse salariale mensuelle"
            value={formatFCFA(data.summary.totalSalary, { noSuffix: true })}
            unit="FCFA"
            tone="primary"
          />
          <KpiCard
            icon={<Building2 className="h-4 w-4" />}
            label="Coût direction (structure)"
            value={formatFCFA(data.summary.salaryByAttachment.DIRECTION, { noSuffix: true })}
            unit="FCFA"
            tone="violet"
          />
          <KpiCard
            icon={<Factory className="h-4 w-4" />}
            label="Coût projets (imputable)"
            value={formatFCFA(data.summary.salaryByAttachment.PROJECT, { noSuffix: true })}
            unit="FCFA"
            tone="emerald"
          />
        </section>
      )}

      {/* Filtres */}
      <section className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-3">
        <FilterField label="Direction" icon={<Building2 className="h-3.5 w-3.5" />}>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role | "all")}
            className="h-8 w-full max-w-full rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none sm:w-[220px]"
          >
            <option value="all">Toutes les directions</option>
            {DIRECTION_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Chantier" icon={<Factory className="h-3.5 w-3.5" />}>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-8 w-full max-w-full rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none sm:w-[220px]"
          >
            <option value="all">Tous les chantiers ({sites.length})</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Catégorie" icon={<HardHat className="h-3.5 w-3.5" />}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "all")}
            className="h-8 w-full max-w-full rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none sm:w-auto"
          >
            <option value="all">Toutes</option>
            <option value="CADRE">Cadre</option>
            <option value="ETAM">ETAM</option>
            <option value="OUVRIER">Ouvrier</option>
            <option value="EMPLOYE">Employé</option>
          </select>
        </FilterField>

        <FilterField label="Rattachement" icon={<UserCheck className="h-3.5 w-3.5" />}>
          <select
            value={attachment}
            onChange={(e) => setAttachment(e.target.value as Attachment | "all")}
            className="h-8 w-full max-w-full rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none sm:w-auto"
          >
            <option value="all">Tous</option>
            <option value="DIRECTION">Direction uniquement</option>
            <option value="PROJECT">Projet uniquement</option>
            <option value="BOTH">Direction + Projet</option>
            <option value="UNATTACHED">Non rattaché</option>
          </select>
        </FilterField>

        {hasFilter && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-ink-3 hover:bg-surface-alt hover:text-ink"
          >
            <X className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        )}
      </section>

      {/* Alerte non-rattachés */}
      {data && data.summary.byAttachment.UNATTACHED > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <strong>{data.summary.byAttachment.UNATTACHED}</strong>{" "}
            collaborateur{data.summary.byAttachment.UNATTACHED > 1 ? "s" : ""} non
            rattaché{data.summary.byAttachment.UNATTACHED > 1 ? "s" : ""} (ni
            direction, ni projet). À régulariser pour la comptabilité analytique.
          </div>
        </div>
      )}

      {/* Tableau */}
      {isLoading && <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />}

      {!isLoading && data && data.items.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-ink-3" />
          <h3 className="mt-2 text-sm font-semibold text-ink">Aucun collaborateur</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            La sélection actuelle (filtres) ne retourne aucun résultat.
          </p>
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <section className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Collaborateur</th>
                <th className="px-3 py-2 text-left">Fonction</th>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-left">Direction</th>
                <th className="px-3 py-2 text-left">Projets</th>
                <th className="px-3 py-2 text-right">Salaire de base</th>
                <th className="px-3 py-2 text-center">Rattachement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: PersonItem }) {
  const badge = ATTACHMENT_BADGE[person.attachment];
  return (
    <tr className={clsx("hover:bg-surface-alt", person.attachment === "UNATTACHED" && "bg-amber-50/30")}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar firstName={person.firstName} lastName={person.lastName} url={person.avatarUrl} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">
              {person.firstName} {person.lastName}
            </div>
            {person.tenant && (
              <div className="truncate text-[11px] text-ink-3">{person.tenant.name}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-ink-2">
        <div className="font-medium">{person.position ?? "—"}</div>
        {person.professionalCategory && (
          <div className="text-[11px] text-ink-3">{person.professionalCategory}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
          {CATEGORY_LABEL[person.category]}
        </span>
      </td>
      <td className="px-3 py-2 text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Briefcase className="h-3 w-3 text-ink-3" />
          {person.direction.label}
        </span>
      </td>
      <td className="px-3 py-2">
        {person.projects.length === 0 ? (
          <span className="text-[11.5px] italic text-ink-3">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {person.projects.slice(0, 3).map((p) => (
              <span
                key={p.id}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
                  p.asManager
                    ? "bg-primary-50 text-primary-700"
                    : "bg-surface-alt text-ink-2",
                )}
                title={p.asManager ? "Responsable chantier" : "Affecté au chantier"}
              >
                <Factory className="h-2.5 w-2.5" />
                {p.code}
              </span>
            ))}
            {person.projects.length > 3 && (
              <span className="text-[10.5px] text-ink-3">
                +{person.projects.length - 3}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">
        {person.baseSalary ? (
          <span className="font-semibold text-ink">
            {formatFCFA(Number(person.baseSalary))}
          </span>
        ) : (
          <span className="text-[11.5px] italic text-ink-3">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
            badge.tone,
          )}
        >
          {badge.label}
        </span>
      </td>
    </tr>
  );
}

function Avatar({
  firstName,
  lastName,
  url,
}: {
  firstName: string;
  lastName: string;
  url: string | null;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />;
  }
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary-100 text-[10.5px] font-semibold text-primary-700">
      {initials}
    </span>
  );
}

function FilterField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
      <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "primary" | "violet" | "emerald";
}) {
  const toneCls = {
    default: "bg-surface-alt text-ink",
    primary: "bg-primary-50 text-primary-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={clsx("grid h-8 w-8 place-items-center rounded-full", toneCls)}>
          {icon}
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-[20px] font-bold tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-[11px] font-medium text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
