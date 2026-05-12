import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { jobOfferId: string } },
) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const match = await prisma.jobMatch.findUnique({
    where: {
      candidateId_jobOfferId: {
        candidateId: session.sub,
        jobOfferId: params.jobOfferId,
      },
    },
  });
  if (!match)
    return NextResponse.json({ error: "Aucun match" }, { status: 404 });

  await prisma.jobMatch.update({
    where: { id: match.id },
    data: { dismissedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
