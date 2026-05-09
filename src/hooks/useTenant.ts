import { useTenantStore } from "@/stores/tenant-store";

export function useTenant() {
  const tenant = useTenantStore((s) => s.tenant);
  const setTenant = useTenantStore((s) => s.setTenant);
  return { tenant, setTenant };
}
