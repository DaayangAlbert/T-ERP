"use client";

import { useState } from "react";
import {
  useDtValidationsPending,
  useDtValidationApprove,
  useDtValidationReject,
  useDtValidationsBulkApprove,
} from "@/hooks/useDtValidations";
import { DtValidationsKpis } from "@/components/dt/validations/DtValidationsKpis";
import { DtValidationsTable } from "@/components/dt/validations/DtValidationsTable";
import { DtBulkValidateBar } from "@/components/dt/validations/DtBulkValidateBar";
import { RejectModal } from "@/components/dt/validations/RejectModal";

export default function DtValidationsPage() {
  const { data, isLoading } = useDtValidationsPending();
  const approve = useDtValidationApprove();
  const reject = useDtValidationReject();
  const bulkApprove = useDtValidationsBulkApprove();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Validations N2 technique
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Avenants, sous-traitance &gt; 30 M, matériel, méthodes spéciales, mises en service.
        </p>
      </header>

      {data && <DtValidationsKpis kpis={data.kpis} />}

      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <>
          <DtValidationsTable
            items={data.items}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            onApprove={(id) => approve.mutate({ id })}
            onReject={(id) => setRejectingId(id)}
          />
          <DtBulkValidateBar
            count={selected.size}
            isLoading={bulkApprove.isPending}
            onClear={() => setSelected(new Set())}
            onBulkApprove={() => {
              bulkApprove.mutate(Array.from(selected));
              setSelected(new Set());
            }}
          />
        </>
      )}

      <RejectModal
        open={rejectingId !== null}
        onCancel={() => setRejectingId(null)}
        onConfirm={async (reason) => {
          if (rejectingId) {
            await reject.mutateAsync({ id: rejectingId, reason });
            setRejectingId(null);
          }
        }}
      />
    </div>
  );
}
