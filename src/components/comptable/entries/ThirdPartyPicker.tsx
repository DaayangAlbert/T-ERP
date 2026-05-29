"use client";

import { useEffect, useId, useState } from "react";

interface TiersOption { value: string; label: string }

/** Un compte de classe 40 (fournisseur) ou 41 (client) requiert un tiers. */
export function accountNeedsTiers(code: string): boolean {
  const c = code.trim();
  return c.startsWith("40") || c.startsWith("41");
}

/**
 * Sélecteur de tiers auxiliaire pour les lignes 401/411. Suggestions via
 * /api/comptable/third-parties (fournisseurs ou clients selon le compte).
 * Stocke le libellé du tiers dans line.thirdPartyId (pas de FK dédiée).
 */
export function ThirdPartyPicker({
  accountCode,
  value,
  onChange,
  disabled,
  className,
}: {
  accountCode: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const [items, setItems] = useState<TiersOption[]>([]);

  useEffect(() => {
    if (!accountNeedsTiers(accountCode)) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/comptable/third-parties?account=${encodeURIComponent(accountCode.trim())}`, { credentials: "same-origin" });
        if (res.ok) setItems(((await res.json()) as { items: TiersOption[] }).items);
      } catch {
        /* best-effort */
      }
    }, 150);
    return () => clearTimeout(t);
  }, [accountCode]);

  const placeholder = accountCode.trim().startsWith("41") ? "Client…" : "Fournisseur…";

  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      <datalist id={listId}>
        {items.map((o) => (
          <option key={o.value} value={o.label} />
        ))}
      </datalist>
    </>
  );
}
