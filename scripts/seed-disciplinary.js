require("./_guard-prod");
/**
 * Seed des cas disciplinaires BatimCAM SA — 11 cas représentatifs sur 12 mois.
 *
 * Distribution :
 *   - 3 cas actifs (en cours d'instruction)
 *   - 6 cas historiques clôturés (12 derniers mois)
 *   - 1 conseil discipline en cours
 *   - 1 départ négocié
 *
 * Cohérent avec le Code du travail Cameroun et la CCM BTP : avertissement,
 * blâme, mise à pied (3/8 jours), licenciement pour faute, licenciement pour
 * faute lourde.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SEED_DATA = [
  { severity: "MINOR",    stage: "PRELIMINARY_INTERVIEW", sanction: null,                       daysAgo: 4,   reason: "Retards répétés (3 fois en 1 mois)",                              facts: "Présentation en retard à 3 reprises entre le 1er et le 30 avril, sans justificatif accepté." },
  { severity: "MAJOR",    stage: "SANCTION_DECIDED",      sanction: "SUSPENSION_3D",            daysAgo: 10,  reason: "Absence non justifiée 2 jours consécutifs",                      facts: "Absence non signalée les 22 et 23 avril 2026 sur chantier Pont Mfoundi." },
  { severity: "MAJOR",    stage: "OPENED",                sanction: null,                       daysAgo: 1,   reason: "Refus consigne sécurité (port harnais)",                          facts: "Refus de port du harnais sur travail en hauteur le 9 mai 2026 malgré rappel chef de chantier." },
  { severity: "MINOR",    stage: "CLOSED",                sanction: "WARNING",                  daysAgo: 45,  reason: "Retards répétés",                                                  facts: "Mise en demeure avec engagement de ponctualité." },
  { severity: "MAJOR",    stage: "CLOSED",                sanction: "SUSPENSION_3D",            daysAgo: 92,  reason: "Insulte hiérarchie",                                               facts: "Échange verbal avec chef d'équipe ayant donné lieu à témoignages." },
  { severity: "MINOR",    stage: "CLOSED",                sanction: "WARNING",                  daysAgo: 130, reason: "Non-respect EPI",                                                  facts: "Casque non porté lors d'inspection HSE." },
  { severity: "CRITICAL", stage: "CLOSED",                sanction: "DISMISSAL_FAULT",          daysAgo: 180, reason: "Vol matériel chantier",                                           facts: "Vol de 4 sacs ciment constaté en sortie de site. Plainte déposée." },
  { severity: "MINOR",    stage: "CLOSED",                sanction: "WARNING",                  daysAgo: 215, reason: "Retard",                                                           facts: "Avertissement écrit." },
  { severity: "MAJOR",    stage: "CLOSED",                sanction: "REPRIMAND",                daysAgo: 240, reason: "Comportement inapproprié",                                       facts: "Comportement signalé par superviseur." },
  { severity: "CRITICAL", stage: "PRELIMINARY_INTERVIEW", sanction: null,                       daysAgo: 7,   reason: "Falsification feuille pointage",                                  facts: "Pointage frauduleux découvert lors audit RH. Entretien préalable programmé 13 mai." },
  { severity: "MAJOR",    stage: "APPEALED",              sanction: "DISMISSAL_FAULT",          daysAgo: 18,  reason: "Insubordination répétée — départ négocié envisagé",              facts: "Multiples refus consignes, négociation départ amiable en cours avec délégué du personnel." },
];

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  // Crée par-dessus les vrais ouvriers seedés (Phase 3)
  const workers = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "WORKER" },
    select: { id: true, firstName: true, lastName: true },
    take: SEED_DATA.length,
  });
  if (workers.length === 0) throw new Error("Aucun WORKER trouvé — lancez d'abord seed-personnel-real.js");

  const rh = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "HR" },
    select: { id: true },
  });
  const createdBy = rh?.id ?? workers[0].id;

  console.log(`🌱 Seed cas disciplinaires pour ${tenant.name}...`);
  await prisma.disciplinaryCase.deleteMany({ where: { tenantId: tenant.id } });

  let active = 0, closed = 0;
  for (const [i, s] of SEED_DATA.entries()) {
    const w = workers[i % workers.length];
    await prisma.disciplinaryCase.create({
      data: {
        tenantId: tenant.id,
        employeeKey: w.id,
        employeeName: `${w.firstName} ${w.lastName}`,
        reason: s.reason,
        severity: s.severity,
        stage: s.stage,
        sanction: s.sanction,
        facts: s.facts,
        documents: [],
        createdBy,
        openedAt: new Date(Date.now() - s.daysAgo * 86_400_000),
        resolvedAt: s.stage === "CLOSED" ? new Date(Date.now() - (s.daysAgo - 5) * 86_400_000) : null,
      },
    });
    if (s.stage === "CLOSED") closed++;
    else active++;
  }

  console.log(`  ✓ ${SEED_DATA.length} cas créés : ${active} actifs · ${closed} clôturés`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
