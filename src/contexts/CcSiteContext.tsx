"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

export interface CcSite {
  id: string;
  code: string;
  name: string;
  client: string;
  region: string | null;
  progress: number;
  status: string;
}

interface CcSiteContextValue {
  site: CcSite | null;
  isLoading: boolean;
}

const Ctx = createContext<CcSiteContextValue | null>(null);

export function CcSiteProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cc", "site"],
    queryFn: async (): Promise<CcSite | null> => {
      const res = await fetch("/api/cc/site", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json();
      return json.site ?? null;
    },
    staleTime: 60_000,
  });

  return <Ctx.Provider value={{ site: data ?? null, isLoading }}>{children}</Ctx.Provider>;
}

export function useCcSite() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCcSite doit être utilisé dans un <CcSiteProvider>");
  return ctx;
}
