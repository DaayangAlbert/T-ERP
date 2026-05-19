require("./_guard-prod");
// Synchronise les Chefs de Chantier (rôle SITE_MANAGER) avec la base :
//   1. Crée les CC manquants pour couvrir les 23 chantiers actifs
//      (ratio ~2-3 chantiers par CC, répartis sur les 3 filiales)
//   2. Enrichit tous les CC (identité, banque, qualif, salaire de base)
//   3. Affecte chaque CC à 2-3 chantiers (User.assignedSiteIds +
//      SiteWorkforceMember role=SITE_MANAGER + isLeader=true)
//   4. Génère 3 bulletins de paie récents par CC
//
// Idempotent : safe à rejouer (skip emails déjà pris, skip
// SiteWorkforceMember existants, skip Payslips déjà créés).
//
// Usage : node scripts/seed-site-managers.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

// ───────────── Catalogue CC (10 profils complets) ─────────────
const CC_PROFILES = [
  // ── 3 CC existants à enrichir (clés = lastName actuels) ──
  { firstName: "Jean",       lastName: "KAMGA",        email: "jean.kamga@batimcam.cm" },
  { firstName: "Vincent",    lastName: "ESSAMA",       email: "vincent.essama@batimcam.cm" },
  { firstName: "Jean-Marie", lastName: "BIWOLE",       email: "jeanmarie.biwole@batimcam.cm" },
  // ── 7 nouveaux CC à créer ──
  { firstName: "Bernard",   lastName: "NJOYA",         email: "bernard.njoya@batimcam.cm" },
  { firstName: "Michel",    lastName: "FOTSO",         email: "michel.fotso@batimcam.cm" },
  { firstName: "Raoul",     lastName: "KAMENI",        email: "raoul.kameni@batimcam.cm" },
  { firstName: "Christian", lastName: "TCHAMBA",       email: "christian.tchamba@batimcam.cm" },
  { firstName: "Marcel",    lastName: "AYISSI",        email: "marcel.ayissi@batimcam.cm" },
  { firstName: "Daniel",    lastName: "OWONA",         email: "daniel.owona@batimcam.cm" },
  { firstName: "Patrick",   lastName: "MBALLA-ESSOMBA", email: "patrick.mballa@batimcam.cm" },
];

const QUALIFICATIONS_CC = [
  { label: "Chef de chantier BTP",            level: 8, baseSalary: 320_000n },
  { label: "Chef de chantier confirmé BTP",   level: 9, baseSalary: 380_000n },
  { label: "Chef de chantier senior BTP",     level: 10, baseSalary: 450_000n },
];

const BANKS = [
  { name: "Afriland First Bank", agency: "Bonanjo Douala" },
  { name: "Société Générale Cameroun", agency: "Akwa Douala" },
  { name: "BICEC", agency: "Bonabéri" },
  { name: "Ecobank Cameroun", agency: "Akwa Nord" },
  { name: "UBA Cameroun", agency: "Bonanjo" },
];

const DOUALA_NEIGHBORHOODS = [
  "Bonanjo", "Akwa", "Bali", "Bonapriso", "Bonabéri", "Deido", "Makepe", "Bonamoussadi",
];
const YAOUNDE_NEIGHBORHOODS = [
  "Bastos", "Mvog-Mbi", "Mendong", "Nlongkak", "Mvog-Ada", "Tsinga", "Odza",
];
const FAMILY_STATUSES = [
  "Marié · 2 enfants",
  "Marié · 3 enfants",
  "Marié · 4 enfants",
  "Concubin · 2 enfants",
];

const FIRST_NAMES_EMERGENCY = ["Marie", "Jeanne", "Cécile", "Adèle", "Solange"];
const LAST_NAMES_EMERGENCY = ["NJOYA", "MBALLA", "FOTSO", "TCHATCHOU", "OWONO"];

// ───────────── Helpers ─────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n, len = 2) { return String(n).padStart(len, "0"); }
function generatePhone() { return `+237 6${rand(70, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`; }
function generateCni() { return String(rand(100_000_000, 999_999_999)); }
function generateCnps() { return String(rand(1_000_000_000, 9_999_999_999)); }
function generateNiu() { return "M" + String(rand(100_000_000_000_000, 999_999_999_999_999)).slice(0, 13); }
function generateRib() { return `${rand(10000, 99999)} ${rand(10000, 99999)} ${rand(10000000000, 99999999999)} ${rand(10, 99)}`; }
function generateBirthDate(minAge = 32, maxAge = 55) {
  const age = rand(minAge, maxAge);
  const y = new Date().getFullYear() - age;
  return new Date(y, rand(0, 11), rand(1, 28));
}

async function main() {
  console.log("Synchronisation des Chefs de Chantier...\n");

  // 1) Récupère les tenants (filiales) pour distribution
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE", parentId: { not: null } },
    select: { id: true, slug: true, name: true },
    orderBy: { slug: "asc" },
  });
  console.log(`Filiales détectées : ${tenants.map((t) => t.slug).join(", ")}\n`);

  // 2) Récupère tous les chantiers actifs, groupés par tenant
  const sites = await prisma.site.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, code: true, name: true, tenantId: true, region: true },
    orderBy: [{ tenantId: "asc" }, { code: "asc" }],
  });
  console.log(`Chantiers actifs : ${sites.length}\n`);

  // 3) Pour chaque CC du catalogue : create si nouveau, enrichit sinon
  const ccUsers = [];
  for (let i = 0; i < CC_PROFILES.length; i++) {
    const p = CC_PROFILES[i];

    // Tenant : les 3 premiers (existants) restent sur leur tenant ; les 7
    // nouveaux sont distribués sur les 3 filiales en roulement.
    let targetTenantId;
    if (i < 3) {
      const existing = await prisma.user.findFirst({
        where: { firstName: p.firstName, lastName: p.lastName, role: "SITE_MANAGER" },
        select: { tenantId: true },
      });
      targetTenantId = existing?.tenantId ?? tenants[i % tenants.length].id;
    } else {
      targetTenantId = tenants[(i - 3) % tenants.length].id;
    }

    const qual = QUALIFICATIONS_CC[i % QUALIFICATIONS_CC.length];
    const dob = generateBirthDate();
    const hireYear = new Date().getFullYear() - rand(3, 10);
    const hireDate = new Date(hireYear, rand(0, 11), rand(1, 28));
    const phone = generatePhone();
    const bank = pick(BANKS);
    const isDouala = tenants.find((t) => t.id === targetTenantId)?.slug?.includes("douala");
    const neighborhood = isDouala ? pick(DOUALA_NEIGHBORHOODS) : pick(YAOUNDE_NEIGHBORHOODS);

    const matricule = `BTC-${hireYear}-CC${pad(100 + i, 3)}`;
    const employeeId = `EMP-${hireYear}-CC${pad(100 + i, 3)}`;

    const dataCommon = {
      tenantId: targetTenantId,
      role: "SITE_MANAGER",
      status: "ACTIVE",
      firstName: p.firstName,
      lastName: p.lastName,
      matricule,
      employeeId,
      hireDate,
      position: qual.label,
      category: "Maîtrise",
      professionalCategory: `Maîtrise · catégorie ${qual.level}`,
      echelon: `M${qual.level}`,
      classCategory: `Classe ${qual.level}`,
      contractType: "CDI",
      dateOfBirth: dob,
      cniNumber: generateCni(),
      phoneMobile: phone,
      phone: phone,
      personalEmail: p.email.replace("@batimcam.cm", "@gmail.com"),
      address: `${neighborhood}, ${isDouala ? "Douala" : "Yaoundé"}`,
      familyStatus: pick(FAMILY_STATUSES),
      emergencyContactName: `${pick(FIRST_NAMES_EMERGENCY)} ${pick(LAST_NAMES_EMERGENCY)}`,
      emergencyContactPhone: generatePhone(),
      niu: generateNiu(),
      cnpsNumber: generateCnps(),
      cnpsCardNumber: String(rand(1_000_000_000, 9_999_999_999)),
      bankName: bank.name,
      bankAgency: bank.agency,
      rib: generateRib(),
      preferredLanguage: "fr-CM",
      notificationChannel: "WHATSAPP",
      emailVerified: true,
    };

    // Upsert via email (unique). passwordHash seulement si nouvel utilisateur.
    const existing = await prisma.user.findUnique({
      where: { email: p.email },
      select: { id: true },
    });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: dataCommon,
      });
    } else {
      const passwordHash = await bcrypt.hash("CC2026!terp", 10);
      user = await prisma.user.create({
        data: {
          ...dataCommon,
          email: p.email,
          passwordHash,
        },
      });
    }
    ccUsers.push({ ...user, baseSalary: qual.baseSalary });
  }

  console.log(`✓ ${ccUsers.length} CC créés/enrichis\n`);

  // 4) Distribution des chantiers entre CC
  //    Stratégie : chaque CC gère 2-3 chantiers de son tenant. Si pas assez
  //    de chantiers dans son tenant, on étend au groupe.
  const sitesByTenant = new Map();
  for (const s of sites) {
    if (!sitesByTenant.has(s.tenantId)) sitesByTenant.set(s.tenantId, []);
    sitesByTenant.get(s.tenantId).push(s);
  }

  const assigned = new Set(); // siteIds déjà assignés
  let workforceCreated = 0;
  let workforceSkipped = 0;

  for (const cc of ccUsers) {
    // Sites du tenant du CC, non encore assignés en priorité
    let candidateSites = (sitesByTenant.get(cc.tenantId) ?? []).filter(
      (s) => !assigned.has(s.id),
    );
    // Fallback : si tenant parent → toutes les filiales, sinon → fallback all
    if (candidateSites.length < 2) {
      candidateSites = sites.filter((s) => !assigned.has(s.id)).slice(0, 3);
    }
    // Limite à 2-3 chantiers par CC
    const myCount = candidateSites.length >= 3 ? rand(2, 3) : candidateSites.length;
    const mySites = candidateSites.slice(0, myCount);
    mySites.forEach((s) => assigned.add(s.id));

    if (mySites.length === 0) {
      console.log(`  ⚠ ${cc.firstName} ${cc.lastName} : aucun chantier dispo`);
      continue;
    }

    // assignedSiteIds (liste plate)
    await prisma.user.update({
      where: { id: cc.id },
      data: { assignedSiteIds: mySites.map((s) => s.id) },
    });

    // SiteWorkforceMember (rôle SITE_MANAGER, isLeader=true)
    for (const s of mySites) {
      const existing = await prisma.siteWorkforceMember.findUnique({
        where: { siteId_userId: { siteId: s.id, userId: cc.id } },
        select: { id: true },
      });
      if (existing) {
        workforceSkipped++;
        continue;
      }
      await prisma.siteWorkforceMember.create({
        data: {
          siteId: s.id,
          userId: cc.id,
          role: "SITE_MANAGER",
          isLeader: true,
          startedAt: new Date(Date.now() - rand(30, 365) * 86_400_000),
        },
      });
      workforceCreated++;
    }
    console.log(
      `  ✓ ${cc.firstName} ${cc.lastName} → ${mySites.length} chantier(s) : ${mySites.map((s) => s.code).join(", ")}`,
    );
  }

  console.log(
    `\n✓ Affectations chantier : ${workforceCreated} créées · ${workforceSkipped} déjà existantes\n`,
  );

  // 5) Génère 3 bulletins de paie par CC (3 derniers mois)
  let payslipsCreated = 0;
  for (const cc of ccUsers) {
    const baseSalary = cc.baseSalary;
    const baseN = Number(baseSalary);
    const now = new Date();

    for (let m = 0; m < 3; m++) {
      const periodDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
      const periodLabel = `${periodDate.getFullYear()}-${pad(periodDate.getMonth() + 1)}`;

      const existing = await prisma.payslip.findFirst({
        where: { userId: cc.id, periodLabel },
        select: { id: true },
      });
      if (existing) continue;

      const seniorityBonus = BigInt(Math.round(baseN * 0.04 * 3)); // 12% ancienneté max
      const transport = 40_000n;
      const performance = BigInt(rand(20_000, 60_000)); // prime variable
      const responsibility = 50_000n;

      const gross = baseSalary + seniorityBonus + transport + performance + responsibility;
      const taxable = gross - transport;
      const cnps = BigInt(Math.round(Number(taxable) * 0.042));
      const irpp = BigInt(Math.round(Number(taxable) * 0.18)); // CC payent plus d'IRPP (>17%)
      const net = gross - cnps - irpp;

      await prisma.payslip.create({
        data: {
          tenantId: cc.tenantId,
          userId: cc.id,
          period: periodDate,
          periodLabel,
          periodEnd,
          paymentDate: new Date(periodEnd.getTime() + 5 * 86_400_000),
          paymentMode: "VIREMENT",
          paymentMethod: "BANK_TRANSFER",
          grossAmount: gross,
          taxableGross: taxable,
          netAmount: net,
          socialCharges: cnps,
          fiscalCharges: irpp,
          employerCharges: BigInt(Math.round(Number(taxable) * 0.168)),
          baseSalary,
          seniorityBonus,
          transportAllowance: transport,
          cnpsAmount: cnps,
          irppAmount: irpp,
          paymentBankAccount: `${cc.bankName ?? "Afriland First Bank"} · ****${rand(1000, 9999)}`,
          paymentReference: `BS-${periodLabel}-${cc.matricule?.slice(-4) ?? "CC00"}`,
          workedDays: 22,
          reportedHours: 176,
          status: "PAID",
        },
      });
      payslipsCreated++;
    }
  }

  console.log(`✓ Bulletins de paie créés : ${payslipsCreated}\n`);

  // 6) Récap final
  const summary = await prisma.user.findMany({
    where: { role: "SITE_MANAGER", status: "ACTIVE" },
    select: {
      firstName: true,
      lastName: true,
      assignedSiteIds: true,
      payslips: { take: 1, select: { id: true } },
    },
  });
  console.log("──── Récap ────");
  console.log(`SITE_MANAGER actifs            : ${summary.length}`);
  console.log(`Avec chantier assigné          : ${summary.filter((s) => s.assignedSiteIds.length > 0).length}`);
  console.log(`Avec bulletin(s)               : ${summary.filter((s) => s.payslips.length > 0).length}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Erreur :", err);
  await prisma.$disconnect();
  process.exit(1);
});
