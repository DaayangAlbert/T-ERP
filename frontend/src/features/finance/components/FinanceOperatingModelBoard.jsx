import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  FileText,
  FolderKanban,
  History,
  Landmark,
  Receipt,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/cn";

const MODULE_ICON_MAP = {
  accounting_reporting: Receipt,
  budgeting: Wallet,
  treasury: Landmark,
  payroll_planning: FileText,
  analytics_decision: BarChart3,
  audit_trail: History,
  project_cost_control: FolderKanban,
  payment_delays_btp: AlertTriangle,
  site_reporting: Activity,
};

const MODULE_ACCENT_MAP = {
  accounting_reporting: "border-[#d8e3ff] bg-[#f5f8ff] text-[#2d63f6]",
  budgeting: "border-[#d9efe2] bg-[#f1fbf5] text-[#188b55]",
  treasury: "border-[#d9ecf5] bg-[#f3fbff] text-[#1177a8]",
  payroll_planning: "border-[#ede0ff] bg-[#faf6ff] text-[#7b45d6]",
  analytics_decision: "border-[#ffe7cf] bg-[#fff7ee] text-[#c97815]",
  audit_trail: "border-[#e4e7ec] bg-[#f8fafc] text-[#475467]",
  project_cost_control: "border-[#d8e3ff] bg-[#f5f8ff] text-[#295fb8]",
  payment_delays_btp: "border-[#ffe0dc] bg-[#fff5f4] text-[#d95c4b]",
  site_reporting: "border-[#dbefe8] bg-[#f3fbf8] text-[#1b7a63]",
};

const MODULE_TARGET_MAP = {
  accounting_reporting: { panelId: "dashboard" },
  budgeting: { panelId: "ops", opsPanelId: "budgets" },
  treasury: { panelId: "dashboard" },
  analytics_decision: { panelId: "daf" },
  audit_trail: { panelId: "history" },
  project_cost_control: { panelId: "daf" },
  payment_delays_btp: { panelId: "history" },
};

function prettifyKey(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetricValue(key, value, locale = "fr-FR") {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "string" && value.includes("T") && !Number.isNaN(new Date(value).getTime())) {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  const amount = Number(value);
  if (Number.isFinite(amount)) {
    const moneyLikeKeys = ["amount", "cash", "balance", "margin", "outstanding", "expenses", "revenues", "base", "need"];
    if (moneyLikeKeys.some((token) => key.toLowerCase().includes(token))) {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "XAF",
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `${amount.toLocaleString(locale)} XAF`;
      }
    }
    return amount.toLocaleString(locale);
  }

  return String(value);
}

function formatHistoryAmount(amount, currency = "XAF", locale = "fr-FR") {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toLocaleString(locale)} ${currency}`;
  }
}

function resolveModuleTarget(moduleId, canUseDaf) {
  const target = MODULE_TARGET_MAP[moduleId];
  if (!target) return null;
  if (target.panelId === "daf" && !canUseDaf) {
    return { panelId: "dashboard" };
  }
  return target;
}

export function FinanceOperatingModelBoard({
  operatingModel,
  locale = "fr-FR",
  canUseDaf = false,
  onOpenFinanceTarget,
}) {
  const modules = operatingModel?.modules || [];
  const [activeModuleId, setActiveModuleId] = useState(modules[0]?.id || "");

  useEffect(() => {
    if (!modules.length) {
      setActiveModuleId("");
      return;
    }
    if (!modules.some((module) => module.id === activeModuleId)) {
      setActiveModuleId(modules[0].id);
    }
  }, [activeModuleId, modules]);

  const activeModule = modules.find((module) => module.id === activeModuleId) || modules[0] || null;
  const activeModuleTarget = activeModule ? resolveModuleTarget(activeModule.id, canUseDaf) : null;
  const accentClassName = activeModule ? MODULE_ACCENT_MAP[activeModule.id] || MODULE_ACCENT_MAP.audit_trail : MODULE_ACCENT_MAP.audit_trail;
  const decisionSignals = operatingModel?.decisionSignals || [];

  const relatedHistory = useMemo(() => {
    if (!activeModule) return [];

    const neighbourIds = new Set(
      (activeModule.relatedFlows || []).flatMap((flow) => [flow.from, flow.to]).filter((value) => value && value !== "all"),
    );
    neighbourIds.add(activeModule.id);

    return (operatingModel?.history?.latestEvents || []).filter((item) => neighbourIds.has(item.moduleId)).slice(0, 6);
  }, [activeModule, operatingModel?.history?.latestEvents]);

  if (!activeModule) {
    return null;
  }

  const ActiveIcon = MODULE_ICON_MAP[activeModule.id] || Activity;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Architecture finance</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Vue modulaire interconnectee</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Les nouveaux axes Finance sont visibles ici avec leurs flux de donnees, leurs dependances et les points d'action les plus utiles.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{modules.length} domaine(s)</Badge>
          <Badge variant="neutral">{operatingModel?.flows?.length || 0} flux relies</Badge>
          <Badge variant="neutral">{operatingModel?.history?.totalEvents || 0} evenement(s)</Badge>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#dbe4f0] bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
        <div className="overflow-x-auto px-3 [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#cfd9e8]">
          <div className="flex min-w-max items-stretch gap-1">
            {modules.map((module) => {
              const Icon = MODULE_ICON_MAP[module.id] || Activity;
              const isActive = module.id === activeModuleId;

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className={cn(
                    "inline-flex h-[64px] items-center gap-2 border-b-2 border-transparent px-4 text-[15px] font-semibold transition whitespace-nowrap",
                    isActive ? "border-[#2563eb] text-[#2563eb]" : "text-[#64748b] hover:text-[#0f172a]",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{module.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-4">
          <div className={cn("rounded-[28px] border p-5 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]", accentClassName)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80">
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Module actif</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{activeModule.label}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{activeModule.description}</p>
                </div>
              </div>

              {activeModuleTarget && onOpenFinanceTarget ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/70 bg-white/75 text-slate-900 hover:bg-white"
                  onClick={() => onOpenFinanceTarget(activeModuleTarget)}
                >
                  Ouvrir dans Finance
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(activeModule.snapshot?.counts || {}).map(([key, value]) => (
                <div key={`count-${key}`} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{prettifyKey(key)}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMetricValue(key, value, locale)}</p>
                </div>
              ))}
              {Object.entries(activeModule.snapshot?.kpis || {})
                .slice(0, 4)
                .map(([key, value]) => (
                  <div key={`kpi-${key}`} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{prettifyKey(key)}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{formatMetricValue(key, value, locale)}</p>
                  </div>
                ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sorties du module</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeModule.outputs || []).map((item) => (
                    <Badge key={item} variant="neutral">{prettifyKey(item)}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Points d'interaction</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {(activeModule.interactionPoints || []).slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-current opacity-70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {modules.map((module) => {
              const Icon = MODULE_ICON_MAP[module.id] || Activity;
              const isSelected = module.id === activeModuleId;

              return (
                <button
                  key={`mini-${module.id}`}
                  type="button"
                  onClick={() => setActiveModuleId(module.id)}
                  className={cn(
                    "rounded-[24px] border bg-white px-4 py-4 text-left shadow-[0_16px_35px_-30px_rgba(15,23,42,0.35)] transition",
                    isSelected ? "border-[#2563eb] ring-2 ring-[#2563eb]/10" : "border-[#e4e7ec] hover:border-[#cbd5e1]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <Badge variant="neutral">{module.snapshot?.historyCount || 0}</Badge>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-950">{module.label}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{module.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-[#e4e7ec] bg-white px-5 py-5 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Flux de donnees</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">Connexions du module</h3>
              </div>
              <Badge variant="info">{(activeModule.relatedFlows || []).length}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {(activeModule.relatedFlows || []).map((flow, index) => (
                <div key={`${flow.from}-${flow.to}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-950">
                    <span>{flow.from === "all" ? "Tous les modules" : prettifyKey(flow.from)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    <span>{prettifyKey(flow.to)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{flow.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(flow.payloads || []).slice(0, 3).map((payload) => (
                      <Badge key={payload} variant="neutral">{payload}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e4e7ec] bg-white px-5 py-5 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analyse</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">Signaux de decision</h3>
              </div>
              <Badge variant="warning">{decisionSignals.length}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {decisionSignals.map((signal) => (
                <div key={signal.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{signal.label}</p>
                    <Badge variant={signal.severity === "warning" || signal.severity === "danger" ? "warning" : "neutral"}>
                      {signal.value} {signal.unit}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e4e7ec] bg-white px-5 py-5 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Historique</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">Evenements lies</h3>
              </div>
              <Badge variant="neutral">{relatedHistory.length}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {relatedHistory.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.summary}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        {prettifyKey(item.moduleId)} / {prettifyKey(item.action)}
                      </p>
                    </div>
                    {formatHistoryAmount(item.amount, item.currency, locale) ? (
                      <span className="text-sm font-semibold text-slate-950">{formatHistoryAmount(item.amount, item.currency, locale)}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatMetricValue("occurredAt", item.occurredAt, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
