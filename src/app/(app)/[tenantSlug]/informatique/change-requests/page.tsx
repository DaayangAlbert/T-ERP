import { cookies, headers } from "next/headers";
import { ChangeRequestsClient } from "@/components/it/ChangeRequestsClient";

export const dynamic = "force-dynamic";

interface Payload {
  stats: { pending: number; approved: number; rejected: number; cancelled: number };
  items: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    reason: string | null;
    changes: unknown;
    reviewComment: string | null;
    reviewedAt: string | null;
    reviewer: string | null;
    createdAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      position: string | null;
    };
  }>;
}

async function fetchData(status: string): Promise<Payload> {
  const cookieHeader = cookies().toString();
  const tenantSlug = headers().get("x-tenant-slug") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(
    `${baseUrl}/api/it/change-requests?status=${encodeURIComponent(status)}`,
    {
      cache: "no-store",
      headers: { cookie: cookieHeader, "x-tenant-slug": tenantSlug },
    },
  );
  if (!res.ok) throw new Error(`Change requests API ${res.status}`);
  return res.json();
}

export default async function ChangeRequestsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const status = searchParams?.status ?? "PENDING";
  const data = await fetchData(status);
  return <ChangeRequestsClient initial={data} initialStatus={status} />;
}
