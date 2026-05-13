"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Deadline {
  id: string;
  type: string;
  authority: string;
  period: string;
  dueDate: string;
  amount: number | null;
  declarationStatus: string;
  paymentStatus: string;
}

export default function FiscalPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["comptable", "tax-preparation"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/tax/preparation", { credentials: "same-origin" });
      if (res.status === 403) {
        return { forbidden: true } as { forbidden: true };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: Deadline[] }>;
    },
  });

  if (data && "forbidden" in data) {
    return (
      <div data-rh-screen className="space-y-3" id="screen-cpt-fiscal">
        <header className="border-b border-line pb-3">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Déclarations fiscales</h1>
        </header>
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-4 text-[13px] text-warning">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Réservé au Comptable Direction</p>
            <p className="text-[12.5px] text-ink-3">
              Les déclarations fiscales et sociales sont gérées exclusivement par le Comptable Direction.
              Le Comptable Chantier n'a pas accès à ce module.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-fiscal">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Déclarations fiscales et sociales
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          TVA · DIPE CNPS · IRPP · IS · DSF — préparation, génération PDF officiels, soumission DGI/CNPS.
        </p>
      </header>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Échéances 30 prochains jours
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune échéance dans les 30 jours.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Autorité</th>
                  <th className="px-3 py-2">Période</th>
                  <th className="px-3 py-2">Échéance</th>
                  <th className="px-3 py-2 text-right">Montant</th>
                  <th className="px-3 py-2">Déclaration</th>
                  <th className="px-3 py-2">Paiement</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{d.type}</td>
                    <td className="px-3 py-2 text-ink-2">{d.authority}</td>
                    <td className="px-3 py-2 text-ink-3">{d.period}</td>
                    <td className="px-3 py-2 text-ink-3">
                      {new Date(d.dueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {d.amount ? d.amount.toLocaleString("fr-FR") : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-2">{d.declarationStatus}</td>
                    <td className="px-3 py-2 text-ink-2">{d.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Workflow de préparation
        </h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-[12.5px] text-ink-2">
          <li>Préparation comptable (Comptable Direction) — pré-remplissage automatique</li>
          <li>Revue DAF</li>
          <li>Signature DAF</li>
          <li>Soumission via téléprocédure DGI/CNPS</li>
          <li>Accusé de réception + paiement</li>
        </ol>
      </section>
    </div>
  );
}
