"use client";

import { useState } from "react";
import { X, FileText, Upload } from "lucide-react";
import { useUploadPv, type MeetingsListResponse } from "@/hooks/useSgGovernance";

interface Props {
  meeting: NonNullable<MeetingsListResponse["nextMeeting"]>;
  onClose: () => void;
  onSuccess: () => void;
}

export function PvUploadModal({ meeting, onClose, onSuccess }: Props) {
  const upload = useUploadPv(meeting.id);
  const [documentUrl, setDocumentUrl] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [attendees, setAttendees] = useState("");
  const [quorum, setQuorum] = useState<string>("");

  async function submit() {
    try {
      await upload.mutateAsync({
        documentUrl: documentUrl.trim(),
        signedBy: signedBy.trim(),
        attendees: attendees.trim()
          ? attendees
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        quorum: quorum ? Number(quorum) : undefined,
      });
      onSuccess();
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = documentUrl.trim().length > 5 && signedBy.trim().length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Téléverser le PV signé</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              Le PV sera archivé et indexé au Registre des délibérations
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              URL du document signé *
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0 text-ink-3" />
              <input
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://ged.terpgroup.com/documents/pv-ca-2025-04-25.pdf"
                className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Signé par *</label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Ex : Président CA + Secrétaire Général"
              className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Présents (un par ligne)
              </label>
              <textarea
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                rows={4}
                placeholder={"M. NDONGMO\nMme TCHATCHOUANG\n…"}
                className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Quorum (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={quorum}
                onChange={(e) => setQuorum(e.target.value)}
                placeholder="75"
                className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {upload.isError && (
            <p className="text-[11.5px] text-rose-600">{(upload.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || upload.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> Archiver le PV
          </button>
        </footer>
      </div>
    </div>
  );
}
