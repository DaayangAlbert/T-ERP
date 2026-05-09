"use client";

import { useState } from "react";
import { Pen, Save, ShieldCheck } from "lucide-react";
import { useSignature, useUploadSignature } from "@/hooks/useDgProfile";

export function SignatureUploader() {
  const { data, isLoading } = useSignature();
  const upload = useUploadSignature();
  const [signatureUrl, setSignatureUrl] = useState("");
  const [initialsUrl, setInitialsUrl] = useState("");
  const [saved, setSaved] = useState(false);

  if (isLoading) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  const submit = async () => {
    await upload.mutateAsync({
      signatureUrl: signatureUrl || data?.signatureUrl || null,
      initialsUrl: initialsUrl || data?.initialsUrl || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-[12.5px] text-success">
        <ShieldCheck className="mr-1 inline h-4 w-4" />
        Signature numérique conforme eIDAS niveau « avancé » (chiffrement asymétrique).
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <Pen className="mr-1 inline h-3.5 w-3.5" /> Signature manuscrite
          </h3>
          {data?.signatureUrl ? (
            <div className="mb-3 grid h-24 place-items-center rounded-md border border-line bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.signatureUrl} alt="Signature" className="max-h-20" />
            </div>
          ) : (
            <div className="mb-3 grid h-24 place-items-center rounded-md border border-dashed border-line bg-surface-alt text-[11px] text-ink-3">
              Aucune signature enregistrée
            </div>
          )}
          <input
            value={signatureUrl}
            onChange={(e) => setSignatureUrl(e.target.value)}
            placeholder="URL signature PNG (transparente)"
            className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]"
          />
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Paraphe</h3>
          {data?.initialsUrl ? (
            <div className="mb-3 grid h-24 place-items-center rounded-md border border-line bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.initialsUrl} alt="Paraphe" className="max-h-20" />
            </div>
          ) : (
            <div className="mb-3 grid h-24 place-items-center rounded-md border border-dashed border-line bg-surface-alt text-[11px] text-ink-3">
              Aucun paraphe
            </div>
          )}
          <input
            value={initialsUrl}
            onChange={(e) => setInitialsUrl(e.target.value)}
            placeholder="URL paraphe PNG"
            className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[13px]"
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] text-success">✓ Signature mise à jour</span>}
        <button
          type="button"
          onClick={submit}
          disabled={upload.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-500 px-3.5 text-[12.5px] font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" /> {upload.isPending ? "Envoi…" : "Enregistrer"}
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-3 disabled:cursor-not-allowed"
        >
          Tester sur un document (V2)
        </button>
      </div>
    </div>
  );
}
