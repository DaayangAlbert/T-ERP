"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface TenantConfig {
  identity: unknown;
  modules: Record<string, { active: boolean; activatedAt?: string; activatedBy?: string }>;
  payrollRates: unknown;
  workflows: unknown;
  notifications: unknown;
  integrations: unknown;
  updatedAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTenantConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => fetchJson<TenantConfig>(`/api/config`),
  });
}

export function useUpdateConfigSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, payload }: { section: string; payload: unknown }) =>
      fetchJson(`/api/config/${section}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });
}
