require("./_guard-prod");
/**
 * Seed des sessions de formation 2026 pour BatimCAM SA.
 * 8 sessions répondant aux besoins BTP au Cameroun :
 *   - 4 sécurité (CACES, SST, hauteur, élec)
 *   - 2 technique (Project, GPS RTK)
 *   - 1 management
 *   - 1 langue
 * Budget total ~13M FCFA.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PLAN_2026 = [
  { ref: "FORM-2026-001", title: "CACES R482 catégorie B1 — Pelles hydrauliques", category: "CACES",      provider: "AFTRAL Cameroun",     startDate: "2026-05-22", endDate: "2026-05-26", expectedParticipants: 12, budget: 2_400_000, status: "CONFIRMED",   location: "Centre AFTRAL Douala" },
  { ref: "FORM-2026-002", title: "SST — Sauveteur Secouriste du Travail",          category: "SAFETY",     provider: "Croix-Rouge Cameroun",startDate: "2026-06-03", endDate: "2026-06-04", expectedParticipants: 24, budget:   720_000, status: "PLANNED",     location: "Siège BatimCAM" },
  { ref: "FORM-2026-003", title: "Habilitation électrique B1V/B2V",                category: "SAFETY",     provider: "Bureau Veritas",      startDate: "2026-06-17", endDate: "2026-06-19", expectedParticipants:  8, budget: 1_350_000, status: "PLANNED",     location: "BV Bonanjo" },
  { ref: "FORM-2026-004", title: "Travail en hauteur (port du harnais)",           category: "SAFETY",     provider: "AFCEP",               startDate: "2026-07-08", endDate: "2026-07-09", expectedParticipants: 16, budget: 1_120_000, status: "PLANNED",     location: "Plateforme Olembé" },
  { ref: "FORM-2026-005", title: "MS Project + Planning chantier",                 category: "TECHNICAL",  provider: "ESITC Cameroun",      startDate: "2026-04-12", endDate: "2026-04-16", expectedParticipants:  6, budget: 1_800_000, status: "COMPLETED",   location: "ESITC Akwa" },
  { ref: "FORM-2026-006", title: "Encadrement d'équipe — niveau 1",                category: "MANAGEMENT", provider: "BatimCAM Academy",    startDate: "2026-04-22", endDate: "2026-04-23", expectedParticipants: 14, budget:   480_000, status: "COMPLETED",   location: "Siège BatimCAM" },
  { ref: "FORM-2026-007", title: "Anglais technique BTP",                          category: "LANGUAGES",  provider: "British Council",     startDate: "2026-09-02", endDate: "2026-12-15", expectedParticipants: 10, budget: 3_500_000, status: "PLANNED",     location: "British Council Bastos" },
  { ref: "FORM-2026-008", title: "Topographie GPS RTK",                            category: "TECHNICAL",  provider: "ENI Bingerville",     startDate: "2026-08-25", endDate: "2026-08-29", expectedParticipants:  4, budget: 1_650_000, status: "PLANNED",     location: "Chantier-école Mbankomo" },
];

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  console.log(`🌱 Seed sessions de formation 2026 pour ${tenant.name}...`);

  let created = 0;
  let updated = 0;
  for (const s of PLAN_2026) {
    const existing = await prisma.trainingSession.findUnique({
      where: { tenantId_ref: { tenantId: tenant.id, ref: s.ref } },
    });
    const data = {
      tenantId: tenant.id,
      ref: s.ref,
      title: s.title,
      category: s.category,
      provider: s.provider,
      startDate: new Date(s.startDate),
      endDate: new Date(s.endDate),
      expectedParticipants: s.expectedParticipants,
      budget: BigInt(s.budget),
      status: s.status,
      location: s.location,
    };
    if (existing) {
      await prisma.trainingSession.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.trainingSession.create({ data });
      created++;
    }
  }

  const total = PLAN_2026.reduce((sum, s) => sum + s.budget, 0);
  console.log(`\n✓ Sessions : ${created} créées, ${updated} mises à jour.`);
  console.log(`  Budget total 2026 : ${(total / 1_000_000).toFixed(1)} M FCFA · ${PLAN_2026.length} sessions`);
  for (const s of PLAN_2026) {
    console.log(`  - ${s.ref} · ${s.title.slice(0, 50)}… · ${s.expectedParticipants} part. · ${(s.budget / 1_000_000).toFixed(2)} M · ${s.status}`);
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
