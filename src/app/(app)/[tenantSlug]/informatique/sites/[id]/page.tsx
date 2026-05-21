"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SiteFormIT, type SiteFormInitial } from "@/components/sites/SiteFormIT";

export default function EditSitePage() {
  const params = useParams<{ tenantSlug: string; id: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const id = params?.id ?? "";

  const [initial, setInitial] = useState<SiteFormInitial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/it/sites/${id}`);
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          setError(d.error ?? "Chantier introuvable");
          return;
        }
        setInitial((await res.json()) as SiteFormInitial);
      } catch {
        setError("Erreur de chargement");
      }
    })();
  }, [id]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error}
      </div>
    );
  }
  if (!initial) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return <SiteFormIT tenantSlug={tenantSlug} siteId={id} initial={initial} />;
}
