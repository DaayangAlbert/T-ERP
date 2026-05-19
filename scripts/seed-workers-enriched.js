require("./_guard-prod");
// Enrichit TOUS les ouvriers (rôle WORKER) du groupe BatimCAM avec
// des données réalistes BTP camerounais : identité, qualification,
// catégorie pro, banque, contacts urgence, affectation chantier
// (SiteWorkforceMember + assignedSiteIds), et 3 bulletins récents.
//
// Idempotent : safe à relancer (ne dédouble pas les affectations ni
// les payslips, met à jour les champs).
//
// Usage : node scripts/seed-workers-enriched.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ───────────── Catalogues réalistes BTP Cameroun ─────────────
const QUALIFICATIONS = [
  { label: "Maçon-coffreur",        category: "OQ", level: 2, baseSalary: 165_000n },
  { label: "Maçon-coffreur",        category: "OQ", level: 3, baseSalary: 195_000n },
  { label: "Ferrailleur",           category: "OQ", level: 1, baseSalary: 140_000n },
  { label: "Ferrailleur",           category: "OQ", level: 2, baseSalary: 165_000n },
  { label: "Coffreur banche",       category: "OHQ", level: 1, baseSalary: 220_000n },
  { label: "Chef d'équipe coffrage", category: "OHQ", level: 2, baseSalary: 260_000n },
  { label: "Conducteur engin",      category: "OHQ", level: 1, baseSalary: 235_000n },
  { label: "Conducteur niveleuse",  category: "OHQ", level: 2, baseSalary: 280_000n },
  { label: "Électricien BTP",       category: "OQ", level: 2, baseSalary: 175_000n },
  { label: "Plombier BTP",          category: "OQ", level: 1, baseSalary: 145_000n },
  { label: "Carreleur",             category: "OQ", level: 1, baseSalary: 140_000n },
  { label: "Peintre en bâtiment",   category: "OS", level: 2, baseSalary: 110_000n },
  { label: "Manœuvre spécialisé",   category: "OS", level: 1, baseSalary: 90_000n },
  { label: "Manœuvre",              category: "OS", level: 1, baseSalary: 75_000n },
  { label: "Gardien de chantier",   category: "OS", level: 1, baseSalary: 85_000n },
  { label: "Magasinier de chantier", category: "OQ", level: 1, baseSalary: 150_000n },
];

const FIRST_NAMES = [
  "Jean", "Pierre", "Paul", "Joseph", "Michel", "Bernard", "François", "André",
  "Maurice", "Marcel", "Robert", "Henri", "Daniel", "Christian", "Patrick",
  "Eric", "Olivier", "Bruno", "Alain", "Gérard", "Serge", "Roger", "Antoine",
  "Pascal", "Hervé", "Christophe", "Vincent", "Frédéric", "Thomas", "Luc",
  "Emmanuel", "Albert", "Jérôme",
];

const LAST_NAMES = [
  "NDONGO", "MBALLA", "BIYA", "OWONO", "ELOUNDOU", "ATEBA", "ESSOMBA", "NKOMO",
  "FOTSO", "TCHATCHOU", "KAMDEM", "TALLA", "NGOUNOU", "MBARGA", "ATANGANA",
  "ASSOUMOU", "NOAH", "BIKELE", "MENGUE", "NGUEMA", "EYENGA", "NGOA",
];

const DOUALA_NEIGHBORHOODS = [
  "Bonanjo", "Akwa", "Bali", "Bonapriso", "Bonabéri", "New-Bell", "Deido",
  "Bépanda", "Makepe", "Ndokoti", "PK14", "Bonamoussadi",
];

const YAOUNDE_NEIGHBORHOODS = [
  "Bastos", "Mvog-Mbi", "Mendong", "Nlongkak", "Mvog-Ada", "Tsinga",
  "Etoa-Meki", "Mokolo", "Mvan", "Nsam", "Emana", "Odza",
];

const FAMILY_STATUSES = [
  "Célibataire",
  "Marié · 1 enfant",
  "Marié · 2 enfants",
  "Marié · 3 enfants",
  "Marié · 4 enfants",
  "Concubin · 1 enfant",
  "Concubin · 2 enfants",
  "Divorcé · 2 enfants",
];

const BANKS = [
  { name: "Afriland First Bank", agency: "Bonanjo Douala" },
  { name: "Société Générale Cameroun", agency: "Akwa Douala" },
  { name: "BICEC", agency: "Bonabéri" },
  { name: "Ecobank Cameroun", agency: "Akwa Nord" },
  { name: "UBA Cameroun", agency: "Bonanjo" },
];

const PAYMENT_MODES = ["VIREMENT", "VIREMENT", "VIREMENT", "MOMO", "ESPECES"]; // pondération VIREMENT prioritaire

// ───────────── Helpers ─────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n, len = 2) { return String(n).padStart(len, "0"); }

function generateCniNumber() {
  // 9 chiffres aléatoires (format CNI Cameroun simplifié)
  return String(rand(100_000_000, 999_999_999));
}
function generateCnpsNumber() {
  return String(rand(1_000_000_000, 9_999_999_999));
}
function generateNiu() {
  // NIU DGI : Mxxxxxxxxxxxxx avec 13 caractères
  return "M" + String(rand(100_000_000_000_000, 999_999_999_999_999)).slice(0, 13);
}
function generateRib() {
  // 5+5+11+2 chiffres
  return `${rand(10000, 99999)} ${rand(10000, 99999)} ${rand(10000000000, 99999999999)} ${rand(10, 99)}`;
}
function generatePhone() {
  // +237 6XX XX XX XX  →  "+237 6XX XX XX XX"
  return `+237 6${rand(70, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`;
}
function generateBirthDate() {
  // 25 à 50 ans
  const age = rand(25, 50);
  const year = new Date().getFullYear() - age;
  return new Date(year, rand(0, 11), rand(1, 28));
}
function periodToBigInt(date) {
  return BigInt(Math.round(date));
}

// ───────────── Main ─────────────
async function main() {
  console.log("Enrichissement des ouvriers...\n");

  const workers = await prisma.user.findMany({
    where: { role: "WORKER", status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, tenantId: true, matricule: true },
    orderBy: { lastName: "asc" },
  });
  console.log(`Ouvriers actifs trouvés : ${workers.length}\n`);

  // Tous les sites actifs accessibles (groupe BatimCAM = filiales)
  const sites = await prisma.site.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, code: true, name: true, tenantId: true, region: true },
    orderBy: { code: "asc" },
  });
  console.log(`Chantiers actifs disponibles : ${sites.length}\n`);

  let enriched = 0;
  let workforceCreated = 0;
  let workforceSkipped = 0;
  let payslipsCreated = 0;

  for (let i = 0; i < workers.length; i++) {
    const w = workers[i];

    // ── 1) Enrichissement identité + qualif + banque ──
    const qual = QUALIFICATIONS[i % QUALIFICATIONS.length];
    const isGuard = qual.label === "Gardien de chantier";
    const bank = pick(BANKS);
    const cni = generateCniNumber();
    const phone = generatePhone();
    const dob = generateBirthDate();
    const hireYear = new Date().getFullYear() - rand(1, 8);
    const hireDate = new Date(hireYear, rand(0, 11), rand(1, 28));

    const matricule =
      w.matricule ??
      `BTC-${hireYear}-${pad(200 + i, 4)}`;

    // Choix du chantier : un site par roulement (tous les ouvriers
    // assignés à un chantier, distribution équilibrée)
    const targetSite = sites[i % sites.length];
    const region = targetSite.region ?? (i % 2 === 0 ? "Littoral" : "Centre");
    const neighborhood =
      region === "Littoral"
        ? pick(DOUALA_NEIGHBORHOODS)
        : pick(YAOUNDE_NEIGHBORHOODS);

    await prisma.user.update({
      where: { id: w.id },
      data: {
        matricule,
        employeeId: `EMP-${hireYear}-${pad(200 + i, 4)}`,
        hireDate,
        position: qual.label,
        category: qual.category, // OQ / OHQ / OS
        professionalCategory: `${qual.category} · niveau ${qual.level}`,
        echelon: `N${qual.level}`,
        classCategory: qual.category === "OHQ" ? "Classe 5" : qual.category === "OQ" ? "Classe 4" : "Classe 3",
        contractType: "CDI",
        dateOfBirth: dob,
        cniNumber: cni,
        phoneMobile: phone,
        phone: phone,
        personalEmail: `${w.firstName.toLowerCase()}.${w.lastName.toLowerCase()}@gmail.com`.replace(/\s+/g, ""),
        address: `${neighborhood}, ${region === "Littoral" ? "Douala" : "Yaoundé"}`,
        familyStatus: pick(FAMILY_STATUSES),
        emergencyContactName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        emergencyContactPhone: generatePhone(),
        niu: generateNiu(),
        cnpsNumber: generateCnpsNumber(),
        cnpsCardNumber: String(rand(1_000_000_000, 9_999_999_999)),
        bankName: bank.name,
        bankAgency: bank.agency,
        rib: generateRib(),
        workerQualification: qual.label,
        isGuard,
        phoneVerified: true,
        preferredLanguage: "fr-CM",
        notificationChannel: "WHATSAPP",
        assignedSiteIds: [targetSite.id],
      },
    });
    enriched++;

    // ── 2) Affectation chantier (SiteWorkforceMember) ──
    const existingMembership = await prisma.siteWorkforceMember.findUnique({
      where: { siteId_userId: { siteId: targetSite.id, userId: w.id } },
      select: { id: true },
    });
    if (!existingMembership) {
      await prisma.siteWorkforceMember.create({
        data: {
          siteId: targetSite.id,
          userId: w.id,
          role: "WORKER",
          isLeader: qual.category === "OHQ" && qual.label.includes("Chef"),
          startedAt: hireDate,
        },
      });
      workforceCreated++;
    } else {
      workforceSkipped++;
    }

    // ── 3) Bulletins de paie : 3 derniers mois ──
    const baseSalary = qual.baseSalary;
    const baseN = Number(baseSalary);
    const now = new Date();

    for (let m = 0; m < 3; m++) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
      const periodLabel = `${periodDate.getFullYear()}-${pad(periodDate.getMonth() + 1)}`;

      // Heures sup variables (0-24h * 1500 FCFA/h)
      const overtimeHours = rand(0, 24);
      const overtimeAmount = BigInt(overtimeHours * 1500);
      const seniorityBonus = BigInt(Math.round(baseN * 0.04 * Math.min(5, new Date().getFullYear() - hireYear))); // 4%/an plafonné 5 ans
      const transport = 25_000n;

      const gross = baseSalary + overtimeAmount + seniorityBonus + transport;
      const taxable = gross - transport; // transport non imposable
      const cnps = BigInt(Math.round(Number(taxable) * 0.042));   // 4,2 %
      const irpp = BigInt(Math.round(Number(taxable) * 0.10));    // 10 % approx pour barème ouvrier
      const net = gross - cnps - irpp;

      const periodLabelStr = periodLabel;
      const existing = await prisma.payslip.findFirst({
        where: { userId: w.id, periodLabel: periodLabelStr },
        select: { id: true },
      });
      if (existing) continue; // idempotent : skip si déjà créé

      const paymentMode = pick(PAYMENT_MODES);
      const paymentMethod = paymentMode === "VIREMENT" ? "BANK_TRANSFER" : paymentMode === "MOMO" ? "MOBILE_MONEY" : "CASH";

      await prisma.payslip.create({
        data: {
          tenantId: w.tenantId,
          userId: w.id,
          period: periodDate,
          periodLabel: periodLabelStr,
          periodEnd,
          paymentDate: new Date(periodEnd.getTime() + 5 * 86_400_000), // paiement 5j après fin de mois
          paymentMode,
          paymentMethod,
          grossAmount: gross,
          taxableGross: taxable,
          netAmount: net,
          socialCharges: cnps,
          fiscalCharges: irpp,
          employerCharges: BigInt(Math.round(Number(taxable) * 0.168)), // CNPS employeur 16,8%
          baseSalary,
          overtimeAmount,
          overtimeHours,
          seniorityBonus,
          transportAllowance: transport,
          cnpsAmount: cnps,
          irppAmount: irpp,
          paymentBankAccount: paymentMode === "VIREMENT" ? `${bank.name} · ****${rand(1000, 9999)}` : null,
          paymentReference: `BS-${periodLabelStr}-${matricule.slice(-4)}`,
          workedDays: 22,
          reportedHours: 176,
          status: m === 0 ? "PAID" : "PAID",
        },
      });
      payslipsCreated++;
    }

    if ((i + 1) % 5 === 0) {
      console.log(`  ✓ ${i + 1}/${workers.length} ouvriers traités`);
    }
  }

  console.log(`\n──── Résumé ────`);
  console.log(`✓ Profils enrichis              : ${enriched}`);
  console.log(`✓ Affectations chantier créées  : ${workforceCreated} (${workforceSkipped} déjà existantes)`);
  console.log(`✓ Bulletins de paie créés       : ${payslipsCreated}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
