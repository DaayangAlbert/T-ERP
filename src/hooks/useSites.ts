"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SiteStatus, SiteType, AlertSeverity } from "@prisma/client";

export interface SiteListItem {
  id: string;
  code: string;
  name: string;
  client: string;
  type: SiteType;
  region: string | null;
  budget: string;
  startDate: string;
  plannedEndDate: string;
  actualEndDate: string | null;
  progress: number;
  margin: number;
  status: SiteStatus;
  manager: { id: string; firstName: string; lastName: string } | null;
}

export interface SitesSummary {
  activeCount: number;
  totalBudget: string;
  avgMargin: number;
  alertsCount: number;
}

export interface SitesListResponse {
  items: SiteListItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  summary: SitesSummary;
}

export interface SiteDetail extends Omit<SiteListItem, "manager"> {
  manager: { id: string; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SitesFilters {
  page?: number;
  limit?: number;
  status?: SiteStatus | "";
  type?: SiteType | "";
  region?: string;
  q?: string;
}

async function fetchSites(filters: SitesFilters): Promise<SitesListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.region) params.set("region", filters.region);
  if (filters.q) params.set("q", filters.q);
  const res = await fetch(`/api/sites?${params}`);
  if (!res.ok) throw new Error("Erreur de chargement");
  return res.json();
}

export function useSites(filters: SitesFilters = {}) {
  return useQuery({
    queryKey: ["sites", filters],
    queryFn: () => fetchSites(filters),
    staleTime: 15_000,
  });
}

export interface SiteFinancing {
  label: string;
  amountHT: string;
}

export function useSite(id: string | null) {
  return useQuery({
    queryKey: ["site", id],
    queryFn: async (): Promise<SiteDetail & {
      contract: ContractInfo | null;
      counts: { alerts: number; photos: number; decisions: number };
      lat: number | null;
      lng: number | null;
      financingType: "SINGLE" | "JOINT";
      financings: SiteFinancing[];
      vatRate: number;
      irRate: number;
      durationMonths: number | null;
    }> => {
      const res = await fetch(`/api/sites/${id}`);
      if (!res.ok) throw new Error("Chantier introuvable");
      return res.json();
    },
    enabled: Boolean(id),
  });
}

// Phase 2 / Bloc 3 — fn 3.1 ============================================

export interface ContractInfo {
  id: string;
  reference: string;
  initialAmount: string;
  currentAmount: string;
  amendments: Array<{ ref: string; amount: string; date: string; reason: string; validatedBy?: string }>;
  guarantees: { caution?: string; retention?: string; penalties?: string };
  paymentTerms: string | null;
  publicMarket: boolean;
  procuringEntity: string | null;
  signedAt: string | null;
}

export interface SiteMapItem {
  id: string;
  code: string;
  name: string;
  client: string;
  type: SiteType;
  region: string | null;
  budget: string;
  progress: number;
  margin: number;
  status: SiteStatus;
  lat: number;
  lng: number;
}

export interface SitePerfRow {
  id: string;
  code: string;
  name: string;
  client: string;
  status: SiteStatus;
  region: string | null;
  budget: string;
  progress: number;
  margin: number;
  financialProgress: number;
  variance: number;
  realizedMargin: number;
  dso: number;
  hseStatus: "GOOD" | "WATCH" | "INCIDENT";
}

export interface ContractListItem {
  id: string;
  siteId: string;
  site: { id: string; code: string; name: string; client: string; status: SiteStatus };
  reference: string;
  initialAmount: string;
  currentAmount: string;
  amendmentsCount: number;
  amendments: Array<{ ref?: string; amount?: string; date?: string; reason?: string }>;
  guarantees: { caution?: string; retention?: string; penalties?: string };
  paymentTerms: string | null;
  publicMarket: boolean;
  procuringEntity: string | null;
  signedAt: string | null;
  createdAt: string;
}

export interface SiteAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface SitePhoto {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  uploadedBy: string;
}

export interface SiteDecision {
  id: string;
  title: string;
  body: string;
  author: { name: string; role: string | null };
  createdAt: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useSitesMap() {
  return useQuery({
    queryKey: ["sites", "map"],
    queryFn: () => getJson<{ items: SiteMapItem[] }>(`/api/sites/map`),
  });
}

export function useSitesPerformance() {
  return useQuery({
    queryKey: ["sites", "performance"],
    queryFn: () =>
      getJson<{
        rows: SitePerfRow[];
        summary: { total: number; averageMargin: number; averageDso: number; drifting: number; atRisk: number };
        topMargins: SitePerfRow[];
        worstDrifts: SitePerfRow[];
      }>(`/api/sites/performance`),
  });
}

export function useSiteContracts() {
  return useQuery({
    queryKey: ["sites", "contracts"],
    queryFn: () =>
      getJson<{
        items: ContractListItem[];
        summary: { total: number; publicCount: number; privateCount: number; totalCurrent: string };
      }>(`/api/sites/contracts`),
  });
}

export function useSiteAlerts(siteId: string | null) {
  return useQuery({
    queryKey: ["site", siteId, "alerts"],
    queryFn: () => getJson<{ items: SiteAlert[] }>(`/api/sites/${siteId}/alerts`),
    enabled: Boolean(siteId),
  });
}

export function useSitePhotos(siteId: string | null) {
  return useQuery({
    queryKey: ["site", siteId, "photos"],
    queryFn: () => getJson<{ items: SitePhoto[] }>(`/api/sites/${siteId}/photos`),
    enabled: Boolean(siteId),
  });
}

export function useSiteDecisions(siteId: string | null) {
  return useQuery({
    queryKey: ["site", siteId, "decisions"],
    queryFn: () => getJson<{ items: SiteDecision[] }>(`/api/sites/${siteId}/decisions`),
    enabled: Boolean(siteId),
  });
}

export function useCreateSiteDecision(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string }) =>
      getJson(`/api/sites/${siteId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site", siteId, "decisions"] }),
  });
}

export function useAddAmendment(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ref: string; amount: string; date: string; reason: string }) =>
      getJson<{ ok: true; currentAmount: string }>(`/api/sites/${siteId}/contracts/amendments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site", siteId] });
      qc.invalidateQueries({ queryKey: ["sites", "contracts"] });
    },
  });
}
