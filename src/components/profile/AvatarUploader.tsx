"use client";

import { useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { compressImage } from "@/lib/image-compress";

interface Props {
  /** Mode compact : carte plus petite, idéal pour intégration dans un Mon espace métier. */
  compact?: boolean;
}

/**
 * Carte autonome de gestion de la photo de profil — accessible à tous
 * les rôles, intégrable dans n'importe quel "Mon espace" sans dépendre
 * d'un formulaire parent.
 *
 * - Compression côté client (canvas resize + JPEG 0.85).
 * - Accepte jusqu'à 10 Mo en entrée, stocke ~50-200 ko en base64.
 * - Met à jour user.avatarUrl via PUT /api/users/me (l'avatar se
 *   propage automatiquement dans le header).
 */
export function AvatarUploader({ compact = false }: Props) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [status, setStatus] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const currentAvatar = profile?.avatarUrl ?? user?.avatarUrl ?? null;
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : "??";

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ tone: "error", text: "Le fichier doit être une image." });
      return;
    }
    if (file.size > 10_000_000) {
      setStatus({ tone: "error", text: "Image trop volumineuse (10 Mo max en entrée)." });
      return;
    }
    setUploading(true);
    setStatus({ tone: "info", text: "Compression en cours…" });
    try {
      const result = await compressImage(file, {
        maxDimension: 512,
        quality: 0.85,
        outputType: "image/jpeg",
      });
      await update.mutateAsync({ avatarUrl: result.dataUrl });
      setStatus({
        tone: "ok",
        text: `Photo enregistrée · ${result.originalSizeKb} ko → ${result.compressedSizeKb} ko (${result.width}×${result.height}).`,
      });
    } catch (err) {
      setStatus({
        tone: "error",
        text: err instanceof Error ? err.message : "Échec de l'upload.",
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer ma photo de profil ?")) return;
    setUploading(true);
    try {
      await update.mutateAsync({ avatarUrl: null });
      setStatus({ tone: "ok", text: "Photo supprimée." });
    } catch (err) {
      setStatus({
        tone: "error",
        text: err instanceof Error ? err.message : "Suppression échouée.",
      });
    } finally {
      setUploading(false);
    }
  };

  const avatarSize = compact ? "h-14 w-14" : "h-20 w-20";

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h2 className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-2">
        <Camera className="h-4 w-4 text-primary-600" /> Photo de profil
      </h2>
      <p className="mt-1 text-[11.5px] text-ink-3">
        Compressée automatiquement avant envoi (max 512×512, ~150 ko).
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {currentAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAvatar}
            alt="Avatar"
            className={`${avatarSize} rounded-full object-cover ring-1 ring-line`}
          />
        ) : (
          <div
            className={`grid ${avatarSize} place-items-center rounded-full bg-primary-100 text-lg font-bold text-primary-700`}
          >
            {initials}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <label
            className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12.5px] font-medium text-white hover:bg-primary-600 ${
              uploading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {currentAvatar ? "Changer la photo" : "Ajouter une photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {currentAvatar && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-danger hover:text-danger disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          )}
        </div>
      </div>

      {status && (
        <p
          className={`mt-2 rounded px-2 py-1 text-[11.5px] ${
            status.tone === "ok"
              ? "bg-success/10 text-success"
              : status.tone === "error"
                ? "bg-danger/10 text-danger"
                : "bg-info/10 text-info"
          }`}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}
