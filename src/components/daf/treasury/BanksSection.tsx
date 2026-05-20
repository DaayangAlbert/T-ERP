"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { useUpdateBank, type BankAccountItem } from "@/hooks/useDafTreasury";
import { BanksTable } from "./BanksTable";
import { BankAccountFormModal, type BankInitial } from "./BankAccountFormModal";

export function BanksSection({ items }: { items: BankAccountItem[] }) {
  const canManage = useAccess(MODULES.DAF).canEdit;
  const update = useUpdateBank();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankInitial | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (id: string) => {
    const item = items.find((b) => b.id === id);
    if (!item) return;
    setEditing({
      id: item.id,
      bank: item.bank,
      accountNumber: item.accountNumber,
      accountType: item.accountType,
      currency: item.currency,
      balance: item.balance,
      creditLineGranted: item.creditLineGranted,
      contact: item.contact,
    });
    setFormOpen(true);
  };
  const closeAccount = (id: string) => {
    const item = items.find((b) => b.id === id);
    if (!item) return;
    if (!confirm(`Clôturer le compte ${item.bank} (${item.accountNumber}) ? Il sortira de la position consolidée.`)) return;
    update.mutate({ id, isActive: false });
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Comptes bancaires</h2>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau compte
          </button>
        )}
      </div>

      <BanksTable
        items={items}
        onEdit={canManage ? openEdit : undefined}
        onClose={canManage ? closeAccount : undefined}
      />

      {canManage && formOpen && (
        <BankAccountFormModal
          key={editing?.id ?? "new"}
          open
          onClose={() => setFormOpen(false)}
          initial={editing}
        />
      )}
    </section>
  );
}
