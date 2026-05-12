import { CheckCircle2, XCircle, Users2 } from "lucide-react";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  presentToday: boolean;
  arrivalTime: string | null;
  absentReason: string | null;
}

interface Props {
  team: {
    specialty: string;
    totalCount: number;
    presentCount: number;
    members: TeamMember[];
  };
}

function formatHm(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

const MAX_VISIBLE = 4;

/**
 * Liste équipe visible UNIQUEMENT pour les chefs d'équipe (teamLeader=true).
 * Items 68 px de haut, avatars 44×44, lignes cliquables vers la fiche
 * pointage du membre (route fn 1.4 EMP).
 */
export function MyTeamList({ team }: Props) {
  const visible = team.members.slice(0, MAX_VISIBLE);
  const remaining = team.totalCount - visible.length;

  return (
    <section className="mt-6 mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
          Mon équipe {team.specialty.charAt(0).toUpperCase() + team.specialty.slice(1)}
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
          <Users2 className="h-3 w-3" />
          {team.totalCount} ouvriers · {team.presentCount} présents
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <ul className="divide-y divide-line">
          {visible.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-ink-3">
              Aucun membre identifié sur le chantier.
            </li>
          )}
          {visible.map((m) => (
            <li
              key={m.id}
              className="flex min-h-[68px] items-center gap-3 px-4 py-3"
              data-testid="emp-team-member"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  m.presentToday ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {initials(m.firstName, m.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {m.firstName} {m.lastName}
                </p>
                <p className="truncate text-[11px] text-ink-3">
                  {m.position ?? "—"}
                </p>
              </div>
              <div className="text-right text-xs">
                {m.presentToday ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {m.arrivalTime ? `présent ${formatHm(m.arrivalTime)}` : "présent"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <XCircle className="h-4 w-4" />
                    absent
                  </span>
                )}
                {m.absentReason && (
                  <p className="mt-0.5 text-[10px] text-ink-3">{m.absentReason}</p>
                )}
              </div>
            </li>
          ))}
          {remaining > 0 && (
            <li className="px-4 py-3 text-center text-xs text-ink-3">
              + {remaining} autre{remaining > 1 ? "s" : ""} membre{remaining > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
