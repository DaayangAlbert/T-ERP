import { useMemo, useState } from "react";
import { Clock, Download, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const d = toDate(value);
  if (!d) return "--";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function downloadCsv(filename, rows, columns) {
  const escape = (v) => {
    const raw = String(v ?? "");
    return /[";\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  const header = columns.map((c) => escape(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => escape(c.get(r))).join(";")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const ENTRY_TYPES = [
  { value: "presence", label: "Présence", color: "success" },
  { value: "absence", label: "Absence", color: "danger" },
  { value: "overtime", label: "Heure supplémentaire", color: "warning" },
  { value: "late", label: "Retard", color: "info" },
];

const FORM_ENTRY_TYPES = [
  { value: "presence", label: "Présence" },
  { value: "absence", label: "Absence" },
];

function entryTypeLabel(value) {
  return ENTRY_TYPES.find((t) => t.value === value)?.label ?? value;
}
function entryTypeColor(value) {
  return ENTRY_TYPES.find((t) => t.value === value)?.color ?? "neutral";
}

function formatTime(value) {
  if (!value) return "--";
  return String(value).slice(0, 5);
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${accent}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-current/20 bg-current/10 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ProjectsPresencePanel({
  t,
  presenceItems = [],
  presenceForm,
  setPresenceForm,
  saving,
  createPresenceEntry,
  createPresenceEntries = null,
  onUpdatePresenceEntry = null,
  onDeletePresenceEntry = null,
  assignmentItems = [],
  renderSectionHeader,
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [workerDrafts, setWorkerDrafts] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Summary counts
  const totalPresence = presenceItems.filter((r) => r.entry_type === "presence").length;
  const totalAbsence = presenceItems.filter((r) => r.entry_type === "absence").length;
  const totalOvertime = presenceItems
    .filter((r) => r.entry_type === "overtime")
    .reduce((sum, r) => sum + Number(r.extra_hours || 0), 0);

  // Worker options from team assignments
  const workerOptions = useMemo(() => {
    const seen = new Set();
    return (assignmentItems || [])
      .filter((a) => a.user?.id)
      .filter((a) => {
        if (seen.has(a.user.id)) return false;
        seen.add(a.user.id);
        return true;
      })
      .map((a) => ({ id: a.user.id, label: a.user.full_name || `User #${a.user.id}` }));
  }, [assignmentItems]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = fromDate ? toDate(`${fromDate}T00:00:00`) : null;
    const toValue = toDateFilter ? toDate(`${toDateFilter}T23:59:59`) : null;

    return [...presenceItems]
      .sort((a, b) => {
        const ad = new Date(a.work_date || a.created_at || 0).getTime();
        const bd = new Date(b.work_date || b.created_at || 0).getTime();
        return bd - ad;
      })
      .filter((r) => {
        if (typeFilter !== "all" && r.entry_type !== typeFilter) return false;
        const rowDate = toDate(r.work_date);
        if (from && (!rowDate || rowDate < from)) return false;
        if (toValue && (!rowDate || rowDate > toValue)) return false;
        if (q) {
          const search = `${r.worker_name || ""} ${entryTypeLabel(r.entry_type)} ${r.notes || ""} ${r.work_date || ""}`.toLowerCase();
          if (!search.includes(q)) return false;
        }
        return true;
      });
  }, [presenceItems, typeFilter, fromDate, toDateFilter, query]);

  const exportCsv = () => {
    downloadCsv("presence-chantier.csv", filteredRows, [
      { label: "Date", get: (r) => formatDate(r.work_date) },
      { label: "Ouvrier", get: (r) => r.worker_name || "--" },
      { label: "Type", get: (r) => entryTypeLabel(r.entry_type) },
      { label: "Arrivée", get: (r) => formatTime(r.arrival_time) },
      { label: "Départ", get: (r) => formatTime(r.departure_time) },
      { label: "Heures travaillées", get: (r) => r.hours_worked ?? "--" },
      { label: "Heures en moins", get: (r) => r.missing_hours ?? "--" },
      { label: "Heures supp. (jour)", get: (r) => r.extra_hours ?? "--" },
      { label: "Heures supp. (semaine)", get: (r) => r.weekly_extra_hours ?? "--" },
      { label: "Notes", get: (r) => r.notes || "" },
    ]);
  };

  const toggleWorker = (id) => {
    setSelectedWorkerIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((x) => x !== id);
      }
      setWorkerDrafts((current) => {
        if (current[id]) return current;
        return {
          ...current,
          [id]: {
            work_date: String(new Date().toISOString().slice(0, 10)),
            entry_type: "presence",
            arrival_time: "07:30",
            departure_time: "15:30",
            notes: "",
          },
        };
      });
      return [...prev, id];
    });
  };

  const toggleAllWorkers = () => {
    setSelectedWorkerIds((prev) => {
      if (prev.length === workerOptions.length) {
        return [];
      }
      const allIds = workerOptions.map((w) => w.id);
      setWorkerDrafts((current) => {
        const next = { ...current };
        for (const wid of allIds) {
          if (!next[wid]) {
            next[wid] = {
              work_date: String(new Date().toISOString().slice(0, 10)),
              entry_type: "presence",
              arrival_time: "07:30",
              departure_time: "15:30",
              notes: "",
            };
          }
        }
        return next;
      });
      return allIds;
    });
  };

  const updateWorkerDraft = (workerId, key, value) => {
    setWorkerDrafts((prev) => ({
      ...prev,
      [workerId]: {
        ...(prev[workerId] || {
          work_date: String(new Date().toISOString().slice(0, 10)),
          entry_type: "presence",
          arrival_time: "07:30",
          departure_time: "15:30",
          notes: "",
        }),
        [key]: value,
      },
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if ((!createPresenceEntry && !createPresenceEntries) || selectedWorkerIds.length === 0) return;
    const missingDateWorker = selectedWorkerIds.find((wid) => !(workerDrafts[wid]?.work_date || "").trim());
    if (missingDateWorker) {
      const label = workerOptions.find((w) => w.id === missingDateWorker)?.label || `#${missingDateWorker}`;
      window.alert(`Veuillez renseigner la date pour ${label}.`);
      return;
    }
    const invalidTimeWorker = selectedWorkerIds.find((wid) => {
      const draft = workerDrafts[wid] || {};
      if ((draft.entry_type || "presence") === "absence") return false;
      const arrival = String(draft.arrival_time || "").trim();
      const departure = String(draft.departure_time || "").trim();
      return !arrival || !departure || departure <= arrival;
    });
    if (invalidTimeWorker) {
      const label = workerOptions.find((w) => w.id === invalidTimeWorker)?.label || `#${invalidTimeWorker}`;
      window.alert(`Renseigne une heure d'arrivée et de départ valide pour ${label}.`);
      return;
    }
    try {
      setIsSaving(true);
      const entriesPayload = [];
      for (const wid of selectedWorkerIds) {
        const draft = workerDrafts[wid] || {};
        entriesPayload.push({
          worker_user_id: wid,
          work_date: draft.work_date || null,
          entry_type: draft.entry_type || "presence",
          arrival_time: draft.entry_type === "absence" ? null : (draft.arrival_time || null),
          departure_time: draft.entry_type === "absence" ? null : (draft.departure_time || null),
          notes: draft.notes?.trim() || null,
        });
      }

      if (createPresenceEntries) {
        await createPresenceEntries(entriesPayload);
      } else {
        for (const payload of entriesPayload) {
          await createPresenceEntry(payload);
        }
      }

      setShowForm(false);
      setSelectedWorkerIds([]);
      setWorkerDrafts({});
      setPresenceForm?.((prev) => ({ ...prev, work_date: "", arrival_time: "", departure_time: "", notes: "" }));
    } catch {
      // error handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!onUpdatePresenceEntry || !editingEntry) return;
    const form = new FormData(event.currentTarget);
    const nextType = String(form.get("entry_type") || "presence");
    const nextArrival = String(form.get("arrival_time") || "").trim();
    const nextDeparture = String(form.get("departure_time") || "").trim();
    if (nextType !== "absence" && (!nextArrival || !nextDeparture || nextDeparture <= nextArrival)) {
      window.alert("Renseigne une heure d'arrivée et de départ valide.");
      return;
    }
    try {
      setBusyId(editingEntry.id);
      await onUpdatePresenceEntry(editingEntry.id, {
        entry_type: nextType,
        work_date: String(form.get("work_date") || ""),
        arrival_time: nextType === "absence" ? null : (nextArrival || null),
        departure_time: nextType === "absence" ? null : (nextDeparture || null),
        notes: String(form.get("notes") || "").trim() || null,
      });
      setEditingEntry(null);
    } catch (error) {
      window.alert(error?.response?.data?.message || "Impossible de modifier cette saisie.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row) => {
    if (!onDeletePresenceEntry) return;
    if (!window.confirm(`Supprimer la saisie de présence du ${formatDate(row.work_date)} ?`)) return;
    try {
      setBusyId(row.id);
      await onDeletePresenceEntry(row.id);
    } catch (error) {
      window.alert(error?.response?.data?.message || "Impossible de supprimer cette saisie.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="space-y-6">
      {renderSectionHeader({
        eyebrow: "Présence",
        title: "Suivi de présence",
        description: "Enregistrez les heures de travail, absences et heures supplémentaires des ouvriers du chantier.",
        meta: <Badge variant="neutral">{presenceItems.length}</Badge>,
      })}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={UserCheck} label="Jours de présence" value={totalPresence} accent="border-emerald-200 text-emerald-700" />
        <SummaryCard icon={UserX} label="Absences" value={totalAbsence} accent="border-rose-200 text-rose-700" />
        <SummaryCard icon={Clock} label="Heures supp. cumulées" value={`${totalOvertime} h`} accent="border-amber-200 text-amber-700" />
      </div>

      {/* Add entry button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Saisies enregistrées</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une saisie
        </button>
      </div>

      {/* Add form */}
      {showForm ? (
        <form
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={handleCreate}
        >
          <p className="mb-3 text-sm font-semibold text-slate-800">Nouvelle saisie de présence</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-2 md:col-span-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Ouvriers {selectedWorkerIds.length > 0 && <span className="ml-1 text-emerald-600">({selectedWorkerIds.length} sélectionné{selectedWorkerIds.length > 1 ? "s" : ""})</span>}
                </label>
                <button
                  type="button"
                  onClick={toggleAllWorkers}
                  className="text-xs font-medium text-emerald-600 hover:underline"
                >
                  {selectedWorkerIds.length === workerOptions.length && workerOptions.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <div className="max-h-[130px] overflow-auto rounded-md border border-slate-300 bg-white p-2 space-y-0.5">
                {workerOptions.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-slate-400">Aucun ouvrier affecté à ce projet</p>
                ) : (
                  workerOptions.map((w) => (
                    <label
                      key={w.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkerIds.includes(w.id)}
                        onChange={() => toggleWorker(w.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                      />
                      {w.label}
                    </label>
                  ))
                )}
              </div>
            </div>
            {selectedWorkerIds.map((workerId) => {
              const worker = workerOptions.find((w) => w.id === workerId);
              const draft = workerDrafts[workerId] || {
                work_date: String(new Date().toISOString().slice(0, 10)),
                entry_type: "presence",
                arrival_time: "07:30",
                departure_time: "15:30",
                notes: "",
              };

              return (
                <div key={workerId} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2 md:col-span-3">
                  <p className="text-sm font-semibold text-slate-700">{worker?.label || `Ouvrier #${workerId}`}</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date</label>
                      <Input
                        type="date"
                        required
                        value={draft.work_date || ""}
                        onChange={(e) => updateWorkerDraft(workerId, "work_date", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Type</label>
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={draft.entry_type || "presence"}
                        onChange={(e) => updateWorkerDraft(workerId, "entry_type", e.target.value)}
                      >
                        {FORM_ENTRY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Heure d'arrivée</label>
                      <Input
                        type="time"
                        value={draft.arrival_time || ""}
                        onChange={(e) => updateWorkerDraft(workerId, "arrival_time", e.target.value)}
                        disabled={draft.entry_type === "absence"}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Heure de départ</label>
                      <Input
                        type="time"
                        value={draft.departure_time || ""}
                        onChange={(e) => updateWorkerDraft(workerId, "departure_time", e.target.value)}
                        disabled={draft.entry_type === "absence"}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</label>
                      <Input
                        placeholder="Motif, remarque..."
                        value={draft.notes || ""}
                        onChange={(e) => updateWorkerDraft(workerId, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={isSaving || selectedWorkerIds.length === 0}>
              {isSaving ? "Enregistrement..." : `Enregistrer${selectedWorkerIds.length > 1 ? ` (${selectedWorkerIds.length})` : ""}`}
            </Button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {/* Edit inline form */}
      {editingEntry ? (
        <form
          className="rounded-xl border border-sky-200 bg-sky-50 p-4"
          onSubmit={handleUpdate}
        >
          <p className="mb-3 text-sm font-semibold text-sky-800">Modifier la saisie — {editingEntry.worker_name}</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date</label>
              <Input name="work_date" type="date" defaultValue={String(editingEntry.work_date || "").slice(0, 10)} required />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Type</label>
              <select name="entry_type" defaultValue={editingEntry.entry_type || "presence"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                {FORM_ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Heure d'arrivée</label>
              <Input name="arrival_time" type="time" defaultValue={String(editingEntry.arrival_time || "").slice(0, 5)} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Heure de départ</label>
              <Input name="departure_time" type="time" defaultValue={String(editingEntry.departure_time || "").slice(0, 5)} />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</label>
              <Input name="notes" defaultValue={editingEntry.notes || ""} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={busyId === editingEntry.id}>Enregistrer</Button>
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {/* Filters + table */}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto_1fr_auto]">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-slate-200 bg-white pl-9"
              placeholder="Rechercher ouvrier, type, notes..."
            />
          </div>
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">Tous les types</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {/* Date range */}
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border-slate-200 bg-white" />
          <Input type="date" value={toDateFilter} onChange={(e) => setToDateFilter(e.target.value)} className="border-slate-200 bg-white" />
          {/* Export */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filteredRows.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Exporter
          </button>
        </div>

        <div className="max-h-[380px] overflow-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-slate-100/90">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ouvrier</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Arrivée</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Départ</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Heures travaillées</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Heures en moins</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Heures supp.</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.length ? filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-700">{formatDate(row.work_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.worker_name || `#${row.worker_user_id}`}</td>
                  <td className="px-4 py-3">
                    <Badge variant={entryTypeColor(row.entry_type)}>{entryTypeLabel(row.entry_type)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatTime(row.arrival_time)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatTime(row.departure_time)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.hours_worked != null ? `${row.hours_worked} h` : "--"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.missing_hours != null && row.missing_hours > 0 ? (
                      <span className="font-semibold text-rose-700">-{row.missing_hours} h</span>
                    ) : "--"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.extra_hours != null && row.extra_hours > 0 ? (
                      <span className="font-semibold text-amber-700">+{row.extra_hours} h</span>
                    ) : "--"}
                    {row.weekly_extra_hours != null && row.weekly_extra_hours > 0 ? (
                      <div className="text-[11px] text-amber-600">Semaine: +{row.weekly_extra_hours} h</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.notes || "--"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {onUpdatePresenceEntry ? (
                        <button
                          type="button"
                          onClick={() => setEditingEntry(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {onDeletePresenceEntry ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-8 border-rose-200 p-0 text-rose-700 hover:bg-rose-50"
                          disabled={busyId === row.id}
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    Aucune saisie enregistrée pour cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
