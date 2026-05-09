"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { NavProgress } from "./NavProgress";
import { Breadcrumbs } from "./Breadcrumbs";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { useAuthStore, type AuthUser } from "@/stores/auth-store";
import { useTenantStore, type TenantSummary } from "@/stores/tenant-store";

interface Props {
  user: AuthUser;
  tenant: TenantSummary | null;
  children: React.ReactNode;
}

export function AuthenticatedShell({ user, tenant, children }: Props) {
  const setUser = useAuthStore((s) => s.login);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [profileOpen, setProfileOpen] = useState(false);

  // Hydrate the client stores with the SSR-fetched session data on mount.
  useEffect(() => {
    setUser(user, "");
    setTenant(tenant);
  }, [user, tenant, setUser, setTenant]);

  return (
    <div className="min-h-screen bg-surface-alt">
      <NavProgress />
      <Header onProfileClick={() => setProfileOpen(true)} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="border-b border-line bg-white px-5 py-3">
            <Breadcrumbs />
          </div>
          <div key={user.id} className="animate-screen-fade-in p-5">
            {children}
          </div>
        </main>
      </div>

      <ProfileSwitcher open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
