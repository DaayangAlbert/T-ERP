import type { PayrollStateData } from "./build-payroll-state";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildPayrollStateCsv(state: PayrollStateData): string {
  const headers = [
    "matricule",
    "nom_et_prenoms",
    "poste",
    "chantier",
    "categorie",
    "contrat",
    "jours_travailles",
    "brut",
    "retenues",
    "net_a_payer",
    "charges_patronales",
    "cout_total_employeur",
    "banque",
    "compte",
    "statut",
  ];

  const rows = state.rows.map((row) =>
    [
      row.matricule,
      row.fullName,
      row.position,
      row.site,
      row.category,
      row.contractType,
      row.workedDays,
      row.gross,
      row.totalDeductions,
      row.netToPay,
      row.employerCharges,
      row.employerCost,
      row.bankName,
      row.bankAccount,
      row.status,
    ]
      .map(csvCell)
      .join(";")
  );

  return [headers.map(csvCell).join(";"), ...rows].join("\n");
}

export function buildBankTransferOrder(state: PayrollStateData): string {
  const rows = state.rows.map((row) =>
    [row.matricule, row.fullName, row.bankName, row.bankAccount, row.netToPay].map(csvCell).join(";")
  );
  return [["matricule", "nom_et_prenoms", "banque", "compte", "net_a_virer"].map(csvCell).join(";"), ...rows].join(
    "\n"
  );
}
