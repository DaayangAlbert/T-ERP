import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JustificatifDropzone } from "@/features/comptable/components/JustificatifDropzone";
import { comptableTheme } from "@/features/comptable/theme";
import type { FinanceRecordType, PaymentMethod, Payslip, TransactionDraftInput } from "@/features/comptable/types";

interface FinanceComposerProps {
  type: FinanceRecordType;
  projects: Array<{ id: string; name: string }>;
  payslips?: Payslip[];
  defaultProjectId?: string;
  onSubmit: (draft: TransactionDraftInput) => { ok: boolean; error?: string };
}

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank_transfer", "mobile_money", "check"];

const TITLE_BY_TYPE: Record<FinanceRecordType, string> = {
  expense: "Enregistrer une depense",
  revenue: "Enregistrer une recette",
  payment: "Enregistrer un paiement",
};

export function FinanceComposer({ type, projects, payslips = [], defaultProjectId, onSubmit }: FinanceComposerProps) {
  const [form, setForm] = useState({
    projectId: defaultProjectId || projects[0]?.id || "",
    title: "",
    counterparty: "",
    category: "",
    amount: "",
    method: PAYMENT_METHODS[0],
    date: new Date().toISOString().slice(0, 10),
    note: "",
    linkedPayslipId: "",
    employeeId: "",
    proofNames: [] as string[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, projectId: defaultProjectId || current.projectId || projects[0]?.id || "" }));
  }, [defaultProjectId, projects]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = onSubmit({
      type,
      projectId: form.projectId,
      title: form.title,
      counterparty: form.counterparty,
      category: form.category,
      amount: Number(form.amount || 0),
      method: form.method,
      date: form.date,
      note: form.note,
      proofNames: form.proofNames,
      linkedPayslipId: form.linkedPayslipId || undefined,
      employeeId: form.employeeId || undefined,
    });

    if (!result.ok) {
      setError(result.error || "Impossible d'enregistrer l'operation.");
      return;
    }

    setError("");
    setForm({
      projectId: defaultProjectId || projects[0]?.id || "",
      title: "",
      counterparty: "",
      category: "",
      amount: "",
      method: PAYMENT_METHODS[0],
      date: new Date().toISOString().slice(0, 10),
      note: "",
      linkedPayslipId: "",
      employeeId: "",
      proofNames: [],
    });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1">
        <h4 className={`text-base font-semibold ${comptableTheme.primaryText}`}>{TITLE_BY_TYPE[type]}</h4>
        <p className={`text-sm ${comptableTheme.secondaryText}`}>
          Chaque operation doit etre rattachee a un projet et accompagnee d'une preuve.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select
          className={comptableTheme.select}
          value={form.projectId}
          onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
          required
        >
          <option value="">Projet</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <Input
          required
          placeholder={type === "expense" ? "Objet de la depense" : type === "revenue" ? "Objet de la recette" : "Objet du paiement"}
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          required
          placeholder={type === "expense" ? "Fournisseur / beneficiaire" : "Client / destinataire"}
          value={form.counterparty}
          onChange={(event) => setForm((current) => ({ ...current, counterparty: event.target.value }))}
        />
        <Input
          required
          placeholder="Categorie"
          value={form.category}
          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          required
          type="number"
          placeholder="Montant"
          value={form.amount}
          onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
        />
        <select
          className={comptableTheme.select}
          value={form.method}
          onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
      </div>

      {type === "payment" ? (
        <select
          className={comptableTheme.select}
          value={form.linkedPayslipId}
          onChange={(event) => {
            const payslip = payslips.find((item) => item.id === event.target.value);
            setForm((current) => ({
              ...current,
              linkedPayslipId: event.target.value,
              employeeId: payslip?.employeeId || "",
              counterparty: payslip?.employeeName || current.counterparty,
              category: payslip ? "Salaire" : current.category,
            }));
          }}
        >
          <option value="">Lier a un bulletin (optionnel)</option>
          {payslips.map((payslip) => (
            <option key={payslip.id} value={payslip.id}>
              {payslip.employeeName} - {payslip.periodLabel}
            </option>
          ))}
        </select>
      ) : null}

      <Textarea
        rows={3}
        placeholder="Commentaires, reference ou precision"
        value={form.note}
        onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
      />
      <JustificatifDropzone files={form.proofNames} onChange={(proofNames) => setForm((current) => ({ ...current, proofNames }))} />
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      <Button type="submit">{TITLE_BY_TYPE[type]}</Button>
    </form>
  );
}
