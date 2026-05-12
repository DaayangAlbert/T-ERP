"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface EmpProfileResponse {
  employee: {
    id: string;
    matricule: string | null;
    firstName: string;
    lastName: string;
    email: string;
    personalEmail: string | null;
    avatarUrl: string | null;
    position: string | null;
    category: string | null;
    professionalCategory: string | null;
    hireDate: string | null;
    contractType: string | null;
    seniorityYears: number | null;
    teamLeader: boolean;
    preferredLanguage: string;
    notificationChannel: string;
    phoneMobile: string | null;
    dateOfBirth: string | null;
    cniNumber: string | null;
    address: string | null;
    familyStatus: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    cnpsNumber: string | null;
    niu: string | null;
    bankName: string | null;
    bankAgency: string | null;
    rib: string | null;
    assignedSite: { id: string; code: string; name: string } | null;
  };
}

export interface EmpDocument {
  id: string;
  category: "CONTRACT" | "CERTIFICATE" | "ATTESTATION" | "TRAINING";
  title: string;
  issuedAt: string;
  expiresAt: string | null;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  downloadUrl: string;
}

export interface EmpPolicy {
  id: string;
  title: string;
  version: string;
  publishedAt: string;
  category: string;
  acknowledgmentRequired: boolean;
}

export function useEmpProfile() {
  return useQuery<EmpProfileResponse>({
    queryKey: ["emp", "profile"],
    queryFn: async () => {
      const r = await fetch("/api/emp/profile", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur chargement profil");
      return r.json();
    },
  });
}

export function useEmpDocuments() {
  return useQuery<{ items: EmpDocument[] }>({
    queryKey: ["emp", "documents"],
    queryFn: async () => {
      const r = await fetch("/api/emp/documents", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur chargement documents");
      return r.json();
    },
  });
}

export function useEmpPolicies() {
  return useQuery<{ items: EmpPolicy[] }>({
    queryKey: ["emp", "policies"],
    queryFn: async () => {
      const r = await fetch("/api/emp/policies", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur chargement politiques");
      return r.json();
    },
  });
}

export function useRequestProfileModification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { field: string; newValue: string; justification: string }) => {
      const r = await fetch("/api/emp/profile/modification-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur demande");
      }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emp", "profile"] }),
  });
}
