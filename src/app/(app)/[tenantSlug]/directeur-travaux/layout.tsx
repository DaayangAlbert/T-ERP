"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChantierProvider } from "@/contexts/ChantierContext";
import { SiteSwitcher } from "@/components/dtrav/SiteSwitcher";

const ALLOWED_ROLES = ["WORKS_DIRECTOR", "DG", "DAF", "TECH_DIRECTOR", "SUPER_ADMIN"];

export default function DtravLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <ChantierProvider>
      <div data-rh-screen data-dtrav-screen className="rh-page">
        <SiteSwitcher />
        {children}
      </div>
    </ChantierProvider>
  );
}
