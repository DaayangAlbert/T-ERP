"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";

interface Props {
  siteId: string;
  onUploaded?: () => void;
}

/**
 * Bouton de capture photo terrain : ouvre directement la caméra arrière du téléphone.
 * Compression simple côté client (resize 1920×1080 max, qualité 0.8) avant upload.
 */
export function PhotoCaptureButton({ siteId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);

    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append("file", compressed, file.name);
      form.append("takenAt", new Date().toISOString());

      // Géolocalisation (best effort)
      const pos = await getPosition().catch(() => null);
      if (pos) {
        form.append("lat", String(pos.coords.latitude));
        form.append("lng", String(pos.coords.longitude));
      }

      const res = await fetch(`/api/dtrav/sites/${siteId}/documents/photo`, {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      onUploaded?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ minHeight: 44 }}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[13px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        <Camera className="h-4 w-4" />
        {uploading ? "Envoi…" : "Photo terrain"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="hidden"
      />
      {error && (
        <div className="mt-2 rounded-md bg-danger/10 p-2 text-[12px] text-danger">{error}</div>
      )}
    </>
  );
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const maxW = 1920;
  const maxH = 1080;
  const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.8);
  });
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Pas de géolocalisation"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
  });
}
