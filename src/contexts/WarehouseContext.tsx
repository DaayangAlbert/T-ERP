"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

export interface MagWarehouse {
  id: string;
  code: string;
  name: string;
  keeperId: string | null;
  site: { id: string; code: string; name: string };
}

interface WarehouseContextValue {
  warehouse: MagWarehouse | null;
  isLoading: boolean;
}

const Ctx = createContext<WarehouseContextValue | null>(null);

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["mag", "warehouse"],
    queryFn: async (): Promise<MagWarehouse | null> => {
      const res = await fetch("/api/mag/warehouse", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json();
      return json.warehouse ?? null;
    },
    staleTime: 60_000,
  });

  return <Ctx.Provider value={{ warehouse: data ?? null, isLoading }}>{children}</Ctx.Provider>;
}

export function useWarehouse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWarehouse doit être utilisé dans un <WarehouseProvider>");
  return ctx;
}
