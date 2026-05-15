"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface OuvProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  matricule: string | null;
  matriculeShort: string | null;
  cniNumber: string | null;
  qualification: string;
  position: string | null;
  professionalCategory: string | null;
  category: string | null;
  contractType: string | null;
  hireDate: string | null;
  seniorityMonths: number;
  seniorityLabel: string;
  cnpsNumber: string | null;
  niu: string | null;
  bankName: string | null;
  bankAgency: string | null;
  rib: string | null;
  phone: string | null;
  address: string | null;
  familyStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredLanguage: string;
  notificationChannel: string;
  teamLeader: boolean;
  isGuard: boolean;
}

export function useOuvProfile() {
  return useQuery<{ profile: OuvProfile }>({
    queryKey: ["ouv", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/profile", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture profil impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true },
    Error,
    {
      phoneMobile?: string;
      address?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      preferredLanguage?: "fr-CM" | "en-CM";
    }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Mise à jour refusée");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "profile"] });
      qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
    },
  });
}

export function useChangePin() {
  return useMutation<
    { ok: true; message: string },
    Error,
    { currentPin: string; newPin: string }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/profile/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Changement de PIN refusé");
      return json;
    },
  });
}
