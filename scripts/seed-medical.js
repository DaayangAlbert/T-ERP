require("./_guard-prod");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TYPES_TO_CHECK = ["HIRING", "PERIODIC", "RETURN_TO_WORK", "SPONTANEOUS"];
const VERDICTS = ["FIT", "FIT_WITH_RESTRICTIONS", "UNFIT", "TEMPORARILY_UNFIT"];

// Pool de noms synthétiques camerounais réalistes pour visites
const POOL = [
  { id: "syn_med_001", name: "DJOMO Christian" },
  { id: "syn_med_002", name: "ESSOMBA Carine" },
  { id: "syn_med_003", name: "MBARGA Patrick" },
  { id: "syn_med_004", name: "ATEBA Florence" },
  { id: "syn_med_005", name: "FOUDA Eric" },
  { id: "syn_med_006", name: "ONDOA Linda" },
  { id: "syn_med_007", name: "ABOMO Joseph" },
  { id: "syn_med_008", name: "BIYIK Solange" },
  { id: "syn_med_009", name: "NGUEMA Pascal" },
  { id: "syn_med_010", name: "NTAMACK Sylvie" },
  { id: "syn_med_011", name: "MEKA Roger" },
  { id: "syn_med_012", name: "EKAMI Estelle" },
  { id: "syn_med_013", name: "TSOATA Henri" },
  { id: "syn_med_014", name: "MEFOMO Sandrine" },
  { id: "syn_med_015", name: "BIWOLE Jean-Marie" },
  { id: "syn_med_016", name: "ANDOU Catherine" },
  { id: "syn_med_017", name: "KAMTO Bernard" },
  { id: "syn_med_018", name: "OYONO Sylvie" },
  { id: "syn_med_019", name: "ENGOULOU Daniel" },
  { id: "syn_med_020", name: "BAHANAG Murielle" },
  { id: "syn_med_021", name: "MENGUE Christophe" },
  { id: "syn_med_022", name: "AMOUGOU Béatrice" },
  { id: "syn_med_023", name: "BAYIHA Antoine" },
  { id: "syn_med_024", name: "EVOULA Patricia" },
  { id: "syn_med_025", name: "OWONA Stéphane" },
  { id: "syn_med_026", name: "MVONDO Hortense" },
  { id: "syn_med_027", name: "NDONGO Claude" },
  { id: "syn_med_028", name: "BIDIAS Geneviève" },
  { id: "syn_med_029", name: "EBANGA Yves" },
  { id: "syn_med_030", name: "MBALA Régine" },
];

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  console.log(`🌱 Seed visites médicales pour ${tenant.name}...`);

  // Reset
  await prisma.medicalVisit.deleteMany({ where: { tenantId: tenant.id } });

  const now = Date.now();
  let overdue = 0, scheduled = 0, completed = 0;

  for (const [i, p] of POOL.entries()) {
    let scheduledAt;
    let completedAt = null;
    let fitnessVerdict = null;
    let restrictions = null;

    if (i < 5) {
      // 5 visites en retard (échéance passée non complétée)
      scheduledAt = new Date(now - (3 + i * 5) * 86_400_000);
      overdue++;
    } else if (i < 29) {
      // 24 visites prévues ce mois
      scheduledAt = new Date(now + ((i - 5) * 1.2 + 1) * 86_400_000);
      scheduled++;
    } else {
      // 1 visite passée complétée
      scheduledAt = new Date(now - 30 * 86_400_000);
      completedAt = new Date(now - 28 * 86_400_000);
      fitnessVerdict = "FIT";
      completed++;
    }

    await prisma.medicalVisit.create({
      data: {
        tenantId: tenant.id,
        employeeKey: p.id,
        employeeName: p.name,
        type: TYPES_TO_CHECK[i % TYPES_TO_CHECK.length],
        scheduledAt,
        completedAt,
        fitnessVerdict,
        restrictions,
        doctor: "Dr. NGOUFO Pierre · Médecin du travail",
        notes: completedAt ? "RAS, apte sans restriction." : null,
      },
    });
  }

  console.log(`  ✓ ${POOL.length} visites créées :`);
  console.log(`    - ${overdue} en retard (à programmer urgent)`);
  console.log(`    - ${scheduled} prévues ce mois`);
  console.log(`    - ${completed} récemment complétée`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
