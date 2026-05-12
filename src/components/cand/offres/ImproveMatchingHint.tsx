import Link from "next/link";
import { Lightbulb } from "lucide-react";

interface Props {
  completionPct: number;
}

export function ImproveMatchingHint({ completionPct }: Props) {
  if (completionPct >= 95) return null;
  return (
    <div className="rounded-md border border-primary-200 bg-primary-50 p-4">
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-700" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-primary-700">
            Améliorez vos recommandations
          </h4>
          <p className="mt-1 text-xs text-ink-2">
            Votre profil est complété à {completionPct}%. Ajoutez plus de
            compétences et précisez vos critères de recherche pour des offres mieux
            ciblées.
          </p>
          <Link
            href="/cand/profil"
            className="mt-2 inline-block text-xs font-medium text-primary-700 hover:underline"
          >
            Compléter mon profil →
          </Link>
        </div>
      </div>
    </div>
  );
}
