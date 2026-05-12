import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TenantPortalHeader } from "@/components/public/recrutement/TenantPortalHeader";
import { TenantPortalFooter } from "@/components/public/recrutement/TenantPortalFooter";
import { RecruitmentProcess } from "@/components/public/recrutement/RecruitmentProcess";
import {
  JobDetailMain,
  type JobDetail,
} from "@/components/public/recrutement/JobDetailMain";

export const dynamic = "force-dynamic";

interface JobDetailPayload {
  tenant: {
    id: string;
    name: string;
    primaryColor: string | null;
    logoUrl: string | null;
    sector: string | null;
  };
  job: JobDetail & {
    missions: unknown;
    profileItems: unknown;
    benefits: unknown;
  };
}

async function fetchJob(slug: string): Promise<JobDetailPayload | null> {
  const cookieHeader = cookies().toString();
  const tenantSlug = headers().get("x-tenant-slug") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(
    `${baseUrl}/api/public/tenant-jobs/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      headers: { cookie: cookieHeader, "x-tenant-slug": tenantSlug },
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Job detail API ${res.status}`);
  return res.json();
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await fetchJob(params.slug);
  if (!data) return { title: "Offre introuvable" };
  return {
    title: `${data.job.title} — ${data.tenant.name}`,
    description: data.job.summary ?? data.job.description.slice(0, 160),
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await fetchJob(params.slug);
  if (!data) notFound();
  const { tenant, job } = data;
  const normalized: JobDetail = {
    ...job,
    missions: arr(job.missions),
    profileItems: arr(job.profileItems),
    benefits: arr(job.benefits),
  };

  return (
    <>
      <TenantPortalHeader
        tenantName={tenant.name}
        primaryColor={tenant.primaryColor}
        logoUrl={tenant.logoUrl}
      />
      <JobDetailMain
        tenantName={tenant.name}
        primaryColor={tenant.primaryColor}
        job={normalized}
      />
      <RecruitmentProcess primaryColor={tenant.primaryColor} />
      <TenantPortalFooter
        tenantName={tenant.name}
        primaryColor={tenant.primaryColor}
      />
    </>
  );
}
