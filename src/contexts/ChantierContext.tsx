"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export interface AssignedSite {
  id: string;
  code: string;
  name: string;
  client: string;
  type: string;
  region: string | null;
  progress: number;
  margin: number;
  status: string;
  budget: number;
  plannedEndDate: string;
}

interface ChantierContextValue {
  activeChantierId: string | null;
  activeChantier: AssignedSite | null;
  availableChantiers: AssignedSite[];
  isLoading: boolean;
  switchChantier: (id: string) => void;
}

const STORAGE_KEY = "dtrav.activeChantierId";

const Ctx = createContext<ChantierContextValue | null>(null);

export function ChantierProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "sites"],
    queryFn: async () => {
      const res = await fetch("/api/dtrav/sites", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: AssignedSite[]; scope: { isDirection: boolean; totalAssigned: number } }>;
    },
  });

  const sites = useMemo(() => data?.items ?? [], [data]);

  const [activeId, setActiveId] = useState<string | null>(null);

  // Restore from localStorage and pick a default
  useEffect(() => {
    if (!sites.length) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored && sites.some((s) => s.id === stored)) {
      setActiveId(stored);
    } else {
      setActiveId(sites[0].id);
    }
  }, [sites]);

  const switchChantier = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeChantier = useMemo(
    () => sites.find((s) => s.id === activeId) ?? null,
    [sites, activeId]
  );

  const value: ChantierContextValue = {
    activeChantierId: activeId,
    activeChantier,
    availableChantiers: sites,
    isLoading,
    switchChantier,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChantier() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChantier doit être utilisé dans un <ChantierProvider>");
  return ctx;
}
