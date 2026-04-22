import { useEffect, useMemo, useState } from "react";

import { Download, FileText, HandCoins, Pencil, ReceiptText, Search, Trash2, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectActionDialog } from "@/features/projects/ProjectActionDialog";

function submitAndClose(handler, close) {
  return async (event) => {
    await handler(event);
    close();
  };
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value || 0))} FCFA`;
}

function formatDateTimeDisplay(value) {
  const parsed = toDate(value);
  if (!parsed) return "--";
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function overdueDays(row) {
  const dueDate = toDate(row?.due_on);
  if (!dueDate || Number(row?.amount_due || 0) <= 0) return 0;
  const now = new Date();
  const delta = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(delta, 0);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier justificatif"));
    reader.readAsDataURL(file);
  });
}

function downloadCsv(filename, rows, columns) {
  const escapeCell = (value) => {
    const raw = String(value ?? "");
    if (/[";\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const header = columns.map((column) => escapeCell(column.label)).join(";");
  const body = rows.map((row) => columns.map((column) => escapeCell(column.get(row))).join(";")).join("\n");
  const csv = `${header}\n${body}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function ProjectsFinanceDocumentsPanel({
  t,
  workspace,
  documentItems,
  changeOrderItems,
  documentForm,
  changeOrderForm,
  saving,
  createDocument,
  createChangeOrder,
  updateDocument,
  updateChangeOrder,
  renderSectionHeader,
  renderMetricCard,
  documentCategories,
  changeOrderStatuses,
  financeExpenseItems = [],
  financeRevenueItems = [],
  financeInvoiceItems = [],
  createExpenseRecord,
  createRevenueRecord,
  createPartnerInvoice,
  recordExpensePaymentOperation,
  recordInvoicePaymentOperation,
  onUpdateDocumentItem = null,
  onDeleteDocumentItem = null,
  onUpdateChangeOrderItem = null,
  onDeleteChangeOrderItem = null,
  sectionMode = "both",
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedOperations, setExpandedOperations] = useState({
    expenses: false,
    revenues: false,
    invoices: false,
    payroll: false,
  });
  const [historyFilters, setHistoryFilters] = useState({
    period: "custom",
    fromDateTime: "",
    toDateTime: "",
    movementType: "all",
    category: "all",
  });
  const [decompteTracking, setDecompteTracking] = useState({});
  const [documentsQuery, setDocumentsQuery] = useState("");
  const [documentsCategory, setDocumentsCategory] = useState("all");
  const [documentsFromDate, setDocumentsFromDate] = useState("");
  const [documentsToDate, setDocumentsToDate] = useState("");
  const [isExportingDocumentHistory, setIsExportingDocumentHistory] = useState(false);
  const [documentsActionBusyId, setDocumentsActionBusyId] = useState(null);

  const showFinanceCard = sectionMode === "both" || sectionMode === "finance" || sectionMode === "budget";
  const showDocumentsCard = sectionMode === "both" || sectionMode === "documents";

  const isInsidePeriod = (value) => {
    const target = toDate(value);
    if (!target) return false;
    const start = toDate(dateFrom);
    const end = toDate(dateTo);
    if (start && target < start) return false;
    if (end && target > end) return false;
    return true;
  };

  const expenseRows = useMemo(
    () => [...financeExpenseItems].filter((row) => isInsidePeriod(row.expense_date)),
    [financeExpenseItems, dateFrom, dateTo]
  );
  const revenueRows = useMemo(
    () => [...financeRevenueItems].filter((row) => isInsidePeriod(row.revenue_date)),
    [financeRevenueItems, dateFrom, dateTo]
  );
  const invoiceRows = useMemo(
    () => [...financeInvoiceItems].filter((row) => isInsidePeriod(row.issued_on || row.issue_date)),
    [financeInvoiceItems, dateFrom, dateTo]
  );

  const payrollRows = expenseRows.filter((row) => /salaire|salary|paie/i.test(String(row.category || "")));

  useEffect(() => {
    const projectKey = workspace?.project?.id || workspace?.project_id || "global";
    const storageKey = `finance-decompte-tracking-${projectKey}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setDecompteTracking(parsed);
        }
      }
    } catch {
      setDecompteTracking({});
    }
  }, [workspace?.project?.id, workspace?.project_id]);

  useEffect(() => {
    const projectKey = workspace?.project?.id || workspace?.project_id || "global";
    const storageKey = `finance-decompte-tracking-${projectKey}`;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(decompteTracking));
    } catch {
      // Ignore storage errors in restricted browser contexts.
    }
  }, [decompteTracking, workspace?.project?.id, workspace?.project_id]);

  const allFinanceMovements = useMemo(() => {
    const expenseMovements = expenseRows.map((row) => ({
      id: `expense-${row.id}`,
      movementType: "sortie",
      category: row.category || "Sortie",
      dateTime: row.expense_date || row.created_at || row.updated_at,
      reference: row.expense_number || `SORTIE-${row.id}`,
      amount: Number(row.amount || 0),
      paidStatus: Number(row.outstanding_amount || 0) <= 0 ? "paye" : "non_paye",
      details: `${row.approval_status || "draft"} / ${row.payment_status || "pending"}`,
    }));

    const revenueMovements = revenueRows.map((row) => ({
      id: `revenue-${row.id}`,
      movementType: "entree",
      category: row.revenue_type || "Entree",
      dateTime: row.revenue_date || row.created_at || row.updated_at,
      reference: row.revenue_number || `ENTREE-${row.id}`,
      amount: Number(row.amount || 0),
      paidStatus: "paye",
      details: row.payment_method || "encaissement",
    }));

    const invoiceMovements = invoiceRows.map((row) => ({
      id: `invoice-${row.id}`,
      movementType: "facture",
      category: "Facture partenaire",
      dateTime: row.issued_on || row.issue_date || row.created_at || row.updated_at,
      reference: row.invoice_number || `FACT-${row.id}`,
      amount: Number(row.amount_total || 0),
      paidStatus: Number(row.amount_due || 0) <= 0 ? "paye" : "non_paye",
      details: `Impayee: ${formatMoney(row.amount_due || 0)}${overdueDays(row) > 0 ? ` / Delai: ${overdueDays(row)}j` : ""}`,
    }));

    return [...expenseMovements, ...revenueMovements, ...invoiceMovements].sort((a, b) => {
      const aTime = toDate(a.dateTime)?.getTime() || 0;
      const bTime = toDate(b.dateTime)?.getTime() || 0;
      return bTime - aTime;
    });
  }, [expenseRows, revenueRows, invoiceRows]);

  const categoryOptions = useMemo(() => {
    return ["all", ...Array.from(new Set(allFinanceMovements.map((row) => row.category).filter(Boolean)))];
  }, [allFinanceMovements]);

  const filteredFinanceMovements = useMemo(() => {
    const now = new Date();
    let computedFrom = historyFilters.fromDateTime;
    let computedTo = historyFilters.toDateTime;

    if (historyFilters.period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      computedFrom = start.toISOString().slice(0, 16);
      computedTo = end.toISOString().slice(0, 16);
    }
    if (historyFilters.period === "week") {
      const dayIndex = (now.getDay() + 6) % 7;
      const start = new Date(now);
      start.setDate(now.getDate() - dayIndex);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      computedFrom = start.toISOString().slice(0, 16);
      computedTo = end.toISOString().slice(0, 16);
    }
    if (historyFilters.period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      computedFrom = start.toISOString().slice(0, 16);
      computedTo = end.toISOString().slice(0, 16);
    }

    const from = toDate(computedFrom);
    const to = toDate(computedTo);

    return allFinanceMovements.filter((row) => {
      if (historyFilters.movementType !== "all" && row.movementType !== historyFilters.movementType) return false;
      if (historyFilters.category !== "all" && row.category !== historyFilters.category) return false;
      const rowDate = toDate(row.dateTime);
      if (from && (!rowDate || rowDate < from)) return false;
      if (to && (!rowDate || rowDate > to)) return false;
      return true;
    });
  }, [allFinanceMovements, historyFilters]);

  const pendingDecomptes = useMemo(
    () =>
      revenueRows
        .filter((row) => row.collection_status !== "collected")
        .map((row) => {
          const amountDue = Math.max(Number(row.amount || 0) - Number(row.collected_amount || 0), 0);
          const submittedDate = toDate(row.revenue_date);
          const daysSinceSubmission = submittedDate
            ? Math.max(Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)), 0)
            : 0;
          const trackingHistory = decompteTracking[row.id] || [];
          const lastTracking = trackingHistory[trackingHistory.length - 1] || null;
          return {
            id: row.id,
            reference: row.revenue_number || `DECOMPTE-${row.id}`,
            moa: row.partner_name || "MOA inconnu",
            amountDue,
            daysSinceSubmission,
            collectionStatus: row.collection_status || "uncollected",
            stage: lastTracking?.stage || "Non renseigne",
            location: lastTracking?.location || "Non renseigne",
            trackingHistory,
          };
        }),
    [revenueRows, decompteTracking]
  );

  const operationModules = [
    { key: "expenses", title: "Sorties", rows: expenseRows, icon: ReceiptText, accent: "text-rose-700", button: "border-rose-200 text-rose-700 hover:bg-rose-50" },
    { key: "revenues", title: "Entrees", rows: revenueRows, icon: HandCoins, accent: "text-emerald-700", button: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
    { key: "invoices", title: "Factures partenaires", rows: invoiceRows, icon: FileText, accent: "text-amber-700", button: "border-amber-200 text-amber-700 hover:bg-amber-50" },
    { key: "payroll", title: "Salaires", rows: payrollRows, icon: WalletCards, accent: "text-violet-700", button: "border-violet-200 text-violet-700 hover:bg-violet-50" },
  ];

  const documentHistoryRows = useMemo(() => {
    const docs = (documentItems || []).map((row) => ({
      id: `doc-${row.id}`,
      rawId: row.id,
      rowType: "document",
      title: row.title || `Document #${row.id}`,
      reference: row.category || "other",
      categoryLabel: t(`enums.projectDocumentCategory.${row.category || "other"}`),
      status: "published",
      statusLabel: "Publie",
      amountLabel: "--",
      delayLabel: "--",
      dateTime: row.document_date || row.created_at || row.updated_at || null,
      authorLabel: row.uploaded_by?.full_name || t("pages.projects.notAssigned"),
      downloadUrl: row.file_url || "",
      details: row.notes || "",
      source: row,
    }));

    const changeOrders = (changeOrderItems || []).map((row) => ({
      id: `co-${row.id}`,
      rawId: row.id,
      rowType: "change_order",
      title: row.title || row.reference || `Avenant #${row.id}`,
      reference: row.reference || `AV-${row.id}`,
      categoryLabel: "Avenant",
      status: row.status || "draft",
      statusLabel: t(`enums.changeOrderStatus.${row.status || "draft"}`),
      amountLabel: formatMoney(row.amount_delta || 0),
      delayLabel: `${Number(row.delay_delta_days || 0)} j`,
      dateTime: row.effective_date || row.created_at || row.updated_at || null,
      authorLabel: row.requested_by?.full_name || t("pages.projects.notAssigned"),
      downloadUrl: "",
      details: row.description || "",
      source: row,
    }));

    return [...docs, ...changeOrders]
      .sort((left, right) => {
        const leftTime = toDate(left.dateTime)?.getTime() || 0;
        const rightTime = toDate(right.dateTime)?.getTime() || 0;
        return rightTime - leftTime;
      });
  }, [changeOrderItems, documentItems, t]);

  const documentCategoryOptions = useMemo(() => [
    { value: "all", label: "Tout" },
    ...Array.from(new Set(documentHistoryRows.map((row) => row.categoryLabel).filter(Boolean))).map((label) => ({
      value: label,
      label,
    })),
  ], [documentHistoryRows]);

  const filteredDocumentHistoryRows = useMemo(() => {
    const query = String(documentsQuery || "").trim().toLowerCase();
    const from = documentsFromDate ? toDate(`${documentsFromDate}T00:00:00`) : null;
    const to = documentsToDate ? toDate(`${documentsToDate}T23:59:59`) : null;

    return documentHistoryRows.filter((row) => {
      if (documentsCategory !== "all" && row.categoryLabel !== documentsCategory) return false;

      const rowDate = toDate(row.dateTime);
      if (from && (!rowDate || rowDate < from)) return false;
      if (to && (!rowDate || rowDate > to)) return false;

      if (query) {
        const searchable = `${row.title} ${row.reference} ${row.categoryLabel} ${row.statusLabel} ${row.amountLabel} ${row.authorLabel} ${row.details}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }, [documentsCategory, documentHistoryRows, documentsFromDate, documentsQuery, documentsToDate]);

  const exportDocumentHistory = async () => {
    setIsExportingDocumentHistory(true);
    try {
      downloadCsv(
        "historique-documents-avenants.csv",
        filteredDocumentHistoryRows,
        [
          { label: "Date", get: (row) => formatDateTimeDisplay(row.dateTime) },
          { label: "Type", get: (row) => (row.rowType === "document" ? "Document" : "Avenant") },
          { label: "Reference", get: (row) => row.reference },
          { label: "Titre", get: (row) => row.title },
          { label: "Categorie", get: (row) => row.categoryLabel },
          { label: "Statut", get: (row) => row.statusLabel },
          { label: "Montant", get: (row) => row.amountLabel },
          { label: "Delai", get: (row) => row.delayLabel },
          { label: "Auteur", get: (row) => row.authorLabel },
          { label: "Details", get: (row) => row.details },
        ]
      );
    } finally {
      setIsExportingDocumentHistory(false);
    }
  };

  const canEditDocuments = Boolean(onUpdateDocumentItem || onUpdateChangeOrderItem);
  const canDeleteDocuments = Boolean(onDeleteDocumentItem || onDeleteChangeOrderItem);

  return (
    <div className="grid gap-5">
      {showFinanceCard ? (
        <Card className="space-y-6">
          {renderSectionHeader({
            eyebrow: "Comptabilite",
            title: "Comptabilite",
            description: "Entrees, sorties, factures partenaires, salaires et validation DAF.",
            meta: <Badge variant="info">{expenseRows.length + revenueRows.length + invoiceRows.length}</Badge>,
          })}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ProjectActionDialog triggerLabel="Ajouter une sortie" title="Ajouter une sortie" description="Une sortie exige un justificatif." closeLabel={t("common.close")} compact={false} triggerClassName="h-11 w-full justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-center text-sm font-semibold text-rose-700 hover:bg-rose-100">
              {({ close }) => (
                <form
                  className="grid gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const justificatif = form.get("justificatif");
                    if (!(justificatif instanceof File) || !justificatif.size) {
                      return;
                    }
                    const justificatifUrl = await fileToDataUrl(justificatif);
                    await createExpenseRecord({
                      category: String(form.get("category") || "Sortie"),
                      amount: Number(form.get("amount") || 0),
                      expense_date: String(form.get("expense_date") || ""),
                      payment_method: String(form.get("payment_method") || ""),
                      description: String(form.get("description") || ""),
                      approval_status: "pending",
                      attachment_urls: [justificatifUrl],
                    });
                    close();
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="category" placeholder="Categorie" required />
                    <Input name="amount" type="number" placeholder="Montant" required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="expense_date" type="date" required />
                    <Input name="payment_method" placeholder="Mode de paiement" />
                  </div>
                  <Input name="justificatif" type="file" required />
                  <Textarea name="description" rows={2} placeholder="Description" />
                  <Button type="submit" disabled={saving}>Soumettre a validation DAF</Button>
                </form>
              )}
            </ProjectActionDialog>

            <ProjectActionDialog triggerLabel="Ajouter une entree" title="Ajouter une entree" description="Enregistrez une entree financiere." closeLabel={t("common.close")} compact={false} triggerClassName="h-11 w-full justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
              {({ close }) => (
                <form
                  className="grid gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    await createRevenueRecord({
                      revenue_type: String(form.get("revenue_type") || "Entree"),
                      amount: Number(form.get("amount") || 0),
                      revenue_date: String(form.get("revenue_date") || ""),
                      payment_method: String(form.get("payment_method") || ""),
                      description: String(form.get("description") || ""),
                    });
                    close();
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="revenue_type" placeholder="Type d'entree" required />
                    <Input name="amount" type="number" placeholder="Montant" required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="revenue_date" type="date" required />
                    <Input name="payment_method" placeholder="Mode de collecte" />
                  </div>
                  <Textarea name="description" rows={2} placeholder="Description" />
                  <Button type="submit" disabled={saving}>Ajouter</Button>
                </form>
              )}
            </ProjectActionDialog>

            <ProjectActionDialog triggerLabel="Ajouter facture partenaire" title="Ajouter facture partenaire" description="Suivi paye/impaye avec delai." closeLabel={t("common.close")} compact={false} triggerClassName="h-11 w-full justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-center text-sm font-semibold text-amber-700 hover:bg-amber-100">
              {({ close }) => (
                <form
                  className="grid gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    await createPartnerInvoice({
                      customer_name: String(form.get("customer_name") || "Partenaire"),
                      amount_total: Number(form.get("amount_total") || 0),
                      issued_on: String(form.get("issued_on") || ""),
                      due_on: String(form.get("due_on") || ""),
                      notes: String(form.get("notes") || ""),
                    });
                    close();
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="customer_name" placeholder="Partenaire" required />
                    <Input name="amount_total" type="number" placeholder="Montant total" required />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="issued_on" type="date" required />
                    <Input name="due_on" type="date" required />
                  </div>
                  <Textarea name="notes" rows={2} placeholder="Notes" />
                  <Button type="submit" disabled={saving}>Ajouter</Button>
                </form>
              )}
            </ProjectActionDialog>

            <ProjectActionDialog triggerLabel="Ordonner paiement salaire" title="Ordonner paiement salaire" description="Soumet un ordre de paie a validation DAF." closeLabel={t("common.close")} compact={false} triggerClassName="h-11 w-full justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-center text-sm font-semibold text-violet-700 hover:bg-violet-100">
              {({ close }) => (
                <form
                  className="grid gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    await createExpenseRecord({
                      category: "salaire",
                      amount: Number(form.get("amount") || 0),
                      expense_date: String(form.get("expense_date") || ""),
                      description: String(form.get("description") || "Paie"),
                      approval_status: "pending",
                      attachment_urls: [],
                    });
                    close();
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="amount" type="number" placeholder="Montant" required />
                    <Input name="expense_date" type="date" required />
                  </div>
                  <Textarea name="description" rows={2} placeholder="Details paie" />
                  <Button type="submit" disabled={saving}>Soumettre a validation DAF</Button>
                </form>
              )}
            </ProjectActionDialog>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(150deg,rgba(14,165,233,0.08),rgba(16,185,129,0.07),rgba(255,255,255,0.95))] p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Entrees</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">{formatMoney(revenueRows.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sorties</p>
                <p className="mt-1 text-sm font-semibold text-rose-700">{formatMoney(expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Factures impayees</p>
                <p className="mt-1 text-sm font-semibold text-amber-700">{invoiceRows.filter((row) => Number(row.amount_due || 0) > 0).length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Salaires</p>
                <p className="mt-1 text-sm font-semibold text-violet-700">{formatMoney(payrollRows.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Periode</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {operationModules.map((block) => {
              const isExpanded = expandedOperations[block.key];
              const visibleRows = isExpanded ? block.rows : block.rows.slice(0, 3);

              return (
                <div key={block.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <block.icon className={`h-4 w-4 ${block.accent}`} />
                    <p className="text-sm font-semibold text-slate-800">{block.title}</p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">{Math.min(block.rows.length, 3)} operations affichees</p>
                  <div className="mt-3 space-y-2">
                    {visibleRows.length ? visibleRows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="truncate text-slate-700">{row.expense_number || row.revenue_number || row.invoice_number || row.customer_name || row.category || "Operation"}</span>
                        <span className="shrink-0 font-semibold text-slate-800">{formatMoney(row.amount || row.amount_total || 0)}</span>
                      </div>
                    )) : <p className="text-sm text-slate-500">Aucune operation.</p>}
                  </div>
                  {block.rows.length > 3 ? (
                    <button
                      type="button"
                      className={`mt-3 inline-flex h-8 items-center rounded-lg border px-3 text-xs font-semibold transition ${block.button}`}
                      onClick={() =>
                        setExpandedOperations((prev) => ({
                          ...prev,
                          [block.key]: !prev[block.key],
                        }))
                      }
                    >
                      {isExpanded ? "Voir moins" : "Voir plus"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Historique financier detaille</p>
                  <p className="text-xs text-slate-500">Suivi complet des entrees, sorties, factures et etat paye/non paye.</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsv("historique-financier-filtre.csv", filteredFinanceMovements, [
                    { label: "DateHeure", get: (row) => formatDateTimeDisplay(row.dateTime) },
                    { label: "Type", get: (row) => row.movementType },
                    { label: "Categorie", get: (row) => row.category },
                    { label: "Reference", get: (row) => row.reference },
                    { label: "Montant", get: (row) => row.amount },
                    { label: "Paiement", get: (row) => row.paidStatus },
                    { label: "Details", get: (row) => row.details },
                  ])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
                >
                  <Download className="h-3.5 w-3.5" /> Telecharger
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-5">
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={historyFilters.period}
                  onChange={(event) => setHistoryFilters((prev) => ({ ...prev, period: event.target.value }))}
                >
                  <option value="custom">Periode personnalisee</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                </select>
                <Input
                  type="datetime-local"
                  value={historyFilters.fromDateTime}
                  onChange={(event) => setHistoryFilters((prev) => ({ ...prev, fromDateTime: event.target.value, period: "custom" }))}
                />
                <Input
                  type="datetime-local"
                  value={historyFilters.toDateTime}
                  onChange={(event) => setHistoryFilters((prev) => ({ ...prev, toDateTime: event.target.value, period: "custom" }))}
                />
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={historyFilters.movementType}
                  onChange={(event) => setHistoryFilters((prev) => ({ ...prev, movementType: event.target.value }))}
                >
                  <option value="all">Tous les types</option>
                  <option value="entree">Entrees</option>
                  <option value="sortie">Sorties</option>
                  <option value="facture">Factures partenaires</option>
                </select>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={historyFilters.category}
                  onChange={(event) => setHistoryFilters((prev) => ({ ...prev, category: event.target.value }))}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category === "all" ? "Toutes categories" : category}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 max-h-[338px] overflow-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Date/Heure</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Categorie</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2">Montant</th>
                      <th className="px-3 py-2">Paye</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredFinanceMovements.map((row) => (
                      <tr key={row.id} className="hover:bg-sky-50/40">
                        <td className="px-3 py-2">{formatDateTimeDisplay(row.dateTime)}</td>
                        <td className="px-3 py-2 capitalize">{row.movementType}</td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2">{row.reference}</td>
                        <td className="px-3 py-2">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2">{row.paidStatus === "paye" ? "Paye" : "Non paye"}</td>
                        <td className="px-3 py-2">{row.details}</td>
                      </tr>
                    ))}
                    {!filteredFinanceMovements.length ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">Aucun mouvement trouve avec ces filtres.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-900">Suivi des decomptes en instance de paiement</p>
                <p className="text-xs text-slate-500">Suivi manuel de la position du decompte et telechargement de l'historique de deplacement.</p>
              </div>

              <div className="space-y-3">
                {pendingDecomptes.map((decompte) => (
                  <div key={decompte.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{decompte.reference} — MOA : {decompte.moa}</p>
                        <p className="text-xs text-slate-500">Restant a encaisser : {formatMoney(decompte.amountDue)} | Soumis depuis : {decompte.daysSinceSubmission} j | Statut : {decompte.collectionStatus}</p>
                        <p className="text-xs text-slate-600">Etape actuelle: <span className="font-semibold">{decompte.stage}</span> | Position: <span className="font-semibold">{decompte.location}</span></p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <ProjectActionDialog triggerLabel="Mettre a jour suivi" title="Mise a jour suivi decompte" description="Enregistrez la position manuelle du decompte." closeLabel={t("common.close")} compact={false} triggerClassName="h-9 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-700">
                          {({ close }) => (
                            <form
                              className="grid gap-3"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const form = new FormData(event.currentTarget);
                                const entry = {
                                  movedAt: String(form.get("moved_at") || new Date().toISOString()),
                                  stage: String(form.get("stage") || "En transit"),
                                  location: String(form.get("location") || "Non renseigne"),
                                  note: String(form.get("note") || ""),
                                };

                                setDecompteTracking((prev) => ({
                                  ...prev,
                                  [decompte.id]: [...(prev[decompte.id] || []), entry],
                                }));
                                close();
                              }}
                            >
                              <div className="grid gap-3 md:grid-cols-2">
                                <Input name="moved_at" type="datetime-local" required />
                                <Input name="location" placeholder="Position actuelle (ex: DAF, DG, Banque...)" required />
                              </div>
                              <Input name="stage" placeholder="Etape (verification, validation, paiement...)" required />
                              <Textarea name="note" rows={2} placeholder="Commentaire de suivi" />
                              <Button type="submit">Enregistrer le deplacement</Button>
                            </form>
                          )}
                        </ProjectActionDialog>

                        <button
                          type="button"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
                          onClick={() => downloadCsv(`suivi-decompte-${decompte.reference}.csv`, decompte.trackingHistory, [
                            { label: "DateHeure", get: (row) => formatDateTimeDisplay(row.movedAt) },
                            { label: "Etape", get: (row) => row.stage },
                            { label: "Position", get: (row) => row.location },
                            { label: "Note", get: (row) => row.note },
                          ])}
                          disabled={!decompte.trackingHistory.length}
                        >
                          <Download className="h-3.5 w-3.5" /> Telecharger historique
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Historique des deplacements</p>
                      <div className="mt-2 space-y-1.5">
                        {decompte.trackingHistory.length ? decompte.trackingHistory.map((row, index) => (
                          <div key={`${decompte.id}-${index}`} className="rounded-md bg-white px-3 py-2 text-xs text-slate-700">
                            <span className="font-semibold">{formatDateTimeDisplay(row.movedAt)}</span> - {row.stage} - {row.location}{row.note ? ` - ${row.note}` : ""}
                          </div>
                        )) : <p className="text-xs text-slate-500">Aucun deplacement enregistre.</p>}
                      </div>
                    </div>
                  </div>
                ))}

                {!pendingDecomptes.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                    Aucun decompte en instance de paiement.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {showDocumentsCard ? (
        <Card className="space-y-4">
          {renderSectionHeader({
            eyebrow: t("pages.projects.docsEyebrow"),
            title: t("pages.projects.docsSection"),
            description: t("pages.projects.docsSectionHint"),
            meta: (
              <>
                <Badge variant="info">{documentItems.length + changeOrderItems.length}</Badge>
                <ProjectActionDialog
                  triggerLabel={t("pages.projects.addDocument")}
                  title={t("pages.projects.addDocument")}
                  description={t("pages.projects.docsSectionHint")}
                  closeLabel={t("common.close")}
                  compact={false}
                  triggerClassName="h-10 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                >
                  {({ close }) => (
                    <form className="grid gap-3" onSubmit={submitAndClose(createDocument, close)}>
                      <div className="grid gap-3 md:grid-cols-4">
                        <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={documentForm.category} onChange={(e) => updateDocument("category", e.target.value)}>
                          {documentCategories.map((value) => (
                            <option key={value} value={value}>{t(`enums.projectDocumentCategory.${value}`)}</option>
                          ))}
                        </select>
                        <Input placeholder={t("pages.projects.documentTitle")} value={documentForm.title} onChange={(e) => updateDocument("title", e.target.value)} />
                        <Input type="date" value={documentForm.document_date} onChange={(e) => updateDocument("document_date", e.target.value)} />
                        <select
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={documentForm.correspondence_type || ""}
                          onChange={(e) => updateDocument("correspondence_type", e.target.value)}
                        >
                          <option value="">Type correspondance</option>
                          <option value="incoming">Entrante</option>
                          <option value="outgoing">Sortante</option>
                          <option value="internal">Interne</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <Input placeholder={t("pages.projects.fileUrl")} value={documentForm.file_url} onChange={(e) => updateDocument("file_url", e.target.value)} />
                      <Textarea rows={2} placeholder={t("pages.projects.notes")} value={documentForm.notes} onChange={(e) => updateDocument("notes", e.target.value)} />
                      <Button type="submit" disabled={saving}>{t("pages.projects.addDocument")}</Button>
                    </form>
                  )}
                </ProjectActionDialog>

                <ProjectActionDialog
                  triggerLabel={t("pages.projects.addChangeOrder")}
                  title={t("pages.projects.addChangeOrder")}
                  description={t("pages.projects.docsSectionHint")}
                  closeLabel={t("common.close")}
                  compact={false}
                  triggerClassName="h-10 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                >
                  {({ close }) => (
                    <form className="grid gap-3" onSubmit={submitAndClose(createChangeOrder, close)}>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input placeholder={t("pages.projects.reference")} value={changeOrderForm.reference} onChange={(e) => updateChangeOrder("reference", e.target.value)} />
                        <Input placeholder={t("pages.projects.changeOrderTitle")} value={changeOrderForm.title} onChange={(e) => updateChangeOrder("title", e.target.value)} />
                        <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={changeOrderForm.status} onChange={(e) => updateChangeOrder("status", e.target.value)}>
                          {changeOrderStatuses.map((value) => (
                            <option key={value} value={value}>{t(`enums.changeOrderStatus.${value}`)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input type="number" placeholder={t("pages.projects.amount")} value={changeOrderForm.amount_delta} onChange={(e) => updateChangeOrder("amount_delta", e.target.value)} />
                        <Input type="number" placeholder={t("pages.projects.delayDays")} value={changeOrderForm.delay_delta_days} onChange={(e) => updateChangeOrder("delay_delta_days", e.target.value)} />
                        <Input type="date" value={changeOrderForm.effective_date} onChange={(e) => updateChangeOrder("effective_date", e.target.value)} />
                      </div>
                      <Textarea rows={2} placeholder={t("pages.projects.description")} value={changeOrderForm.description} onChange={(e) => updateChangeOrder("description", e.target.value)} />
                      <Button type="submit" disabled={saving}>{t("pages.projects.addChangeOrder")}</Button>
                    </form>
                  )}
                </ProjectActionDialog>
              </>
            ),
          })}

          <div className="grid gap-3 md:grid-cols-3">
            {renderMetricCard({ label: t("pages.projects.documents"), value: workspace?.documents?.count ?? 0 })}
            {renderMetricCard({ label: t("pages.projects.allocations"), value: workspace?.resources?.allocations_count ?? 0 })}
            {renderMetricCard({ label: t("pages.projects.equipment"), value: workspace?.resources?.equipment_quantity ?? 0 })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_220px_minmax(320px,0.9fr)] xl:items-end">
              <label className="grid gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recherche</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={documentsQuery}
                    onChange={(event) => setDocumentsQuery(event.target.value)}
                    className="border-slate-200 bg-white pl-9"
                    placeholder="Rechercher document, avenant, auteur..."
                  />
                </div>
              </label>
              <label className="grid gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Categorie</span>
                <select value={documentsCategory} onChange={(event) => setDocumentsCategory(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  {documentCategoryOptions.map((option) => (
                    <option key={`doc-type-${option.value}`} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Periode</span>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
                  <Input type="date" value={documentsFromDate} onChange={(event) => setDocumentsFromDate(event.target.value)} className="border-slate-200 bg-white" />
                  <span className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">au</span>
                  <Input type="date" value={documentsToDate} onChange={(event) => setDocumentsToDate(event.target.value)} className="border-slate-200 bg-white" />
                  <Button
                    type="button"
                    disabled={!filteredDocumentHistoryRows.length || isExportingDocumentHistory}
                    onClick={exportDocumentHistory}
                    className="h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExportingDocumentHistory ? "Export..." : "Historique"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[345px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-[1180px] w-full text-sm">
              <thead className="bg-slate-100/90 dark:bg-slate-900/80">
                <tr>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Date</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Type</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Titre</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Categorie</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Statut</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Montant</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Delai</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Auteur</th>
                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
                {filteredDocumentHistoryRows.length ? filteredDocumentHistoryRows.map((row) => {
                  const rowBusy = documentsActionBusyId === row.id;
                  const isDocumentRow = row.rowType === "document";
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-sky-50/40">
                      <td className="px-4 py-4 align-top text-sm text-slate-700">{formatDateTimeDisplay(row.dateTime)}</td>
                      <td className="px-4 py-4 align-top">
                        <Badge variant={isDocumentRow ? "info" : "warning"}>{isDocumentRow ? "Document" : "Avenant"}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-medium text-slate-900">{row.reference}</td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">
                        <p className="font-medium text-slate-900">{row.title}</p>
                        {row.details ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.details}</p> : null}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">{row.categoryLabel}</td>
                      <td className="px-4 py-4 align-top">
                        <Badge variant={isDocumentRow ? "success" : row.status === "approved" || row.status === "implemented" ? "success" : row.status === "rejected" ? "danger" : "neutral"}>
                          {row.statusLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">{row.amountLabel}</td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">{row.delayLabel}</td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700">{row.authorLabel}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          {row.downloadUrl ? (
                            <a
                              href={row.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              title="Telecharger"
                              aria-label="Telecharger"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-slate-300">
                              <Download className="h-4 w-4" />
                            </span>
                          )}

                          {canEditDocuments ? (
                            <ProjectActionDialog
                              triggerLabel="Modifier"
                              title={isDocumentRow ? "Modifier document" : "Modifier avenant"}
                              description="Mettez a jour les informations de la ligne selectionnee."
                              closeLabel={t("common.close")}
                              compact
                              triggerContent={<Pencil className="h-4 w-4" />}
                              triggerClassName="h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-700 hover:bg-slate-50"
                            >
                              {({ close }) => (
                                isDocumentRow ? (
                                  <form
                                    className="grid gap-3"
                                    onSubmit={async (event) => {
                                      event.preventDefault();
                                      if (!onUpdateDocumentItem) return;
                                      const form = new FormData(event.currentTarget);
                                      try {
                                        setDocumentsActionBusyId(row.id);
                                        await onUpdateDocumentItem(row.rawId, {
                                          category: String(form.get("category") || "other"),
                                          title: String(form.get("title") || "").trim(),
                                          file_url: String(form.get("file_url") || "").trim(),
                                          document_date: String(form.get("document_date") || "").trim() || null,
                                          notes: String(form.get("notes") || "").trim() || null,
                                        });
                                        close();
                                      } catch (error) {
                                        window.alert(error?.response?.data?.message || "Impossible de modifier ce document.");
                                      } finally {
                                        setDocumentsActionBusyId(null);
                                      }
                                    }}
                                  >
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <select name="category" defaultValue={row.source.category || "other"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                                        {documentCategories.map((value) => (
                                          <option key={`edit-doc-cat-${row.rawId}-${value}`} value={value}>{t(`enums.projectDocumentCategory.${value}`)}</option>
                                        ))}
                                      </select>
                                      <Input name="document_date" type="date" defaultValue={String(row.source.document_date || "").slice(0, 10)} />
                                    </div>
                                    <Input name="title" placeholder={t("pages.projects.documentTitle")} defaultValue={row.source.title || ""} required />
                                    <Input name="file_url" placeholder={t("pages.projects.fileUrl")} defaultValue={row.source.file_url || ""} required />
                                    <Textarea name="notes" rows={2} placeholder={t("pages.projects.notes")} defaultValue={row.source.notes || ""} />
                                    <Button type="submit" disabled={rowBusy}>{t("common.save")}</Button>
                                  </form>
                                ) : (
                                  <form
                                    className="grid gap-3"
                                    onSubmit={async (event) => {
                                      event.preventDefault();
                                      if (!onUpdateChangeOrderItem) return;
                                      const form = new FormData(event.currentTarget);
                                      try {
                                        setDocumentsActionBusyId(row.id);
                                        await onUpdateChangeOrderItem(row.rawId, {
                                          reference: String(form.get("reference") || "").trim(),
                                          title: String(form.get("title") || "").trim(),
                                          status: String(form.get("status") || "draft"),
                                          amount_delta: Number(form.get("amount_delta") || 0),
                                          delay_delta_days: Number(form.get("delay_delta_days") || 0),
                                          effective_date: String(form.get("effective_date") || "").trim() || null,
                                          description: String(form.get("description") || "").trim() || null,
                                        });
                                        close();
                                      } catch (error) {
                                        window.alert(error?.response?.data?.message || "Impossible de modifier cet avenant.");
                                      } finally {
                                        setDocumentsActionBusyId(null);
                                      }
                                    }}
                                  >
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <Input name="reference" placeholder={t("pages.projects.reference")} defaultValue={row.source.reference || ""} required />
                                      <Input name="title" placeholder={t("pages.projects.changeOrderTitle")} defaultValue={row.source.title || ""} required />
                                      <select name="status" defaultValue={row.source.status || "draft"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                                        {changeOrderStatuses.map((value) => (
                                          <option key={`edit-co-status-${row.rawId}-${value}`} value={value}>{t(`enums.changeOrderStatus.${value}`)}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <Input name="amount_delta" type="number" placeholder={t("pages.projects.amount")} defaultValue={row.source.amount_delta ?? 0} />
                                      <Input name="delay_delta_days" type="number" placeholder={t("pages.projects.delayDays")} defaultValue={row.source.delay_delta_days ?? 0} />
                                      <Input name="effective_date" type="date" defaultValue={String(row.source.effective_date || "").slice(0, 10)} />
                                    </div>
                                    <Textarea name="description" rows={2} placeholder={t("pages.projects.description")} defaultValue={row.source.description || ""} />
                                    <Button type="submit" disabled={rowBusy}>{t("common.save")}</Button>
                                  </form>
                                )
                              )}
                            </ProjectActionDialog>
                          ) : null}

                          {canDeleteDocuments ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 w-8 border-rose-200 p-0 text-rose-700 hover:bg-rose-50"
                              disabled={rowBusy}
                              onClick={async () => {
                                const confirmed = window.confirm(`Supprimer ${isDocumentRow ? "ce document" : "cet avenant"} ?`);
                                if (!confirmed) return;
                                try {
                                  setDocumentsActionBusyId(row.id);
                                  if (isDocumentRow && onDeleteDocumentItem) {
                                    await onDeleteDocumentItem(row.rawId);
                                  }
                                  if (!isDocumentRow && onDeleteChangeOrderItem) {
                                    await onDeleteChangeOrderItem(row.rawId);
                                  }
                                } finally {
                                  setDocumentsActionBusyId(null);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">Aucune ligne sur cette plage de filtre.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
