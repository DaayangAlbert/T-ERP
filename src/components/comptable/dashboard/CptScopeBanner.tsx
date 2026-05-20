import { Eye, MapPin } from "lucide-react";

interface Props {
  isDirection: boolean;
  label: string;
  sites: Array<{ id: string; code: string; name: string }>;
  cumulatedBudget: number;
}

export function CptScopeBanner({ isDirection, label, sites, cumulatedBudget }: Props) {
  const Icon = isDirection ? Eye : MapPin;
  return (
    <section
      className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3 text-[12.5px]"
      data-testid="cpt-scope-banner"
    >
      <div className="flex items-center gap-2 font-medium text-primary-700">
        <Icon className="h-4 w-4" /> {label}
      </div>
      {!isDirection && sites.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sites.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-primary-300 bg-white px-2 py-0.5 text-[11.5px] font-medium text-primary-700"
            >
              {s.code} · {s.name}
            </span>
          ))}
        </div>
      )}
      <span className="ml-auto text-ink-3">
        {new Intl.NumberFormat("fr-FR").format(Math.round(cumulatedBudget))} FCFA cumulés
      </span>
    </section>
  );
}
