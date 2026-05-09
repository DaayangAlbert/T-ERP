"use client";

import { ChevronDown } from "lucide-react";
import type { TenantSummary } from "@/stores/tenant-store";

interface Props {
  tenant: TenantSummary | null;
  onClick?: () => void;
}

export function TenantBadge({ tenant, onClick }: Props) {
  if (!tenant) return null;
  return (
    <button
      onClick={onClick}
      title={tenant.name}
      className="ml-2 flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-[12px] text-white transition hover:bg-white/15"
    >
      <span
        className="grid h-5 w-5 flex-shrink-0 place-items-center rounded text-[10px] font-bold text-white"
        style={{ background: tenant.primaryColor || "#A855F7" }}
      >
        {tenant.name.charAt(0)}
      </span>
      <span className="max-w-[140px] truncate">{tenant.name}</span>
      <ChevronDown className="h-3 w-3 flex-shrink-0" />
    </button>
  );
}
