"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

export interface EmployeeProfile {
  id: string;
  matricule: string | null;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  professionalCategory: string | null;
  hireDate: string | null;
  seniorityYears: number | null;
  teamLeader: boolean;
  preferredLanguage: string;
  notificationChannel: string;
  phoneMobile: string | null;
  assignedSite: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface EmployeeContextValue {
  employee: EmployeeProfile | null;
  isLoading: boolean;
}

const Ctx = createContext<EmployeeContextValue | null>(null);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["emp", "profile"],
    queryFn: async (): Promise<EmployeeProfile | null> => {
      const res = await fetch("/api/emp/profile", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json();
      return json.employee ?? null;
    },
    staleTime: 60_000,
  });

  return <Ctx.Provider value={{ employee: data ?? null, isLoading }}>{children}</Ctx.Provider>;
}

export function useEmployee() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEmployee doit être utilisé dans un <EmployeeProvider>");
  return ctx;
}
