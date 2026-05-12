import { CheckCircle2 } from "lucide-react";

const ITEMS = [
  "Relire l'offre d'emploi et les missions clés",
  "Préparer 3 questions pertinentes pour l'interviewer",
  "Réviser vos expériences les plus récentes et chantiers majeurs",
  "Tester votre liaison visio / itinéraire la veille",
];

export function PreparationChecklist() {
  return (
    <section className="rounded-md bg-emerald-50 p-4">
      <h4 className="text-sm font-semibold text-emerald-800">
        ✓ Préparation suggérée
      </h4>
      <ul className="mt-2 space-y-1.5">
        {ITEMS.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
