import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().min(2).max(120),
  position: z.string().max(120).optional().or(z.literal("")),
  companyName: z.string().min(2).max(160),
  employeesRange: z.string().max(20).optional(),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  source: z.string().max(160).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const dr = await prisma.demoRequest.create({
    data: {
      fullName: data.fullName,
      position: data.position || null,
      companyName: data.companyName,
      employeesRange: data.employeesRange || null,
      email: data.email,
      phone: data.phone || null,
      message: data.message || null,
      source: data.source ?? null,
    },
    select: { id: true },
  });

  // TODO prod: envoyer email Resend "Nouvelle demande démo" à sales@terp.cm
  return NextResponse.json({ ok: true, id: dr.id }, { status: 201 });
}
