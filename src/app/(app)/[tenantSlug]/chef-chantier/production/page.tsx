"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { postOrQueue } from "@/lib/offline/db";

interface ProductionData {
  report: { id: string; status: string; productionValue: number };
  plannedTasks: Array<{ id: string; name: string }>;
  realizations: Array<{
    id: string;
    designation: string;
    quantity: number;
    unit: string;
    totalValue: number;
    unitPrice: number;
    taskId: string | null;
    teamName: string | null;
  }>;
  consumptions: Array<{
    id: string;
    articleCode: string;
    articleLabel: string;
    quantity: number;
    unit: string;
    source: string | null;
  }>;
}

export default function ProductionPage() {
  const qc = useQueryClient();
  const [addTask, setAddTask] = useState(false);
  const [addConsumption, setAddConsumption] = useState(false);

  const { data } = useQuery({
    queryKey: ["cc", "production-today"],
    queryFn: async () => {
      const res = await fetch("/api/cc/production/today", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<ProductionData>;
    },
  });

  const submit = async () => {
    if (!data) return;
    await postOrQueue(
      "production-queue",
      "/api/cc/production/submit",
      { dailyReportId: data.report.id },
      { priority: "HIGH" }
    );
    qc.invalidateQueries({ queryKey: ["cc", "production-today"] });
  };

  return (
    <div id="screen-cc-production" className="space-y-3 pb-24">
      <header className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <h1 className="truncate text-[16px] font-semibold text-ink">Production journalière</h1>
        <SyncStatusBadge />
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="text-[11px] uppercase tracking-wider text-ink-3">Production du jour</div>
        <div className="mt-1 font-mono text-3xl font-bold text-primary-700">
          {((data?.report.productionValue ?? 0) / 1_000_000).toFixed(2)} M
        </div>
        <div className="text-[11px] text-ink-3">FCFA cumulés</div>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Réalisations du jour
        </h2>
        <div className="space-y-2">
          {data?.realizations.map((r) => (
            <article key={r.id} className="rounded-xl border-l-4 border-l-primary-500 bg-white p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase text-success">✓ Saisi</div>
                  <div className="font-medium text-ink">{r.designation}</div>
                  {r.teamName && <div className="text-[11px] text-ink-3">{r.teamName}</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono text-[14px] font-bold text-primary-700">
                    {(r.totalValue / 1_000_000).toFixed(2)} M
                  </div>
                  <div className="text-[11px] text-ink-3">
                    {r.quantity} {r.unit}
                  </div>
                </div>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={() => setAddTask(true)}
            style={{ minHeight: 64 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-2 bg-white text-[13px] font-medium text-ink-3 hover:border-primary-300 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" /> Ajouter une tâche réalisée
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Consommations matières
        </h2>
        <div className="space-y-2 rounded-xl border border-line bg-white p-3 shadow-card">
          {data?.consumptions.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">Aucune consommation enregistrée.</p>
          ) : (
            <ul className="space-y-1">
              {data?.consumptions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md bg-surface-alt px-2 py-1.5 text-[12.5px]"
                >
                  <span>{c.articleLabel}</span>
                  <span className="font-mono text-ink-2">
                    {c.quantity} {c.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setAddConsumption(true)}
            style={{ minHeight: 48 }}
            className="w-full rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-2"
          >
            + Ajouter conso matière
          </button>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <button
          type="button"
          onClick={submit}
          disabled={!data || data.report.status !== "DRAFT"}
          style={{ minHeight: 56 }}
          className="w-full rounded-lg bg-primary-600 text-[14px] font-bold text-white shadow-md hover:bg-primary-700 disabled:opacity-50"
        >
          {data?.report.status === "SUBMITTED" ? "✓ Rapport soumis" : "Soumettre rapport à P. ETOUNDI"}
        </button>
      </div>

      {addTask && data && (
        <RealizationModal
          dailyReportId={data.report.id}
          plannedTasks={data.plannedTasks}
          onClose={() => setAddTask(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["cc", "production-today"] })}
        />
      )}

      {addConsumption && data && (
        <ConsumptionModal
          dailyReportId={data.report.id}
          onClose={() => setAddConsumption(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["cc", "production-today"] })}
        />
      )}
    </div>
  );
}

function RealizationModal({
  dailyReportId,
  plannedTasks,
  onClose,
  onCreated,
}: {
  dailyReportId: string;
  plannedTasks: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [taskId, setTaskId] = useState("");
  const [designation, setDesignation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("m³");
  const [unitPrice, setUnitPrice] = useState("");

  const totalValue = Math.round((Number(quantity) || 0) * (Number(unitPrice) || 0));

  const submit = async () => {
    await postOrQueue("production-queue", "/api/cc/production/realizations", {
      dailyReportId,
      taskId: taskId || null,
      designation: designation || plannedTasks.find((t) => t.id === taskId)?.name || "Tâche libre",
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
      clientUuid: `${dailyReportId}-${Date.now()}`,
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-[14px] font-semibold text-ink">Tâche réalisée</h2>
          <button type="button" onClick={onClose} className="text-ink-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 space-y-2">
          {plannedTasks.length > 0 && (
            <label className="text-[12px] font-medium text-ink-2">
              Tâche programmée (optionnel)
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                style={{ minHeight: 48, fontSize: 16 }}
                className="mt-1 w-full rounded-md border border-line bg-white px-2"
              >
                <option value="">— Tâche libre —</option>
                {plannedTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-[12px] font-medium text-ink-2">
            Désignation
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Ex : Coffrage pile 4"
              style={{ minHeight: 48, fontSize: 16 }}
              className="mt-1 w-full rounded-md border border-line bg-white px-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[12px] font-medium text-ink-2">
              Quantité
              <input
                type="number"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ minHeight: 48, fontSize: 16 }}
                className="mt-1 w-full rounded-md border border-line bg-white px-2"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              Unité
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ minHeight: 48, fontSize: 16 }}
                className="mt-1 w-full rounded-md border border-line bg-white px-2"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-2">
              P.U. (FCFA)
              <input
                type="number"
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                style={{ minHeight: 48, fontSize: 16 }}
                className="mt-1 w-full rounded-md border border-line bg-white px-2"
              />
            </label>
          </div>
          <div className="rounded-md bg-primary-50 p-2 text-center font-mono text-[16px] font-bold text-primary-700">
            = {totalValue.toLocaleString("fr-FR")} FCFA
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            style={{ minHeight: 48 }}
            className="flex-1 rounded-md border border-line bg-white text-[13px] font-medium"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!quantity || !designation}
            style={{ minHeight: 48 }}
            className="flex-1 rounded-md bg-primary-600 text-[13px] font-bold text-white disabled:opacity-50"
          >
            <Check className="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsumptionModal({
  dailyReportId,
  onClose,
  onCreated,
}: {
  dailyReportId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("sacs");

  const submit = async () => {
    await postOrQueue("production-queue", "/api/cc/production/consumptions", {
      dailyReportId,
      articleCode: code,
      articleLabel: label,
      quantity: Number(quantity),
      unit,
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-[14px] font-semibold text-ink">Consommation matière</h2>
          <button type="button" onClick={onClose} className="text-ink-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 space-y-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code article"
            style={{ minHeight: 48, fontSize: 16 }}
            className="w-full rounded-md border border-line bg-white px-2"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Désignation (Ciment HPC)"
            style={{ minHeight: 48, fontSize: 16 }}
            className="w-full rounded-md border border-line bg-white px-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantité"
              style={{ minHeight: 48, fontSize: 16 }}
              className="rounded-md border border-line bg-white px-2"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unité"
              style={{ minHeight: 48, fontSize: 16 }}
              className="rounded-md border border-line bg-white px-2"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} style={{ minHeight: 48 }} className="flex-1 rounded-md border border-line bg-white text-[13px] font-medium">
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!quantity || !label || !code}
            style={{ minHeight: 48 }}
            className="flex-1 rounded-md bg-primary-600 text-[13px] font-bold text-white disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
