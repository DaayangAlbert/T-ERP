"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QcCategory, QcType, LabTestType } from "@prisma/client";

export interface QcCheckpoint {
  label: string;
  expected: string;
  measured: string;
  conform: boolean;
}

export interface QualityControlItem {
  id: string;
  reference: string;
  type: QcType;
  category: QcCategory;
  overallConform: boolean;
  checkpoints: QcCheckpoint[];
  photos: string[];
  notes: string | null;
  phase: string | null;
  location: string | null;
  performedAt: string;
}

export interface QualityResponse {
  items: QualityControlItem[];
  kpis: { monthlyCount: number; openNc: number; conformRate: number };
  nonConformities: Array<{ id: string; reference: string; location: string | null; phase: string | null; notes: string | null; checkpoints: QcCheckpoint[] }>;
}

export interface LabTestItem {
  id: string;
  labName: string;
  testType: LabTestType;
  sampleRef: string;
  samplingDate: string;
  expectedDate: string;
  receivedDate: string | null;
  result: unknown;
  conform: boolean | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useQualityControls() {
  return useQuery({
    queryKey: ["cdt", "qc"],
    queryFn: () => getJson<QualityResponse>("/api/cdt/quality-controls"),
  });
}

export function useCreateQualityControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: QcType; category: QcCategory; phase?: string; location?: string; checkpoints: QcCheckpoint[]; notes?: string }) =>
      getJson(`/api/cdt/quality-controls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "qc"] }),
  });
}

export function useLabTests() {
  return useQuery({
    queryKey: ["cdt", "lab-tests"],
    queryFn: () => getJson<{ items: LabTestItem[]; pending: number }>("/api/cdt/lab-tests"),
  });
}
