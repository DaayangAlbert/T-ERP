import { NextResponse } from "next/server";
import { guardMagWarehouse } from "@/lib/rbac/mag-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  const { warehouse } = guard;

  return NextResponse.json({
    warehouse: {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      keeperId: warehouse.keeperId,
      site: warehouse.site,
    },
  });
}
