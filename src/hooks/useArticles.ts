"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ArticleItem {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  unit: string;
}

export const ARTICLE_CATEGORIES: { value: string; label: string }[] = [
  { value: "CEMENT_CONCRETE", label: "Ciment & béton" },
  { value: "STEEL_REBAR", label: "Acier / ferraillage" },
  { value: "AGGREGATES", label: "Agrégats" },
  { value: "FORMWORK", label: "Coffrage" },
  { value: "FUEL", label: "Carburant" },
  { value: "CONSUMABLES", label: "Consommables" },
  { value: "TOOLS", label: "Outillage" },
  { value: "PPE", label: "EPI / sécurité" },
  { value: "OTHER", label: "Autre" },
];

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useArticles() {
  return useQuery({
    queryKey: ["articles"],
    queryFn: () => getJson<{ items: ArticleItem[]; canManage: boolean }>(`/api/articles`),
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; unit: string; code?: string }) =>
      getJson<ArticleItem>(`/api/articles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}
