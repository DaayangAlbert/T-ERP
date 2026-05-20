"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  useCreateOffer,
  useUpdateOffer,
  useOfferDetail,
  type OfferFormInput,
} from "@/hooks/useRhRecruitment";

const CONTRACT_TYPES = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "STAGE", label: "Stage" },
  { value: "JOURNALIER", label: "Journalier" },
  { value: "PRESTATAIRE", label: "Prestataire" },
];

const input =
  "h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px] text-ink focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-200";
const area =
  "w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] text-ink focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-200";

function L({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const emptyForm: OfferFormInput = {
  title: "",
  contractType: "CDI",
  category: "",
  positions: 1,
  description: "",
  requirements: "",
};

export function OfferFormModal({
  offerId,
  onClose,
}: {
  offerId: string | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(offerId);
  const { data: detail, isLoading } = useOfferDetail(offerId);
  const create = useCreateOffer();
  const update = useUpdateOffer();
  const pending = create.isPending || update.isPending;

  const [f, setF] = useState<OfferFormInput>(emptyForm);
  const [missions, setMissions] = useState("");
  const [profileItems, setProfileItems] = useState("");
  const [benefits, setBenefits] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (detail) {
      setF({
        title: detail.title,
        department: detail.department,
        contractType: detail.contractType,
        category: detail.category,
        positions: detail.positions,
        region: detail.region,
        experienceMin: detail.experienceMin,
        salaryMin: detail.salaryMin,
        salaryMax: detail.salaryMax,
        summary: detail.summary,
        description: detail.description,
        requirements: detail.requirements,
        expiresAt: detail.expiresAt,
        status: detail.status,
      });
      setMissions(detail.missions.join("\n"));
      setProfileItems(detail.profileItems.join("\n"));
      setBenefits(detail.benefits.join("\n"));
    }
  }, [detail]);

  const set = <K extends keyof OfferFormInput>(k: K, v: OfferFormInput[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const toLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  async function submit(status: "DRAFT" | "PUBLISHED") {
    setError(null);
    if (!f.title.trim()) return setError("Le titre est requis.");
    if (f.description.trim().length < 10) return setError("La description doit faire au moins 10 caractères.");
    if (f.requirements.trim().length < 5) return setError("Les prérequis sont requis.");
    if (!f.category.trim()) return setError("La catégorie est requise.");

    const payload: OfferFormInput = {
      ...f,
      salaryMin: (f.salaryMin || "").toString().replace(/\D/g, "") || undefined,
      salaryMax: (f.salaryMax || "").toString().replace(/\D/g, "") || undefined,
      missions: toLines(missions),
      profileItems: toLines(profileItems),
      benefits: toLines(benefits),
      status,
    };
    try {
      if (isEdit && offerId) {
        await update.mutateAsync({ id: offerId, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Modifier l'offre" : "Nouvelle offre"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            {isEdit ? "Modifier l'offre" : "Nouvelle offre d'emploi"}
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-alt hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          {isEdit && isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-surface-alt" />
          ) : (
            <div className="space-y-3">
              <L label="Intitulé du poste" required>
                <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex : Agent de sécurité, Comptable, Maçon…" />
              </L>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <L label="Type de contrat" required>
                  <select className={input} value={f.contractType} onChange={(e) => set("contractType", e.target.value)}>
                    {CONTRACT_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </L>
                <L label="Catégorie" required>
                  <input className={input} value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Cadre, ETAM, Ouvrier…" />
                </L>
                <L label="Département / Direction">
                  <input className={input} value={f.department ?? ""} onChange={(e) => set("department", e.target.value)} />
                </L>
                <L label="Région / Lieu">
                  <input className={input} value={f.region ?? ""} onChange={(e) => set("region", e.target.value)} placeholder="Douala, Yaoundé…" />
                </L>
                <L label="Nombre de postes">
                  <input type="number" min={1} className={input} value={f.positions} onChange={(e) => set("positions", Number(e.target.value) || 1)} />
                </L>
                <L label="Expérience min. (années)">
                  <input type="number" min={0} className={input} value={f.experienceMin ?? ""} onChange={(e) => set("experienceMin", e.target.value ? Number(e.target.value) : null)} />
                </L>
                <L label="Salaire min (FCFA)">
                  <input inputMode="numeric" className={input} value={f.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value)} />
                </L>
                <L label="Salaire max (FCFA)">
                  <input inputMode="numeric" className={input} value={f.salaryMax ?? ""} onChange={(e) => set("salaryMax", e.target.value)} />
                </L>
              </div>
              <L label="Résumé (1 ligne)">
                <input className={input} value={f.summary ?? ""} onChange={(e) => set("summary", e.target.value)} placeholder="Accroche courte affichée dans la liste" />
              </L>
              <L label="Description du poste" required>
                <textarea rows={4} className={area} value={f.description} onChange={(e) => set("description", e.target.value)} />
              </L>
              <L label="Prérequis / compétences" required>
                <textarea rows={3} className={area} value={f.requirements} onChange={(e) => set("requirements", e.target.value)} />
              </L>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <L label="Missions (1 par ligne)">
                  <textarea rows={4} className={area} value={missions} onChange={(e) => setMissions(e.target.value)} />
                </L>
                <L label="Profil recherché (1/ligne)">
                  <textarea rows={4} className={area} value={profileItems} onChange={(e) => setProfileItems(e.target.value)} />
                </L>
                <L label="Avantages (1 par ligne)">
                  <textarea rows={4} className={area} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
                </L>
              </div>
              <L label="Date d'expiration">
                <input type="date" className={input} value={f.expiresAt ?? ""} onChange={(e) => set("expiresAt", e.target.value)} />
              </L>

              {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            onClick={() => submit("DRAFT")}
            disabled={pending}
            className="rounded-md border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-alt disabled:opacity-50"
          >
            Enregistrer en brouillon
          </button>
          <button
            onClick={() => submit("PUBLISHED")}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {pending ? "…" : "Publier"}
          </button>
        </footer>
      </div>
    </div>
  );
}
