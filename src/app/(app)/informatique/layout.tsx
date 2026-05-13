"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const ALLOWED_ROLES = ["TENANT_ADMIN", "SUPER_ADMIN"];

export default function ItLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (user && !ALLOWED_ROLES.includes(user.role)) return null;

  return (
    <div data-rh-screen data-it-screen className="rh-page">
      {children}
    </div>
  );
}
