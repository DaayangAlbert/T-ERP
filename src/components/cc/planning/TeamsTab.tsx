"use client";

import { useState } from "react";
import { Plus, Users, Crown, X, Trash2, Power, UserPlus, UserMinus } from "lucide-react";
import { clsx } from "clsx";
import {
  useCcTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAddMember,
  useRemoveMember,
  useSiteWorkforce,
  type TeamItem,
  type WorkforcePerson,
} from "@/hooks/useCcPlanning";
import { useCcSite } from "@/contexts/CcSiteContext";

const COLOR_OPTIONS = [
  "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#a16207", "#475569",
];

export function TeamsTab() {
  const { site } = useCcSite();
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading } = useCcTeams({ includeInactive: showInactive });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);

  const teams = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Inclure les équipes désactivées
        </label>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={!site}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Nouvelle équipe
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : teams.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <Users className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucune équipe constituée</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Créez votre première équipe pour planifier des tâches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} onEdit={() => setEditingTeam(t)} />
          ))}
        </div>
      )}

      {createOpen && site && (
        <CreateTeamModal
          siteId={site.id}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editingTeam && (
        <EditTeamModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
        />
      )}
    </div>
  );
}

function TeamCard({ team, onEdit }: { team: TeamItem; onEdit: () => void }) {
  const color = team.color ?? "#7c3aed";
  return (
    <article
      className={clsx(
        "rounded-xl border bg-white p-3.5 shadow-card transition",
        team.active ? "border-line" : "border-line opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h3 className="truncate text-[14px] font-bold text-ink">{team.name}</h3>
            {!team.active && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                désactivée
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-ink-3">{team.site.code}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-line bg-white px-2 py-1 text-[11.5px] hover:bg-surface-alt"
        >
          Gérer
        </button>
      </header>

      <div className="mt-2.5 flex items-center gap-2 rounded-md bg-violet-50 p-2">
        <Crown className="h-4 w-4 flex-shrink-0 text-violet-600" />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-ink">
            {team.leader.firstName} {team.leader.lastName}
          </p>
          <p className="text-[10.5px] text-ink-3">Chef d&apos;équipe</p>
        </div>
      </div>

      <div className="mt-2.5 space-y-0.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
          Membres ({team.members.length})
        </p>
        {team.members.length === 0 ? (
          <p className="text-[11.5px] italic text-ink-3">Aucun membre — ajoutez-en via « Gérer ».</p>
        ) : (
          <ul className="space-y-0.5">
            {team.members.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between text-[11.5px]">
                <span className="truncate text-ink-2">
                  {m.user.firstName} {m.user.lastName}
                </span>
                {m.role === "DEPUTY" && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700">
                    adjoint
                  </span>
                )}
              </li>
            ))}
            {team.members.length > 5 && (
              <li className="text-[11px] italic text-ink-3">+ {team.members.length - 5} autres...</li>
            )}
          </ul>
        )}
      </div>

      <footer className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[11px] text-ink-3">
        <span>{team.tasksCount} tâche{team.tasksCount > 1 ? "s" : ""}</span>
      </footer>
    </article>
  );
}

function CreateTeamModal({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [leaderId, setLeaderId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const workforce = useSiteWorkforce();
  const create = useCreateTeam();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderId) return alert("Choisissez un chef d'équipe");
    create.mutate(
      { siteId, name, color, leaderId, memberIds },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <ModalShell title="Nouvelle équipe" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom de l'équipe">
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Équipe Coffrage A"
            className={inputCls}
          />
        </Field>
        <Field label="Couleur (UI)">
          <div className="flex flex-wrap gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={clsx(
                  "h-7 w-7 rounded-full transition",
                  color === c ? "ring-2 ring-offset-2 ring-ink" : "opacity-70 hover:opacity-100",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
        <Field label="Chef d'équipe">
          <select
            required
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Sélectionner —</option>
            {(workforce.data?.members ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName} {p.firstName}
                {p.position ? ` — ${p.position}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Membres initiaux (${memberIds.length})`} hint="Le chef d'équipe est ajouté automatiquement.">
          <PeoplePicker
            people={(workforce.data?.members ?? []).filter((p) => p.id !== leaderId)}
            selectedIds={memberIds}
            onChange={setMemberIds}
          />
        </Field>

        {create.error && (
          <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">
            {(create.error as Error).message}
          </p>
        )}

        <ModalActions
          onClose={onClose}
          submitLabel={create.isPending ? "Création..." : "Créer l'équipe"}
          submitDisabled={create.isPending}
        />
      </form>
    </ModalShell>
  );
}

function EditTeamModal({ team, onClose }: { team: TeamItem; onClose: () => void }) {
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.color ?? COLOR_OPTIONS[0]);
  const [leaderId, setLeaderId] = useState(team.leader.id);
  const workforce = useSiteWorkforce();
  const update = useUpdateTeam();
  const del = useDeleteTeam();
  const addMember = useAddMember();
  const removeMember = useRemoveMember();

  const handleSaveMeta = () => {
    update.mutate({ id: team.id, data: { name, color, leaderId } });
  };

  const handleToggleActive = () => {
    update.mutate({ id: team.id, data: { active: !team.active } });
  };

  const handleDelete = () => {
    if (!confirm("Supprimer cette équipe ? (désactivée si des tâches sont liées)")) return;
    del.mutate(team.id, { onSuccess: () => onClose() });
  };

  const memberUserIds = new Set([team.leader.id, ...team.members.map((m) => m.userId)]);
  const candidates = (workforce.data?.members ?? []).filter((p) => !memberUserIds.has(p.id));

  return (
    <ModalShell title={`Gérer · ${team.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Bloc métadonnées */}
        <section className="space-y-3 rounded-lg border border-line bg-surface-alt/40 p-3">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Informations</h3>
          <Field label="Nom">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Couleur">
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx("h-7 w-7 rounded-full", color === c ? "ring-2 ring-offset-2 ring-ink" : "opacity-70")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
          <Field label="Chef d'équipe">
            <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} className={inputCls}>
              {(workforce.data?.members ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={update.isPending}
              className="h-8 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] hover:bg-surface-alt"
            >
              <Power className="h-3.5 w-3.5" />
              {team.active ? "Désactiver" : "Réactiver"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 text-[12px] text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </section>

        {/* Bloc membres */}
        <section className="space-y-3 rounded-lg border border-line bg-surface-alt/40 p-3">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-3">
            Membres ({team.members.length})
          </h3>
          {team.members.length === 0 ? (
            <p className="text-[12px] italic text-ink-3">Aucun membre pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-1">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
                  <span className="text-[12.5px] text-ink-2">
                    {m.user.lastName} {m.user.firstName}
                    {m.role === "DEPUTY" && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700">
                        adjoint
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMember.mutate({ teamId: team.id, userId: m.userId })}
                    className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-rose-50"
                    title="Retirer du groupe"
                  >
                    <UserMinus className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {candidates.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-ink-3">Ajouter un membre</p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded border border-line bg-white p-1">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => addMember.mutate({ teamId: team.id, userId: c.id })}
                      className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11.5px] hover:bg-surface-alt"
                    >
                      <span>{c.lastName} {c.firstName}</span>
                      <UserPlus className="h-3 w-3 text-violet-600" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
}

// ---------- Shared bits ----------
const inputCls =
  "h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[10.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className={clsx("w-full rounded-xl bg-white shadow-2xl", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          <button onClick={onClose} type="button" className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  submitLabel,
  submitDisabled,
}: {
  onClose: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
        Annuler
      </button>
      <button
        type="submit"
        disabled={submitDisabled}
        className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function PeoplePicker({
  people,
  selectedIds,
  onChange,
}: {
  people: WorkforcePerson[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  };
  return (
    <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-white">
      {people.length === 0 ? (
        <p className="p-3 text-[12px] text-ink-3">Aucun collaborateur disponible.</p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-surface-alt">
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} />
                  <span className="text-[12.5px] text-ink-2">{p.lastName} {p.firstName}</span>
                  {p.position && (
                    <span className="ml-auto text-[10.5px] text-ink-3">{p.position}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
