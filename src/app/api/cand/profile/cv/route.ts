import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME = ["application/pdf"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "cv");

export async function POST(req: Request) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Body multipart attendu" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Champ 'file' manquant" },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Seul un PDF est accepté" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Le fichier dépasse 5 Mo" },
      { status: 413 },
    );
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = ".pdf";
  const fileName = `${session.sub}-${randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buf);

  const publicUrl = `/uploads/cv/${fileName}`;

  await prisma.user.update({
    where: { id: session.sub },
    data: { cvUrl: publicUrl },
  });

  return NextResponse.json({ ok: true, cvUrl: publicUrl });
}

export async function DELETE() {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  await prisma.user.update({
    where: { id: session.sub },
    data: { cvUrl: null },
  });
  return NextResponse.json({ ok: true });
}
