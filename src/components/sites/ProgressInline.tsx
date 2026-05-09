import { clsx } from "clsx";
import { SiteStatus } from "@prisma/client";

interface Props {
  progress: number;
  status?: SiteStatus;
}

export function ProgressInline({ progress, status }: Props) {
  const tone = pickTone(progress, status);
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 max-w-full overflow-hidden rounded-full bg-line">
        <div className={clsx("h-full rounded-full", tone)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="font-mono text-[11.5px] tabular-nums text-ink-2">{clamped}%</span>
    </div>
  );
}

function pickTone(progress: number, status?: SiteStatus) {
  if (status === SiteStatus.DRIFTING) return "bg-rose-500";
  if (status === SiteStatus.AT_RISK) return "bg-amber-500";
  if (progress >= 80) return "bg-success";
  if (progress >= 50) return "bg-primary-500";
  return "bg-primary-300";
}
