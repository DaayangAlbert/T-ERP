"use client";

import { useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

// Upload jusqu'à N photos (5 par défaut). Compression auto canvas 1280 max,
// webp 0.75. Boutons caméra et galerie côte-à-côte.
export function HsePhotoUpload({ photos, onChange, max = 5 }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const remaining = Math.max(0, max - photos.length);

  async function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          onChange([...photos, original].slice(0, max));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL("image/webp", 0.75);
        onChange([...photos, out].slice(0, max));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
        Photos ({photos.length}/{max})
      </p>

      {photos.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img src={p} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
                aria-label="Retirer"
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white shadow"
              >
                <X className="h-3 w-3" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("capture", "environment");
                fileInputRef.current.click();
              }
            }}
            className="flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700"
          >
            <Camera className="h-5 w-5 text-rose-600" />
            Photo caméra
          </button>
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
              }
            }}
            className="flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700"
          >
            <ImagePlus className="h-5 w-5 text-rose-600" />
            Galerie
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
