"use client";

import { useQuery } from "@tanstack/react-query";
import type { ValidationPriority, ValidationStatus, ValidationType, Role } from "@prisma/client";

interface ValidationItem {
  id: string;
  type: ValidationType;
  reference: string;
  title: string;
  description: string | null;
  amount: string | null;
  priority: ValidationPriority;
  status: ValidationStatus;
  currentStep: string | null;
  initiator: string;
  initiatorPosition: string | null;
  workflow: { steps: Array<{ key: string; label: string; role: Role; status: string; decidedByName?: string; decidedAt?: string }> };
  dueDate: string | null;
  ageDays: number;
  createdAt: string;
}

interface Response {
  items: ValidationItem[];
  summary: {
    total: number;
    totalAmount: string;
    averageDelayDays: number;
    monthValidatedCount: number;
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafValidations(filters: { type?: string; status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.type) sp.set("type", filters.type);
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["daf", "validations", filters],
    queryFn: () => getJson<Response>(`/api/daf/validations?${sp.toString()}`),
  });
}
