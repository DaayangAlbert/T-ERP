interface Props {
  activeTenants: number;
  uptime: number;
}

export function AdminHeaderBanner({ activeTenants, uptime }: Props) {
  return (
    <div
      className="overflow-hidden rounded-xl border p-5 text-white"
      style={{
        background: "linear-gradient(135deg, #0B1322 0%, #134E4A 60%, #22D3EE 200%)",
        borderColor: "#1E293B",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            Console plateforme · production
          </div>
          <div className="mt-1 text-base font-semibold md:text-lg">
            {activeTenants} tenants actifs · monitorés 24/7
          </div>
          <p className="mt-1 text-xs text-white/70">
            Bonjour {greetByHour()}, voici l&apos;état temps réel de la plateforme.
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: "rgba(34,197,94,0.18)", color: "#86EFAC" }}
        >
          ● Tous services UP · {uptime.toFixed(2)} % SLA 30j
        </span>
      </div>
    </div>
  );
}

function greetByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "bonne matinée";
  if (h < 18) return "bon après-midi";
  return "bonne soirée";
}
