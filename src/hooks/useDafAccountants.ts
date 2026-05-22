"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface AccountantItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  avatarUrl: string | null;
  assignedSiteIds: string[];
  isDirection: boolean;
}

export interface AssignableSite {
  id: string;
  code: string;
  name: string;
  client: string;
  status: string;
}

interface AccountantsResponse {
  accountants: AccountantItem[];
  sites: AssignableSite[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafAccountants() {
  return useQuery({
    queryKey: ["daf", "accountants"],
    queryFn: () => getJson<AccountantsResponse>(`/api/daf/accountants`),
  });
}

export function useAssignAccountantSites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, siteIds }: { id: string; siteIds: string[] }) =>
      getJson<{ ok: true; assignedSiteIds: string[]; isDirection: boolean }>(
        `/api/daf/accountants/${id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteIds }) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accountants"] }),
  });
}
