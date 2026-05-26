import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20 Mo
const ALLOWED_ATTACHMENT_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "comptable");

function extFromName(name: string, mime: string): string {
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) return name.slice(dot).toLowerCase();
  if (mime === "application/pdf") return ".pdf";
  if (mime.startsWith("image/")) return "." + mime.split("/")[1];
  return "";
}

/** Sauvegarde le fichier sur disque + renvoie l'URL publique servable. */
async function storeAttachment(
  tenantId: string,
  file: File,
): Promise<{ url: string; name: string; mimeType: string; sizeBytes: number }> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const ext = extFromName(file.name, file.type);
  const uuid = randomUUID();
  const relDir = path.join(tenantId, yyyy, mm);
  const absDir = path.join(UPLOAD_ROOT, relDir);
  const filename = `${uuid}${ext}`;
  const absPath = path.join(absDir, filename);
  await mkdir(absDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);
  return {
    url: `/uploads/comptable/${tenantId}/${yyyy}/${mm}/${filename}`,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

// Pour Comptable Chantier : seuls ACH/VTE/CAI sont accessibles. Autres journaux interdits.
const SITE_ACCOUNTANT_JOURNALS = new Set(["ACH", "VTE", "CAI"]);

const lineSchema = z.object({
  accountCode: z.string().min(1, "compte manquant sur une ligne"),
  thirdPartyId: z.string().nullable().optional(),
  description: z.string(),
  debit: z.coerce.number().nonnegative().default(0),
  credit: z.coerce.number().nonnegative().default(0),
  siteId: z.string().nullable().optional(),
});

const createSchema = z.object({
  journalCode: z.string().min(2, "journal invalide"),
  entryDate: z.string().min(1, "date requise"), // ISO
  reference: z.string().min(1, "référence requise (ex: FA-2026-0042)"),
  description: z.string().min(1, "libellé requis"),
  siteId: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(2, "au moins 2 lignes avec un compte renseigné"),
  validate: z.boolean().optional(),
});

// Transforme les erreurs Zod en message FR lisible par l'utilisateur final.
function formatZodError(err: z.ZodError): string {
  const labels: Record<string, string> = {
    journalCode: "Journal",
    entryDate: "Date",
    reference: "Référence",
    description: "Libellé",
    siteId: "Chantier",
    lines: "Lignes",
    accountCode: "Compte",
    debit: "Débit",
    credit: "Crédit",
  };
  const seen = new Set<string>();
  const out: string[] = [];
  for (const issue of err.issues) {
    const top = String(issue.path[0] ?? "");
    const label = labels[top] ?? top;
    const key = label + ":" + issue.message;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${label} : ${issue.message}`);
  }
  return out.length ? out.join(" · ") : "Données invalides";
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const journal = url.searchParams.get("journal");
  const period = url.searchParams.get("period"); // "YYYY-MM"

  const allowed = await getAccessibleSiteIds(session.sub);
  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (journal) where.journalCode = journal;
  if (allowed !== null) where.siteId = { in: allowed };
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [yy, mm] = period.split("-").map(Number);
    where.entryDate = {
      gte: new Date(yy, mm - 1, 1),
      lt: new Date(yy, mm, 1),
    };
  }

  const items = await prisma.entry.findMany({
    where,
    orderBy: { entryDate: "desc" },
    include: {
      lines: true,
      site: { select: { code: true, name: true } },
    },
  });

  // Totaux
  const totalDebit = items.reduce(
    (s, e) => s + e.lines.reduce((a, l) => a + Number(l.debit), 0),
    0
  );
  const totalCredit = items.reduce(
    (s, e) => s + e.lines.reduce((a, l) => a + Number(l.credit), 0),
    0
  );

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      reference: e.reference,
      entryDate: e.entryDate.toISOString(),
      description: e.description,
      journalCode: e.journalCode,
      site: e.site,
      siteId: e.siteId,
      status: e.status,
      attachmentUrl: e.attachmentUrl,
      attachmentName: e.attachmentName,
      attachmentMimeType: e.attachmentMimeType,
      attachmentSizeBytes: e.attachmentSizeBytes ? Number(e.attachmentSizeBytes) : null,
      lines: e.lines.map((l) => ({
        ...l,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })),
      totalDebit: e.lines.reduce((a, l) => a + Number(l.debit), 0),
      totalCredit: e.lines.reduce((a, l) => a + Number(l.credit), 0),
    })),
    totals: { debit: totalDebit, credit: totalCredit, balanced: totalDebit === totalCredit },
    scope: { isDirection: allowed === null, siteIds: allowed },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  // Accepte JSON classique OU multipart (avec pièce jointe `attachment` + `payload`)
  const contentType = req.headers.get("content-type") ?? "";
  let rawPayload: unknown;
  let attachment: File | null = null;
  if (contentType.startsWith("multipart/")) {
    const form = await req.formData();
    const payloadStr = form.get("payload");
    if (typeof payloadStr !== "string") {
      return NextResponse.json({ error: "Champ 'payload' (JSON) manquant" }, { status: 400 });
    }
    try {
      rawPayload = JSON.parse(payloadStr);
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
    }
    const f = form.get("attachment");
    if (f instanceof File && f.size > 0) attachment = f;
  } else {
    rawPayload = await req.json();
  }

  const parsed = createSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error), issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Validation du fichier joint (avant tout traitement)
  if (attachment) {
    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json(
        { error: `Justificatif trop volumineux (max ${MAX_ATTACHMENT_SIZE / 1_000_000} Mo)` },
        { status: 413 },
      );
    }
    if (attachment.type && !ALLOWED_ATTACHMENT_MIME.has(attachment.type)) {
      return NextResponse.json(
        { error: `Type MIME non autorisé : ${attachment.type} — PDF, image ou bureautique uniquement` },
        { status: 415 },
      );
    }
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  // Comptable Chantier : limité aux journaux ACH/VTE/CAI
  if (allowed !== null && !SITE_ACCOUNTANT_JOURNALS.has(parsed.data.journalCode)) {
    return NextResponse.json(
      { error: "Comptable Chantier limité aux journaux ACH, VTE, CAI" },
      { status: 403 }
    );
  }

  // Vérification du périmètre chantier
  if (parsed.data.siteId && !isSiteAllowed(allowed, parsed.data.siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }
  if (allowed !== null && !parsed.data.siteId) {
    return NextResponse.json(
      { error: "Le Comptable Chantier doit rattacher l'écriture à un de ses chantiers" },
      { status: 400 }
    );
  }
  for (const line of parsed.data.lines) {
    if (line.siteId && !isSiteAllowed(allowed, line.siteId)) {
      return NextResponse.json({ error: "Une ligne pointe vers un chantier hors périmètre" }, { status: 403 });
    }
  }

  // Vérification équilibre débit/crédit
  const totalDebit = parsed.data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = parsed.data.lines.reduce((s, l) => s + l.credit, 0);
  if (totalDebit !== totalCredit || totalDebit === 0) {
    return NextResponse.json({ error: "Écriture non équilibrée (débit ≠ crédit)" }, { status: 400 });
  }

  // Stockage du fichier UNE FOIS toutes les validations passées (évite
  // d'écrire un fichier orphelin si la création BDD échoue ensuite).
  let storedAttachment: Awaited<ReturnType<typeof storeAttachment>> | null = null;
  if (attachment) {
    try {
      storedAttachment = await storeAttachment(session.tenantId, attachment);
    } catch (e) {
      return NextResponse.json(
        { error: `Échec sauvegarde justificatif : ${(e as Error).message}` },
        { status: 500 },
      );
    }
  }

  const created = await prisma.entry.create({
    data: {
      tenantId: session.tenantId,
      siteId: parsed.data.siteId ?? null,
      journalCode: parsed.data.journalCode,
      entryDate: new Date(parsed.data.entryDate),
      reference: parsed.data.reference,
      description: parsed.data.description,
      status: parsed.data.validate ? CptEntryStatus.VALIDATED : CptEntryStatus.DRAFT,
      createdById: session.sub,
      validatedById: parsed.data.validate ? session.sub : null,
      validatedAt: parsed.data.validate ? new Date() : null,
      attachmentUrl: storedAttachment?.url ?? null,
      attachmentName: storedAttachment?.name ?? null,
      attachmentMimeType: storedAttachment?.mimeType ?? null,
      attachmentSizeBytes: storedAttachment ? BigInt(storedAttachment.sizeBytes) : null,
      lines: {
        create: parsed.data.lines.map((l) => ({
          accountCode: l.accountCode,
          thirdPartyId: l.thirdPartyId ?? null,
          description: l.description,
          debit: BigInt(Math.round(l.debit)),
          credit: BigInt(Math.round(l.credit)),
          siteId: l.siteId ?? parsed.data.siteId ?? null,
        })),
      },
    },
    include: { lines: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: parsed.data.validate ? "entry.validate" : "entry.create",
      entityType: "Entry",
      entityId: created.id,
      metadata: {
        journal: parsed.data.journalCode,
        amount: totalDebit,
        siteId: parsed.data.siteId,
      },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
