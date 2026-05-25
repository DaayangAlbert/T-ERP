"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Search, Phone, Mail, ChevronRight, Users, UserSearch } from "lucide-react";
import { roleLabel, STATUS_CFG } from "./roleLabels";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  position: string | null;
  tenant: { id: string; name: string; slug: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Payload {
  items: UserRow[];
  page: number;
  totalPages: number;
  total: number;
  summary: { employees: number; candidates: number; total: number };
}

type Kind = "all" | "employees" | "candidates";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Jamais";

export function PlatformUsersClient() {
  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [kind, debounced, status]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const sp = new URLSearchParams({ kind, page: String(page) });
    if (debounced) sp.set("q", debounced);
    if (status) sp.set("status", status);
    fetch(`/api/admin/platform-users?${sp}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => { if (!cancel) setData(d); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [kind, debounced, status, page]);

  const TABS: { key: Kind; label: string; icon: typeof Users }[] = [
    { key: "all", label: "Tous", icon: Users },
    { key: "employees", label: "Employés", icon: Users },
    { key: "candidates", label: "Chercheurs d'emploi", icon: UserSearch },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = t.key === "employees" ? data?.summary.employees : t.key === "candidates" ? data?.summary.candidates : data?.summary.total;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setKind(t.key)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
                kind === t.key ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-white/70 hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
              {count !== undefined && <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email, téléphone…"
            className="h-10 w-full rounded-lg border bg-transparent pl-10 pr-3 text-sm text-white placeholder:text-white/40"
            style={{ borderColor: "#334155" }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border bg-transparent px-3 text-sm text-white"
          style={{ borderColor: "#334155" }}
        >
          <option value="" className="bg-slate-800">Tous statuts</option>
          <option value="ACTIVE" className="bg-slate-800">Actif</option>
          <option value="INACTIVE" className="bg-slate-800">Inactif</option>
          <option value="SUSPENDED" className="bg-slate-800">Suspendu</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ background: "#1E293B", borderColor: "#334155" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-white/45">
              <tr className="border-b" style={{ borderColor: "#334155" }}>
                <th className="px-4 py-2 font-semibold">Utilisateur</th>
                <th className="px-4 py-2 font-semibold">Rôle</th>
                <th className="px-4 py-2 font-semibold">Société</th>
                <th className="px-4 py-2 font-semibold">Contact</th>
                <th className="px-4 py-2 font-semibold">Statut</th>
                <th className="px-4 py-2 font-semibold">Dernière connexion</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">Chargement…</td></tr>
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">Aucun utilisateur.</td></tr>
              ) : (
                data.items.map((u) => {
                  const sc = STATUS_CFG[u.status] ?? STATUS_CFG.ACTIVE;
                  return (
                    <tr key={u.id} className="border-b last:border-b-0" style={{ borderColor: "#1F2937" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-[10px] font-bold uppercase text-cyan-300">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">{u.firstName} {u.lastName}</div>
                            <div className="truncate text-[11px] text-white/50">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/80">{roleLabel(u.role)}</td>
                      <td className="px-4 py-3 text-white/70">{u.tenant?.name ?? <span className="text-white/35">— (hors société)</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.phone && (
                            <a href={`tel:${u.phone.replace(/\s/g, "")}`} title={u.phone} className="text-cyan-300 hover:text-cyan-200"><Phone className="h-3.5 w-3.5" /></a>
                          )}
                          <a href={`mailto:${u.email}`} title={u.email} className="text-white/50 hover:text-white"><Mail className="h-3.5 w-3.5" /></a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{fmtDate(u.lastLoginAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/users/${u.id}`} className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10">
                          Détails <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{data.total} utilisateur{data.total > 1 ? "s" : ""}</span>
          <div className="inline-flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-2 py-1 disabled:opacity-30" style={{ borderColor: "#334155" }}>Précédent</button>
            <span>Page {data.page} / {data.totalPages}</span>
            <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-2 py-1 disabled:opacity-30" style={{ borderColor: "#334155" }}>Suivant</button>
          </div>
        </div>
      )}
    </div>
  );
}
