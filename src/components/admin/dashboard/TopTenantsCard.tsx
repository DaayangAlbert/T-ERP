import Link from "next/link";

interface Item {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  planCode: string;
  planName: string;
  mrrXAF: number;
}

function formatMoney(xaf: number): string {
  if (xaf >= 1_000_000) return `${(xaf / 1_000_000).toFixed(2)} M`;
  if (xaf >= 1_000) return `${Math.round(xaf / 1_000)} K`;
  return String(xaf);
}

export function TopTenantsCard({ items }: { items: Item[] }) {
  return (
    <section
      className="rounded-xl border p-4"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Top 5 tenants par MRR</h3>
        <Link
          href="/admin/tenants"
          className="text-xs text-cyan-300 hover:text-cyan-200"
        >
          Tous les tenants →
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="text-xs text-white/60">Aucun tenant actif.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li
              key={it.tenantId}
              className="flex items-center gap-3 rounded-md px-3 py-2"
              style={{ background: "#0F172A" }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400/15 text-[11px] font-bold text-cyan-300">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{it.name}</div>
                <div className="text-[11px] text-white/55">
                  {it.slug}.terpgroup.com · {it.planName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums text-cyan-300">
                  {formatMoney(it.mrrXAF)} XAF
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/45">
                  {it.status}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
