"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SignaturePower {
  soloLimit: string;
  coSignLimit: string;
  coSigners: Array<{ id: string; name: string; role: string; position: string | null }>;
  banksRegistered: string[];
  proxyHolders: ProxyHolder[];
}

export interface ProxyHolder {
  id: string;
  toUserId: string;
  name: string;
  position?: string | null;
  scope?: string | null;
  maxAmount?: string | null;
  startDate: string;
  endDate?: string | null;
  active: boolean;
}

export interface AlertPreferences {
  treasuryThreshold: number;
  dsoIncreaseAlert: boolean;
  poAlertThreshold: number;
  taxDeadlineDaysBefore: number;
  channels: string[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useSignaturePower() {
  return useQuery({
    queryKey: ["daf", "profile", "signature-power"],
    queryFn: () => getJson<SignaturePower>(`/api/daf/profile/signature-power`),
  });
}

export function useUpdateSignaturePower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<{ soloLimit: string; coSignLimit: string; coSigners: string[]; banksRegistered: string[] }>) =>
      getJson(`/api/daf/profile/signature-power`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "profile", "signature-power"] }),
  });
}

export function useProxies() {
  return useQuery({
    queryKey: ["daf", "profile", "proxies"],
    queryFn: () => getJson<{ items: ProxyHolder[]; history: ProxyHolder[] }>(`/api/daf/profile/proxies`),
  });
}

export function useCreateProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { toUserId: string; scope?: string; maxAmount?: string; startDate: string; endDate?: string }) =>
      getJson(`/api/daf/profile/proxies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf", "profile", "proxies"] });
      qc.invalidateQueries({ queryKey: ["daf", "profile", "signature-power"] });
    },
  });
}

export function useEndProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/profile/proxies?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf", "profile", "proxies"] });
      qc.invalidateQueries({ queryKey: ["daf", "profile", "signature-power"] });
    },
  });
}

export function useAlertPreferences() {
  return useQuery({
    queryKey: ["daf", "profile", "alerts"],
    queryFn: () => getJson<AlertPreferences>(`/api/daf/profile/alert-preferences`),
  });
}

export function useUpdateAlertPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AlertPreferences>) =>
      getJson(`/api/daf/profile/alert-preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "profile", "alerts"] }),
  });
}
