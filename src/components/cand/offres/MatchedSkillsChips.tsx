import { Check, AlertTriangle } from "lucide-react";

interface Props {
  matched: string[];
  missing: string[];
}

export function MatchedSkillsChips({ matched, missing }: Props) {
  if (matched.length === 0 && missing.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {matched.map((s) => (
        <span
          key={`m-${s}`}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
        >
          <Check className="h-3 w-3" /> {s}
        </span>
      ))}
      {missing.map((s) => (
        <span
          key={`x-${s}`}
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
          title="Compétence attendue manquante"
        >
          <AlertTriangle className="h-3 w-3" /> {s}
        </span>
      ))}
    </div>
  );
}
