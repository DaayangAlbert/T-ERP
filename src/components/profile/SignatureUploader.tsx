"use client";

import { useRef, useState } from "react";
import { Pen, Upload, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { useSignature } from "@/hooks/useDgProfile";

const MAX_BYTES = 1_000_000;
const ACCEPT = "image/png,image/jpeg,image/webp";

type Kind = "signature" | "initials";

export function SignatureUploader() {
  const { data, isLoading, refetch } = useSignature();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  async function uploadFile(kind: Kind, file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`Fichier trop gros (${Math.round(file.size / 1000)} KB / max 1000 KB).`);
      return;
    }
    setBusy(kind);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch("/api/users/me/signature/upload", { method: "POST", body: fd });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Échec de l'upload");
      return;
    }
    refetch();
  }

  async function removeFile(kind: Kind) {
    if (!confirm(`Supprimer ${kind === "signature" ? "la signature" : "le paraphe"} ?`)) return;
    setBusy(kind);
    const res = await fetch(`/api/users/me/signature/upload?kind=${kind}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      setError("Échec de la suppression");
      return;
    }
    refetch();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-[12.5px] text-success">
        <ShieldCheck className="mr-1 inline h-4 w-4" />
        Signature numérique conforme eIDAS niveau « avancé ». Utilisée automatiquement
        sur les bulletins, états de paie, rapports et attestations que vous validez.
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <SignatureCard
          kind="signature"
          title="Signature manuscrite"
          currentUrl={data?.signatureUrl ?? null}
          busy={busy === "signature"}
          onUpload={(f) => uploadFile("signature", f)}
          onRemove={() => removeFile("signature")}
        />
        <SignatureCard
          kind="initials"
          title="Paraphe"
          currentUrl={data?.initialsUrl ?? null}
          busy={busy === "initials"}
          onUpload={(f) => uploadFile("initials", f)}
          onRemove={() => removeFile("initials")}
        />
      </section>

      <p className="text-[11px] text-ink-3">
        Format recommandé : PNG sur fond transparent, max 1 MB, ratio ~3:1 (ex: 600×200 px).
        Une signature scannée nettoyée sur fond blanc fonctionne aussi (JPEG/WEBP).
      </p>
    </div>
  );
}

function SignatureCard({
  kind,
  title,
  currentUrl,
  busy,
  onUpload,
  onRemove,
}: {
  kind: Kind;
  title: string;
  currentUrl: string | null;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        <Pen className="mr-1 inline h-3.5 w-3.5" /> {title}
      </h3>
      {currentUrl ? (
        <div className="mb-3 grid h-24 place-items-center rounded-md border border-line bg-[#fafafa]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt={title} className="max-h-20" />
        </div>
      ) : (
        <div className="mb-3 grid h-24 place-items-center rounded-md border border-dashed border-line bg-surface-alt text-[11px] text-ink-3">
          Aucun fichier
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {busy ? "Upload…" : currentUrl ? "Remplacer" : "Uploader"}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white px-2.5 py-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
