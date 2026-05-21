"use client";

import { useParams } from "next/navigation";
import { SiteFormIT } from "@/components/sites/SiteFormIT";

export default function NewSitePage() {
  const params = useParams<{ tenantSlug: string }>();
  return <SiteFormIT tenantSlug={params?.tenantSlug ?? ""} />;
}
