import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resolvePublicTenant } from "@/lib/public-tenant";
import { computeApplicationMatch } from "@/lib/application-score";
import { mailApplicationReceived } from "@/lib/recruitment-mail";

export const dynamic = "force-dynamic";

const MAX_CV_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "cv");

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? full;
  const last = parts.slice(1).join(" ") || first;
  return { first, last };
}

function genPassword(): string {
  return randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 14);
}

/**
 * POST /api/public/tenant-applications
 *   multipart/form-data:
 *     fullName, email, phone, coverLetter, jobOfferSlug, isSpontaneous,
 *     desiredJob (si spontaneous), cv (PDF, optionnel — max 5 Mo)
 */
export async function POST(req: Request) {
  const tenant = await resolvePublicTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Body multipart attendu" },
      { status: 400 },
    );
  }

  const fullName = String(form.get("fullName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const coverLetter = String(form.get("coverLetter") ?? "");
  const jobOfferSlug = String(form.get("jobOfferSlug") ?? "");
  const desiredJob = String(form.get("desiredJob") ?? "");
  const isSpontaneous = form.get("isSpontaneous") === "true";
  const acceptTerms = form.get("acceptTerms") === "true";

  if (fullName.length < 2 || !email.includes("@")) {
    return NextResponse.json(
      { error: "Nom complet et email requis" },
      { status: 400 },
    );
  }
  if (!acceptTerms) {
    return NextResponse.json(
      { error: "Vous devez accepter les CGU" },
      { status: 400 },
    );
  }
  if (!isSpontaneous && !jobOfferSlug) {
    return NextResponse.json(
      { error: "jobOfferSlug requis" },
      { status: 400 },
    );
  }

  // Récupérer l'offre si candidature ciblée
  let jobOffer: { id: string; title: string } | null = null;
  if (!isSpontaneous) {
    jobOffer = await prisma.jobOffer.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ slug: jobOfferSlug }, { id: jobOfferSlug }, { reference: jobOfferSlug }],
        status: "PUBLISHED",
      },
      select: { id: true, title: true },
    });
    if (!jobOffer) {
      return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
    }
  }

  // Upload CV (optionnel)
  let cvUrl: string | null = null;
  const cvFile = form.get("cv");
  if (cvFile instanceof File && cvFile.size > 0) {
    if (cvFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "CV : PDF uniquement" },
        { status: 415 },
      );
    }
    if (cvFile.size > MAX_CV_BYTES) {
      return NextResponse.json({ error: "CV > 5 Mo" }, { status: 413 });
    }
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `${randomBytes(8).toString("hex")}.pdf`;
    await fs.writeFile(
      path.join(UPLOAD_DIR, fileName),
      Buffer.from(await cvFile.arrayBuffer()),
    );
    cvUrl = `/uploads/cv/${fileName}`;
  }

  // Trouver ou créer le User candidat
  const { first, last } = splitName(fullName);
  const existedBefore = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const isNewCandidate = !existedBefore;
  const tempPassword = genPassword();
  const passwordHash = await hashPassword(tempPassword);

  const candidate = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      firstName: first,
      lastName: last,
      phone: phone || null,
      position: desiredJob || null,
      role: Role.CANDIDATE,
      status: UserStatus.ACTIVE,
      tenantId: null,
      emailVerified: false,
      ...(cvUrl ? { cvUrl } : {}),
    },
    update: {
      // Mettre à jour le téléphone / CV si fourni, mais ne pas écraser le mdp
      phone: phone || undefined,
      ...(cvUrl ? { cvUrl } : {}),
    },
    select: { id: true, role: true, email: true },
  });

  // Refuser si l'utilisateur existant n'est pas un CANDIDATE (ex: c'est un EMP du tenant)
  if (candidate.role !== Role.CANDIDATE) {
    return NextResponse.json(
      { error: "Cet email est utilisé par un employé. Connectez-vous." },
      { status: 409 },
    );
  }

  // Création de la candidature
  if (isSpontaneous) {
    // Pour une candidature spontanée, on crée une "offre virtuelle" Spontaneous-{slug}
    // OU on stocke comme notification RH directe. Solution pragmatique :
    // on notifie les RH du tenant et on enregistre dans Notification.
    const hrUsers = await prisma.user.findMany({
      where: { tenantId: tenant.id, role: "HR" },
      select: { id: true },
    });
    for (const hr of hrUsers) {
      await prisma.notification
        .create({
          data: {
            userId: hr.id,
            type: "spontaneous_application",
            title: `Candidature spontanée — ${desiredJob || "Poste libre"}`,
            body: `${fullName} (${email}) a déposé une candidature spontanée.${
              coverLetter ? "\n\n" + coverLetter.slice(0, 500) : ""
            }`,
            link: `/rh/recrutement/spontanees`,
          },
        })
        .catch(() => {});
    }
    return NextResponse.json({
      ok: true,
      type: "spontaneous",
      notified: hrUsers.length,
    });
  }

  if (!jobOffer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  // Vérifier qu'il n'y a pas déjà postulé
  const existing = await prisma.application.findUnique({
    where: { jobOfferId_userId: { jobOfferId: jobOffer.id, userId: candidate.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Vous avez déjà postulé à cette offre" },
      { status: 409 },
    );
  }

  // Scoring auto à la candidature (recalculable ensuite par le RH quand le
  // candidat complète son profil). Best-effort : n'empêche pas la candidature.
  const match = await computeApplicationMatch(candidate.id, jobOffer.id).catch(() => null);

  const application = await prisma.application.create({
    data: {
      jobOfferId: jobOffer.id,
      userId: candidate.id,
      coverLetter: coverLetter || null,
      cvUrl: cvUrl ?? null,
      stage: "RECEIVED",
      score: match?.score ?? null,
    },
    select: { id: true },
  });

  // Notifier les RH du tenant
  const hrUsers = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "HR" },
    select: { id: true },
  });
  for (const hr of hrUsers) {
    await prisma.notification
      .create({
        data: {
          userId: hr.id,
          type: "new_application",
          title: `Nouvelle candidature reçue`,
          body: `${fullName} a postulé à l'offre ${jobOfferSlug}.`,
          link: `/rh/recrutement/candidatures/${application.id}`,
        },
      })
      .catch(() => {});
  }

  // Accusé de réception au candidat (+ accès si nouveau compte). Best-effort.
  await mailApplicationReceived({
    to: candidate.email,
    candidateName: fullName,
    jobTitle: jobOffer.title,
    tenantName: tenant.name,
    tempPassword: isNewCandidate ? tempPassword : null,
  });

  return NextResponse.json(
    {
      ok: true,
      type: "targeted",
      applicationId: application.id,
      candidateEmail: candidate.email,
    },
    { status: 201 },
  );
}
