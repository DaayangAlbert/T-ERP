"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContractType, Role } from "@prisma/client";

export interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  employeeId: string | null;
  hireDate: string | null;
  position: string | null;
  category: string | null;
  cnpsNumber: string | null;
  contractType: ContractType | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  tenant: { id: string; slug: string; name: string; primaryColor: string | null } | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<ProfileResponse> => {
      const res = await fetch("/api/users/me");
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { phone?: string; avatarUrl?: string | null }) => {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      // L'espace EMP utilise sa propre queryKey ["emp", "profile"] — on
      // l'invalide aussi pour que l'avatar se rafraîchisse immédiatement
      // sur /employe/profil après upload.
      qc.invalidateQueries({ queryKey: ["emp", "profile"] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
  });
}
