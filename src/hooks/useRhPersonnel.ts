"use client";

import { useQuery } from "@tanstack/react-query";

export interface PersonnelRow {
  id: string;
  matricule: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  category: string;
  contractType: string;
  site: string;
  region: string | null;
  hireDate: string;
  cnpsNumber: string | null;
  isSynthetic: boolean;
}

export interface PersonnelList {
  items: PersonnelRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: {
    categories: string[];
    sites: string[];
    contracts: string[];
    statuses: string[];
  };
}

export interface PersonnelFiche extends PersonnelRow {
  profile: {
    identityCard: string | null;
    familyStatus: string | null;
    childrenCount: number;
    address: { city?: string; neighborhood?: string; line1?: string } | null;
    emergencyContact: { name?: string; phone?: string | null; relation?: string } | null;
    bankAccount: { bank?: string; iban?: string; swift?: string } | null;
  } | null;
  documents: Array<{ id: string; type: string; title: string; fileUrl: string; uploadedAt: string }>;
}

export function usePersonnel(filters: {
  search?: string;
  status?: string;
  category?: string;
  site?: string;
  contract?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (filters.search) sp.set("search", filters.search);
  if (filters.status) sp.set("status", filters.status);
  if (filters.category) sp.set("category", filters.category);
  if (filters.site) sp.set("site", filters.site);
  if (filters.contract) sp.set("contract", filters.contract);
  sp.set("page", String(filters.page ?? 1));
  sp.set("limit", String(filters.limit ?? 8));

  return useQuery({
    queryKey: ["rh", "personnel", filters],
    queryFn: async (): Promise<PersonnelList> => {
      const res = await fetch(`/api/rh/personnel?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });
}

export function usePersonnelFiche(id: string | null) {
  return useQuery({
    queryKey: ["rh", "personnel", "fiche", id],
    queryFn: async (): Promise<PersonnelFiche> => {
      const res = await fetch(`/api/rh/personnel/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(id),
  });
}
