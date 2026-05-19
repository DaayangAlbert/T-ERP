import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";
import { computeCandidateCompletion } from "@/lib/cand-profile";

export const dynamic = "force-dynamic";

const ACTIVE_STAGES = ["RECEIVED", "SHORTLISTED", "INTERVIEW", "TECHNICAL_TEST", "OFFER"] as const;

export async function GET() {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      position: true,
      dateOfBirth: true,
      address: true,
      role: true,
    },
  });
  if (!user || user.role !== Role.CANDIDATE) {
    return NextResponse.json({ error: "Profil candidat introuvable" }, { status: 404 });
  }

  const completionPct = computeCandidateCompletion(user);
  const completionHint = computeCompletionHint(user);

  // 1. Toutes les candidatures actives (pour KPI count + liste top 3)
  const activeApps = await prisma.application.findMany({
    where: { userId: session.sub, stage: { in: [...ACTIVE_STAGES] } },
    include: {
      jobOffer: {
        select: {
          id: true,
          title: true,
          region: true,
          contractType: true,
          tenantId: true,
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  const appIds = activeApps.map((a) => a.id);
  const inInterviewCount = activeApps.filter((a) => a.stage === "INTERVIEW").length;

  // 2. Entretiens à venir (KPI + prochain entretien card focus)
  const upcomingInterviews =
    appIds.length === 0
      ? []
      : await prisma.interview.findMany({
          where: {
            applicationId: { in: appIds },
            scheduledAt: { gt: now },
            completed: false,
          },
          orderBy: { scheduledAt: "asc" },
          take: 5,
        });

  const nextInterviewRow = upcomingInterviews[0] ?? null;
  const nextInterviewApp = nextInterviewRow
    ? activeApps.find((a) => a.id === nextInterviewRow.applicationId)
    : null;

  // Résout dynamiquement le nom du tenant à afficher : priorité à l'entreprise
  // du prochain entretien, sinon de la candidature la plus active, sinon "—".
  let tenantName: string | null = null;
  const referenceAppId = nextInterviewApp?.id ?? activeApps[0]?.id;
  if (referenceAppId) {
    const offer = await prisma.application.findUnique({
      where: { id: referenceAppId },
      select: { jobOffer: { select: { tenant: { select: { name: true } } } } },
    });
    tenantName = offer?.jobOffer?.tenant?.name ?? null;
  }

  // Récupérer le nom de l'interviewer si défini (premier de la liste)
  let interviewerName: string | null = null;
  if (nextInterviewRow?.interviewers?.length) {
    const interviewer = await prisma.user.findUnique({
      where: { id: nextInterviewRow.interviewers[0] },
      select: { firstName: true, lastName: true, position: true },
    });
    if (interviewer) {
      interviewerName = `${interviewer.firstName} ${interviewer.lastName}${
        interviewer.position ? ` (${interviewer.position})` : ""
      }`;
    }
  }

  // 3. Offres recommandées — JobMatch réels (fn 1.5)
  const jobMatches = await prisma.jobMatch.findMany({
    where: {
      candidateId: session.sub,
      score: { gte: 75 },
      dismissedAt: null,
      jobOffer: { status: "PUBLISHED" },
    },
    include: {
      jobOffer: {
        select: {
          id: true,
          title: true,
          region: true,
          contractType: true,
          salaryMin: true,
          salaryMax: true,
          tenant: { select: { name: true } },
        },
      },
    },
    orderBy: { score: "desc" },
  });
  const topMatches = jobMatches.slice(0, 2).map((m) => ({
    id: m.jobOfferId,
    title: m.jobOffer.title,
    region: m.jobOffer.region,
    tenantName: m.jobOffer.tenant.name,
    contractType: m.jobOffer.contractType,
    salaryMin: m.jobOffer.salaryMin,
    salaryMax: m.jobOffer.salaryMax,
    score: m.score,
  }));
  const totalAboveThreshold = jobMatches.length;

  // ---- Sérialisation pour l'UI ----
  return NextResponse.json({
    candidate: {
      firstName: user.firstName,
      lastName: user.lastName,
      tenantName,
      completionPct,
    },
    kpis: {
      activeApplications: activeApps.length,
      applicationsInInterview: inInterviewCount,
      upcomingInterviews: upcomingInterviews.length,
      nextInterviewLabel: nextInterviewRow
        ? labelForNextInterview(nextInterviewRow.scheduledAt)
        : null,
      recommendations: totalAboveThreshold,
      profileCompletion: completionPct,
      profileMissingHint: completionHint,
    },
    nextInterview: nextInterviewRow
      ? {
          id: nextInterviewRow.id,
          scheduledAt: nextInterviewRow.scheduledAt.toISOString(),
          duration: nextInterviewRow.duration,
          mode: nextInterviewRow.mode,
          location: nextInterviewRow.location,
          jobTitle: nextInterviewApp?.jobOffer.title ?? "Entretien programmé",
          interviewerName,
          candidateConfirmed: nextInterviewRow.candidateConfirmed,
        }
      : null,
    activeApplications: activeApps.slice(0, 3).map((a) => ({
      id: a.id,
      jobTitle: a.jobOffer.title,
      region: a.jobOffer.region,
      contractType: a.jobOffer.contractType,
      stage: a.stage,
      appliedAt: a.appliedAt.toISOString(),
      daysSinceApplied: Math.max(
        0,
        Math.floor((now.getTime() - a.appliedAt.getTime()) / 86_400_000),
      ),
    })),
    topMatches: topMatches.map((m) => ({
      jobOfferId: m.id,
      title: m.title,
      region: m.region,
      contractType: m.contractType,
      salaryMin: m.salaryMin ? Number(m.salaryMin) : null,
      salaryMax: m.salaryMax ? Number(m.salaryMax) : null,
      score: m.score,
    })),
    totalRecommendations: totalAboveThreshold,
  });
}

function labelForNextInterview(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  if (diffDays === 0) return `Aujourd'hui · ${time}`;
  if (diffDays === 1) return `Demain · ${time}`;
  return `${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d)} · ${time}`;
}

function computeCompletionHint(user: {
  phone: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  position: string | null;
}): string | null {
  const missing: string[] = [];
  if (!user.phone) missing.push("téléphone");
  if (!user.position) missing.push("poste");
  if (!user.dateOfBirth) missing.push("date de naissance");
  if (!user.address) missing.push("adresse");
  if (missing.length === 0) return null;
  if (missing.length === 1) return `Manque : ${missing[0]}`;
  return `Manque : ${missing.slice(0, 2).join(", ")}${missing.length > 2 ? "…" : ""}`;
}

