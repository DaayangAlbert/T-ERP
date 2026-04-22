import { Badge } from "@/components/ui/badge";
import type { MagasinierProject } from "@/features/magasinier/types";
import { cn } from "@/shared/utils/cn";

interface ProjectSelectorProps {
  projects: MagasinierProject[];
  selectedProjectId: string;
  onSelect: (projectId: string) => void;
}

const statusTone = {
  active: "success",
  watch: "warning",
  critical: "danger",
} as const;

export function ProjectSelector({ projects, selectedProjectId, onSelect }: ProjectSelectorProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-3">
        {projects.map((project) => {
          const active = project.id === selectedProjectId;
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelect(project.id)}
              className={cn(
                "w-[18rem] rounded-[24px] border px-4 py-4 text-left transition",
                active
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.85)] dark:border-teal-400 dark:bg-[linear-gradient(135deg,_rgba(20,184,166,0.3),_rgba(2,6,23,0.96))]"
                  : "border-slate-200 bg-white/85 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={cn("text-xs uppercase tracking-[0.18em]", active ? "text-white/70" : "text-slate-500")}>
                    {project.code}
                  </p>
                  <p className="mt-2 text-base font-semibold">{project.name}</p>
                </div>
                <Badge variant={statusTone[project.status]}>{project.phaseLabel}</Badge>
              </div>
              <p className={cn("mt-3 text-sm", active ? "text-white/80" : "text-slate-600 dark:text-slate-300")}>
                {project.siteLabel}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <p className={cn("text-[11px] uppercase tracking-[0.14em]", active ? "text-white/60" : "text-slate-500")}>
                    Avancement
                  </p>
                  <p className="mt-1 font-semibold">{project.progress}%</p>
                </div>
                <div>
                  <p className={cn("text-[11px] uppercase tracking-[0.14em]", active ? "text-white/60" : "text-slate-500")}>
                    Critiques
                  </p>
                  <p className="mt-1 font-semibold">{project.criticalItems}</p>
                </div>
                <div>
                  <p className={cn("text-[11px] uppercase tracking-[0.14em]", active ? "text-white/60" : "text-slate-500")}>
                    Couverture
                  </p>
                  <p className="mt-1 font-semibold">{project.stockCoverageDays}j</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
