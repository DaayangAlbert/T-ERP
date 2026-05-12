import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { TenantPortalHeader } from "@/components/public/recrutement/TenantPortalHeader";
import { TenantPortalHero } from "@/components/public/recrutement/TenantPortalHero";
import { WhyJoinUs } from "@/components/public/recrutement/WhyJoinUs";
import {
  JobsListSection,
  type TenantJobSummary,
} from "@/components/public/recrutement/JobsListSection";
import { RecruitmentProcess } from "@/components/public/recrutement/RecruitmentProcess";
import { SpontaneousApplicationForm } from "@/components/public/recrutement/SpontaneousApplicationForm";
import { TenantPortalFooter } from "@/components/public/recrutement/TenantPortalFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recrutement — BatimCAM SA",
  description:
    "Toutes nos offres d'emploi BTP au Cameroun. Postulez en ligne en 3 minutes.",
};

interface TenantPayload {
  tenant: {
    id: string;
    slug: string;
    name: string;
    primaryColor: string | null;
    logoUrl: string | null;
    sector: string | null;
  };
  jobs: TenantJobSummary[];
  total: number;
}

async function fetchTenantJobs(): Promise<TenantPayload> {
  const cookieHeader = cookies().toString();
  const tenantSlug = headers().get("x-tenant-slug") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/public/tenant-jobs`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
      "x-tenant-slug": tenantSlug,
    },
  });
  if (!res.ok) throw new Error(`Tenant jobs API ${res.status}`);
  return res.json();
}

export default async function RecrutementPage() {
  const data = await fetchTenantJobs();
  const { tenant, jobs } = data;

  return (
    <>
      <TenantPortalHeader
        tenantName={tenant.name}
        primaryColor={tenant.primaryColor}
        logoUrl={tenant.logoUrl}
      />
      <TenantPortalHero
        tenantName={tenant.name}
        sector={tenant.sector}
        primaryColor={tenant.primaryColor}
      />
      <WhyJoinUs />
      <JobsListSection jobs={jobs} primaryColor={tenant.primaryColor} />
      <RecruitmentProcess primaryColor={tenant.primaryColor} />
      <SpontaneousApplicationForm primaryColor={tenant.primaryColor} />
      <TenantPortalFooter
        tenantName={tenant.name}
        primaryColor={tenant.primaryColor}
      />
    </>
  );
}
