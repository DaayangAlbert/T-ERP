import { create } from "zustand";

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
}

interface TenantState {
  tenant: TenantSummary | null;
  setTenant: (tenant: TenantSummary | null) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
}));
