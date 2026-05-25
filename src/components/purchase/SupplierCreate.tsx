"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SupplierFormModal } from "@/components/purchase/SupplierFormModal";

export function SupplierCreate() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 flex justify-end">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700">
        <Plus className="h-3.5 w-3.5" /> Nouveau fournisseur
      </button>
      {open && <SupplierFormModal onClose={() => setOpen(false)} />}
    </div>
  );
}
