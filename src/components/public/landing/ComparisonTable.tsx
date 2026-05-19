import { Check, X } from "lucide-react";

const ROWS = [
  { feat: "Multi-tenant natif", terp: true, sage: false, odoo: true, excel: false },
  { feat: "SYSCOHADA prêt à l'emploi", terp: true, sage: true, odoo: false, excel: false },
  { feat: "Intégrations CM (CNPS, DGI)", terp: true, sage: false, odoo: false, excel: false },
  { feat: "WhatsApp Business", terp: true, sage: false, odoo: false, excel: false },
  { feat: "PWA terrain offline", terp: true, sage: false, odoo: false, excel: false },
  { feat: "Hébergement Cameroun", terp: true, sage: false, odoo: false, excel: false },
  { feat: "Portail recrutement intégré", terp: true, sage: false, odoo: true, excel: false },
  { feat: "Audit trail conforme", terp: true, sage: true, odoo: false, excel: false },
];

const SETUP_ROW = {
  feat: "Mise en route",
  terp: "5-10 jours",
  sage: "3-6 mois",
  odoo: "2-4 semaines",
  excel: "Immédiat (mais sans contrôle)",
};

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-emerald-600" />
    ) : (
      <X className="mx-auto h-4 w-4 text-rose-400" />
    );
  }
  return <span className="text-xs font-medium tabular-nums text-ink-2">{value}</span>;
}

export function ComparisonTable() {
  return (
    <section id="comparaison" className="bg-surface-alt py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            T-ERP vs la concurrence
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Une comparaison honnête. Choisissez en connaissance de cause.
          </p>
        </div>
        <div className="mt-10 overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-alt">
                <th className="px-4 py-3 font-semibold text-ink">Fonctionnalité</th>
                <th className="px-4 py-3 text-center font-bold text-primary-700">
                  T-ERP
                </th>
                <th className="px-4 py-3 text-center font-medium text-ink-3">Sage X3</th>
                <th className="px-4 py-3 text-center font-medium text-ink-3">Odoo</th>
                <th className="px-4 py-3 text-center font-medium text-ink-3">Excel</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feat} className="border-b border-line">
                  <td className="px-4 py-2.5 text-ink-2">{r.feat}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Cell value={r.terp} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Cell value={r.sage} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Cell value={r.odoo} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Cell value={r.excel} />
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-alt">
                <td className="px-4 py-3 font-semibold text-ink">{SETUP_ROW.feat}</td>
                <td className="px-4 py-3 text-center">
                  <Cell value={SETUP_ROW.terp} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Cell value={SETUP_ROW.sage} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Cell value={SETUP_ROW.odoo} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Cell value={SETUP_ROW.excel} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
