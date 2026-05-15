import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role } from "@prisma/client";
import { normalizeCmPhone } from "@/lib/ouv/phone";

export const dynamic = "force-dynamic";

// GET /api/ouv/team
// Renvoie l'équipe coffrage (ou ferraillage / maçonnerie / etc. selon
// la spécialité de l'ouvrier) du chantier d'affectation, avec leurs
// statuts de présence du jour. L'ouvrier connecté est inclus pour qu'il
// se repère ("← moi" côté UI).
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      position: true,
      assignedSiteIds: true,
    },
  });
  if (!me) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const primarySiteId = me.assignedSiteIds[0];
  if (!primarySiteId) {
    return NextResponse.json({
      site: null,
      specialty: null,
      members: [],
      stats: { total: 0, present: 0, absent: 0, notPointed: 0 },
    });
  }

  const site = await prisma.site.findUnique({
    where: { id: primarySiteId },
    select: { id: true, code: true, name: true },
  });

  // Heuristique spécialité par mot-clé sur position (ex: "Maçon-coffreur")
  // — si rien ne matche, on prend tous les WORKER du chantier
  const specialtyTerm = guessSpecialty(me.position);

  const members = await prisma.user.findMany({
    where: {
      assignedSiteIds: { has: primarySiteId },
      role: Role.WORKER,
      ...(specialtyTerm
        ? {
            OR: [
              { position: { contains: specialtyTerm, mode: "insensitive" } },
              { workerQualification: { contains: specialtyTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ teamLeader: "desc" }, { firstName: "asc" }],
    take: 30,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      workerQualification: true,
      avatarUrl: true,
      teamLeader: true,
      phone: true,
      phoneMobile: true,
    },
  });

  // Présence du jour
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayReports = await prisma.timeReport.findMany({
    where: { userId: { in: members.map((m) => m.id) }, date: today },
    select: { userId: true, status: true, arrivalTime: true, departureTime: true },
  });
  const presenceByUser = new Map(todayReports.map((r) => [r.userId, r]));

  const serialized = members.map((m) => {
    const r = presenceByUser.get(m.id);
    const isMe = m.id === me.id;
    const presenceState: "PRESENT" | "ABSENT" | "NOT_POINTED" = !r
      ? "NOT_POINTED"
      : r.status === "PRESENT"
        ? "PRESENT"
        : "ABSENT";
    const phoneE164 = normalizeCmPhone(m.phoneMobile ?? m.phone ?? "");
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      fullName: `${m.firstName} ${m.lastName}`,
      initials: `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase(),
      avatarUrl: m.avatarUrl,
      qualification: m.workerQualification ?? m.position ?? "Ouvrier",
      teamLeader: m.teamLeader,
      isMe,
      presenceState,
      arrivalTime: r?.arrivalTime?.toISOString() ?? null,
      absentReason: r && r.status !== "PRESENT" ? r.status : null,
      // Téléphone visible uniquement pour les contacts internes — pas de
      // numéro perso, contact pro seulement
      phoneE164,
      whatsappUrl: phoneE164 && !isMe ? `https://wa.me/${phoneE164.replace("+", "")}` : null,
      telUrl: phoneE164 && !isMe ? `tel:${phoneE164}` : null,
    };
  });

  const stats = {
    total: serialized.length,
    present: serialized.filter((m) => m.presenceState === "PRESENT").length,
    absent: serialized.filter((m) => m.presenceState === "ABSENT").length,
    notPointed: serialized.filter((m) => m.presenceState === "NOT_POINTED").length,
  };

  return NextResponse.json({
    site,
    specialty: specialtyLabel(specialtyTerm),
    members: serialized,
    stats,
  });
}

function guessSpecialty(position: string | null): string | null {
  if (!position) return null;
  const norm = position.toLowerCase();
  // Cherche un mot-clé connu — sinon on retourne null pour récupérer
  // toute l'équipe ouvriers du chantier
  const keywords = [
    "coffr",
    "ferrai",
    "maçon",
    "macon",
    "manœuvre",
    "manoeuvre",
    "journ",
    "engin",
    "électric",
    "electric",
    "plomb",
    "soud",
    "mécan",
    "mecan",
    "peintre",
    "carreleur",
    "gardien",
  ];
  for (const k of keywords) {
    if (norm.includes(k)) return k;
  }
  return null;
}

function specialtyLabel(term: string | null): string | null {
  if (!term) return null;
  // Le tronc partagé : ex "coffr" → "coffrage"
  if (term.startsWith("coffr")) return "coffrage";
  if (term.startsWith("ferrai")) return "ferraillage";
  if (term.startsWith("maço") || term.startsWith("maco")) return "maçonnerie";
  if (term.startsWith("man")) return "manœuvres";
  if (term.startsWith("journ")) return "journaliers";
  if (term.startsWith("engin")) return "conducteurs d'engins";
  if (term.startsWith("électric") || term.startsWith("electric")) return "électricité";
  if (term.startsWith("plomb")) return "plomberie";
  if (term.startsWith("soud")) return "soudure";
  if (term.startsWith("mécan") || term.startsWith("mecan")) return "mécanique";
  if (term.startsWith("peintre")) return "peinture";
  if (term.startsWith("carreleur")) return "carrelage";
  if (term.startsWith("gardien")) return "gardiennage";
  return term;
}
