"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import {
  useOffers,
  useUpdateOffer,
  useDeleteOffer,
  type OfferRow,
} from "@/hooks/useRhRecruitment";
import { OffersTable, type OffersTableHandlers } from "./OffersTable";
import { OfferFormModal } from "./OfferFormModal";

export function OffersSection() {
  const canManage = useAccess(MODULES.RH).canEdit;
  const { data, isLoading } = useOffers();
  const update = useUpdateOffer();
  const del = useDeleteOffer();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const handlers: OffersTableHandlers = {
    onEdit: (id) => {
      setEditingId(id);
      setModalOpen(true);
    },
    onPublish: (id) => update.mutate({ id, status: "PUBLISHED" }),
    onReopen: (id) => update.mutate({ id, status: "PUBLISHED" }),
    onClose: (id) => {
      if (confirm("Fermer cette offre ? Elle ne sera plus visible des candidats.")) {
        update.mutate({ id, status: "CLOSED" });
      }
    },
    onDelete: (o: OfferRow) => {
      if (confirm(`Supprimer définitivement l'offre « ${o.title} » ?`)) {
        del.mutate(o.id);
      }
    },
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Offres d&apos;emploi
        </h2>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12.5px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvelle offre
          </button>
        )}
      </div>

      {isLoading || !data ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <OffersTable items={data.items} handlers={canManage ? handlers : undefined} />
      )}

      {canManage && modalOpen && (
        <OfferFormModal
          key={editingId ?? "new"}
          offerId={editingId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}
