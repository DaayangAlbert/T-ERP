"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role, UserStatus } from "@prisma/client";

interface UserItem {
  id: string;
  employeeId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  position: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  user: string;
  userEmail: string | null;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: string;
}

interface SessionItem {
  id: string;
  user: { id: string; name: string; email: string; role: Role };
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  suspicious: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useUsers(filters: { page?: number; q?: string; role?: string; status?: string; twoFactor?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.page) sp.set("page", String(filters.page));
  if (filters.q) sp.set("q", filters.q);
  if (filters.role) sp.set("role", filters.role);
  if (filters.status) sp.set("status", filters.status);
  if (filters.twoFactor) sp.set("twoFactor", filters.twoFactor);
  return useQuery({
    queryKey: ["security", "users", filters],
    queryFn: () =>
      fetchJson<{
        items: UserItem[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }>(`/api/security/users?${sp.toString()}`),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
      position?: string;
      password?: string;
    }) =>
      fetchJson<{ id: string; initialPassword?: string; note: string }>(`/api/security/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security", "users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetchJson(`/api/security/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security", "users"] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ status: string }>(`/api/security/users/${id}/suspend`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security", "users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ tempPassword?: string; note: string }>(`/api/security/users/${id}/reset-password`, {
        method: "POST",
      }),
  });
}

export function useAuditLog(filters: { page?: number; q?: string; userId?: string; action?: string; since?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.page) sp.set("page", String(filters.page));
  if (filters.q) sp.set("q", filters.q);
  if (filters.userId) sp.set("userId", filters.userId);
  if (filters.action) sp.set("action", filters.action);
  if (filters.since) sp.set("since", filters.since);
  return useQuery({
    queryKey: ["security", "audit", filters],
    queryFn: () =>
      fetchJson<{
        items: AuditEntry[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }>(`/api/security/audit?${sp.toString()}`),
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["security", "sessions"],
    queryFn: () => fetchJson<{ items: SessionItem[] }>(`/api/security/sessions`),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/security/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security", "sessions"] }),
  });
}
