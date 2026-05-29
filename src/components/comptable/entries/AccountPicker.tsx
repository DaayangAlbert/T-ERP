"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";

interface AccountOption {
  code: string;
  name: string;
  class: string;
  type: string;
  requiresThirdParty: boolean;
}

/**
 * Sélecteur de compte SYSCOHADA branché sur le plan comptable du tenant
 * (/api/comptable/accounts). Suggestions natives via <datalist> : on tape un
 * code ou un libellé, le navigateur propose « code — libellé ».
 *
 * Remplace l'ancien champ libre où le code était saisi à la main (risque
 * d'erreur / de compte inexistant).
 */
export function AccountPicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Compte (ex: 601000)",
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const [options, setOptions] = useState<AccountOption[]>([]);
  const cache = useRef<Map<string, AccountOption[]>>(new Map());

  useEffect(() => {
    if (disabled) return;
    const q = value.trim();
    const key = q.slice(0, 3); // le plan se requête par préfixe de classe/compte
    if (cache.current.has(key)) {
      setOptions(cache.current.get(key)!);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/comptable/accounts?q=${encodeURIComponent(q)}`, { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: AccountOption[] };
        cache.current.set(key, data.items);
        setOptions(data.items);
      } catch {
        /* suggestions best-effort */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [value, disabled]);

  const selected = options.find((o) => o.code === value.trim());

  return (
    <>
      <input
        list={disabled ? undefined : listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        title={selected ? `${selected.code} — ${selected.name}` : undefined}
        className={clsx(className, disabled && "bg-surface-alt text-ink-3")}
      />
      {!disabled && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.code} — {o.name}
            </option>
          ))}
        </datalist>
      )}
    </>
  );
}
