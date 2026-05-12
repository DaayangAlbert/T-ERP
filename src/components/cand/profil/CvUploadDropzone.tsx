"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Upload, Trash2 } from "lucide-react";
import { SectionCard } from "./SectionCard";

const MAX_BYTES = 5 * 1024 * 1024;

export function CvUploadDropzone({ initialCvUrl }: { initialCvUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cvUrl, setCvUrl] = useState(initialCvUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Seul un PDF est accepté");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/cand/profile/cv", {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur lors de l'upload");
      return;
    }
    const json = (await res.json()) as { cvUrl: string };
    setCvUrl(json.cvUrl);
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm("Supprimer votre CV ?")) return;
    const res = await fetch("/api/cand/profile/cv", { method: "DELETE" });
    if (!res.ok) {
      setError("Erreur de suppression");
      return;
    }
    setCvUrl(null);
    router.refresh();
  }

  return (
    <SectionCard title="Mon CV" icon={<FileText className="h-4 w-4" />}>
      {cvUrl ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-emerald-50 px-4 py-3">
          <FileText className="h-6 w-6 flex-shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-emerald-700">
              CV téléversé ✓
            </div>
            <Link
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 underline"
            >
              Voir le PDF
            </Link>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-alt"
          >
            Remplacer
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md border border-line bg-white p-1.5 text-ink-3 hover:bg-rose-50 hover:text-rose-700"
            aria-label="Supprimer le CV"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed py-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary-50"
              : "border-line bg-surface-alt hover:bg-primary-50"
          }`}
        >
          <Upload
            className={`h-8 w-8 ${dragOver ? "text-primary" : "text-ink-3"}`}
          />
          <div className="text-sm font-semibold text-ink-2">
            {uploading
              ? "Upload en cours…"
              : "Glissez-déposez votre CV PDF ou cliquez ici"}
          </div>
          <div className="text-xs text-ink-3">PDF, max 5 Mo</div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-ink-3">
        Génération automatique d&apos;un CV à partir du profil disponible en fonction
        future.
      </p>
    </SectionCard>
  );
}
