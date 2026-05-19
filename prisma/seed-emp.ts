import "./_guard-prod";
/**
 * Seed complémentaire — données Employé / Ouvrier (Bloc 0 EMP).
 *
 * Pré-requis : `pnpm db:seed` a été lancé (tenant BatimCAM + Pont Mfoundi + Jean).
 *
 * Usage :
 *   pnpm exec tsx prisma/seed-emp.ts
 *
 * Crée / met à jour :
 *  - François NDONGO (francois@batimcam.cm / Demo2026!) — Chef d'équipe coffrage
 *    Pont Mfoundi, teamLeader=true, hireDate 2018-03-15
 *  - Pauline NTSAMA (pauline@batimcam.cm / Demo2026!) — Assistante DG (bureau)
 *  - 30 ouvriers réalistes BTP Cameroun (coffreurs, ferrailleurs, maçons,
 *    journaliers) sur Pont Mfoundi
 *  - LeaveBalance 2026 pour François (30 acquis · 12 pris · 18 restants)
 *  - 5 TimeReport pour la semaine 19 de mai 2026 (lundi 11/05 → vendredi 15/05)
 *  - Payslip avril 2026 pour François (net 142 480 FCFA · payé)
 */
import {
  PrismaClient,
  Role,
  ContractType,
  LeaveType,
  LeaveStatus,
  TimeStatus,
  PayslipStatus,
  PayslipPaymentMethod,
  Plan,
  SiteType,
  SiteStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const PWD = "Demo2026!";

// 30 ouvriers BTP réalistes — prénoms/noms camerounais + spécialités terrain
const WORKERS: ReadonlyArray<{
  firstName: string;
  lastName: string;
  matricule: string;
  position: string;
  hireYear: number;
  teamLeader?: boolean;
}> = [
  { firstName: "Joseph", lastName: "BIYA", matricule: "BTC-2019-0201", position: "Coffreur", hireYear: 2019 },
  { firstName: "Marcel", lastName: "OWONO", matricule: "BTC-2020-0202", position: "Coffreur", hireYear: 2020 },
  { firstName: "Pierre", lastName: "ELOUNDOU", matricule: "BTC-2018-0203", position: "Ferrailleur", hireYear: 2018, teamLeader: true },
  { firstName: "Jean-Paul", lastName: "ATEBA", matricule: "BTC-2021-0204", position: "Ferrailleur", hireYear: 2021 },
  { firstName: "Maurice", lastName: "ESSOMBA", matricule: "BTC-2017-0205", position: "Maçon", hireYear: 2017, teamLeader: true },
  { firstName: "Bernard", lastName: "NKOMO", matricule: "BTC-2019-0206", position: "Maçon", hireYear: 2019 },
  { firstName: "Daniel", lastName: "BELINGA", matricule: "BTC-2022-0207", position: "Manœuvre", hireYear: 2022 },
  { firstName: "Étienne", lastName: "MBALLA", matricule: "BTC-2023-0208", position: "Journalier", hireYear: 2023 },
  { firstName: "Robert", lastName: "FOTSO", matricule: "BTC-2018-0209", position: "Conducteur engin", hireYear: 2018 },
  { firstName: "Henri", lastName: "AMOUGOU", matricule: "BTC-2020-0210", position: "Conducteur engin", hireYear: 2020 },
  { firstName: "Patrick", lastName: "ONANA", matricule: "BTC-2019-0211", position: "Électricien", hireYear: 2019 },
  { firstName: "Christian", lastName: "EYENGA", matricule: "BTC-2021-0212", position: "Plombier", hireYear: 2021 },
  { firstName: "Albert", lastName: "MENGUE", matricule: "BTC-2017-0213", position: "Soudeur", hireYear: 2017 },
  { firstName: "Olivier", lastName: "NDJOMO", matricule: "BTC-2022-0214", position: "Manœuvre", hireYear: 2022 },
  { firstName: "Sylvain", lastName: "MEKA", matricule: "BTC-2023-0215", position: "Journalier", hireYear: 2023 },
  { firstName: "Vincent", lastName: "EBANGA", matricule: "BTC-2018-0216", position: "Coffreur", hireYear: 2018 },
  { firstName: "Roger", lastName: "TCHINDA", matricule: "BTC-2020-0217", position: "Maçon", hireYear: 2020 },
  { firstName: "Pascal", lastName: "FOMBI", matricule: "BTC-2019-0218", position: "Ferrailleur", hireYear: 2019 },
  { firstName: "Léon", lastName: "MOUSSA", matricule: "BTC-2021-0219", position: "Manœuvre", hireYear: 2021 },
  { firstName: "Hubert", lastName: "ZIBI", matricule: "BTC-2018-0220", position: "Chef d'équipe maçonnerie", hireYear: 2018, teamLeader: true },
  { firstName: "Achille", lastName: "EVINA", matricule: "BTC-2022-0221", position: "Journalier", hireYear: 2022 },
  { firstName: "Théodore", lastName: "AYISSI", matricule: "BTC-2020-0222", position: "Coffreur", hireYear: 2020 },
  { firstName: "Bertrand", lastName: "FOUDA", matricule: "BTC-2019-0223", position: "Conducteur engin", hireYear: 2019 },
  { firstName: "Gabriel", lastName: "MBARGA", matricule: "BTC-2017-0224", position: "Mécanicien", hireYear: 2017 },
  { firstName: "Aristide", lastName: "MVONDO", matricule: "BTC-2023-0225", position: "Journalier", hireYear: 2023 },
  { firstName: "Yves", lastName: "NGUEMBOU", matricule: "BTC-2021-0226", position: "Ferrailleur", hireYear: 2021 },
  { firstName: "Cyrille", lastName: "OYONO", matricule: "BTC-2018-0227", position: "Maçon", hireYear: 2018 },
  { firstName: "Désiré", lastName: "ZE", matricule: "BTC-2020-0228", position: "Manœuvre", hireYear: 2020 },
  { firstName: "Boris", lastName: "EKWE", matricule: "BTC-2022-0229", position: "Coffreur", hireYear: 2022 },
  { firstName: "Romaric", lastName: "NJOYA", matricule: "BTC-2019-0230", position: "Électricien", hireYear: 2019 },
];

function phoneFor(matricule: string): string {
  const tail = matricule.split("-").pop() ?? "0000";
  return `+237 6 78 ${tail.slice(0, 2)} ${tail.slice(0, 2)} ${tail.slice(2, 4)}`;
}

async function main() {
  console.log("🌱 Seed EMP (François NDONGO + Pauline NTSAMA + 30 ouvriers)...");

  // Le tenant porteur des utilisateurs est typiquement le holding BatimCAM SA.
  // Les sites peuvent être dans des filiales. On prend le tenant avec le plus
  // grand volume d'utilisateurs pour héberger les nouveaux ouvriers/employés.
  // Bootstrap : si aucun tenant n'existe encore (DB vide), on en crée un.
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  let tenantId: string | null = null;
  let tenantName = "";
  let bestCount = 0;
  for (const t of tenants) {
    const count = await prisma.user.count({ where: { tenantId: t.id } });
    if (count > bestCount) {
      bestCount = count;
      tenantId = t.id;
      tenantName = t.name;
    }
  }
  if (!tenantId && tenants.length > 0) {
    // Tenants existent mais aucun n'a d'utilisateur — on prend le premier
    tenantId = tenants[0].id;
    tenantName = tenants[0].name;
  }
  if (!tenantId) {
    // DB vide → bootstrap minimal BatimCAM SA pour permettre le seed standalone
    const created = await prisma.tenant.create({
      data: {
        slug: "batimcam",
        name: "BatimCAM SA",
        plan: Plan.BUSINESS,
        taxId: "M021800012345",
        cnpsId: "CNPS-EMP-218",
        primaryColor: "#A855F7",
      },
      select: { id: true, name: true },
    });
    tenantId = created.id;
    tenantName = created.name;
    console.log(`  → Tenant bootstrap : ${tenantName}`);
  } else {
    console.log(`  → Tenant cible : ${tenantName} (${bestCount} utilisateurs)`);
  }

  // Pont Mfoundi est l'ancre du seed CC (code CHT-2025-031). À défaut, on
  // prend le premier chantier disponible — `assignedSiteIds` accepte un site
  // d'une filiale distincte du tenant porteur du compte (les ouvriers
  // BatimCAM SA peuvent intervenir sur les chantiers de BatimCAM Yaoundé).
  // Bootstrap : si aucun chantier n'existe, on crée Pont Mfoundi minimal.
  let pontMfoundi =
    (await prisma.site.findFirst({
      where: { code: "CHT-2025-031" },
      select: { id: true, name: true },
    })) ??
    (await prisma.site.findFirst({
      select: { id: true, name: true },
    }));

  if (!pontMfoundi) {
    const created = await prisma.site.create({
      data: {
        tenantId,
        code: "CHT-2025-031",
        name: "Pont Mfoundi",
        client: "Commune Yaoundé I",
        type: SiteType.CIVIL_ENG,
        region: "Yaoundé",
        budget: BigInt(8_500_000_000),
        startDate: new Date("2025-09-01"),
        plannedEndDate: new Date("2027-03-31"),
        status: SiteStatus.ACTIVE,
        progress: 62,
        physicalProgress: 62,
        financialProgress: 58,
      },
      select: { id: true, name: true },
    });
    pontMfoundi = created;
    console.log(`  → Chantier bootstrap : ${pontMfoundi.name}`);
  } else {
    console.log(`  → Chantier d'affectation : ${pontMfoundi.name}`);
  }

  const passwordHash = await bcrypt.hash(PWD, 12);

  // 1) François NDONGO — chef d'équipe coffrage Pont Mfoundi
  const francois = await prisma.user.upsert({
    where: { email: "francois@batimcam.cm" },
    create: {
      tenantId,
      email: "francois@batimcam.cm",
      firstName: "François",
      lastName: "NDONGO",
      passwordHash,
      role: Role.WORKER,
      emailVerified: true,
      phone: "+237 6 78 42 18 56",
      phoneMobile: "+237 6 78 42 18 56",
      matricule: "BTC-2018-0142",
      employeeId: "EMP-2018-0142",
      hireDate: new Date("2018-03-15"),
      dateOfBirth: new Date("1984-03-14"),
      cniNumber: "CM-AB-12042156",
      address: "Mendong, Yaoundé VI",
      familyStatus: "Marié · 3 enfants",
      emergencyContactName: "Esther NDONGO",
      emergencyContactPhone: "+237 6 99 12 03 45",
      personalEmail: "francois.ndongo@gmail.com",
      position: "Chef d'équipe coffrage",
      professionalCategory: "Catégorie 8 · échelon 3",
      category: "OQ",
      contractType: ContractType.CDI,
      cnpsNumber: "CNPS-218-2018-0142",
      niu: "F218014203187",
      bankName: "Afriland First Bank",
      bankAgency: "Bastos",
      rib: "10005 00012 12345678901 42",
      teamLeader: true,
      preferredLanguage: "fr-CM",
      notificationChannel: "WHATSAPP",
      assignedSiteIds: [pontMfoundi.id],
    },
    update: {
      passwordHash,
      firstName: "François",
      lastName: "NDONGO",
      role: Role.WORKER,
      matricule: "BTC-2018-0142",
      employeeId: "EMP-2018-0142",
      position: "Chef d'équipe coffrage",
      professionalCategory: "Catégorie 8 · échelon 3",
      category: "OQ",
      contractType: ContractType.CDI,
      hireDate: new Date("2018-03-15"),
      dateOfBirth: new Date("1984-03-14"),
      cniNumber: "CM-AB-12042156",
      address: "Mendong, Yaoundé VI",
      familyStatus: "Marié · 3 enfants",
      emergencyContactName: "Esther NDONGO",
      emergencyContactPhone: "+237 6 99 12 03 45",
      personalEmail: "francois.ndongo@gmail.com",
      cnpsNumber: "CNPS-218-2018-0142",
      niu: "F218014203187",
      bankName: "Afriland First Bank",
      bankAgency: "Bastos",
      rib: "10005 00012 12345678901 42",
      teamLeader: true,
      assignedSiteIds: [pontMfoundi.id],
      phone: "+237 6 78 42 18 56",
      phoneMobile: "+237 6 78 42 18 56",
      preferredLanguage: "fr-CM",
      notificationChannel: "WHATSAPP",
    },
  });
  console.log(`  ✓ François NDONGO créé (${francois.id})`);

  // 2) Pauline NTSAMA — employée bureau assistante DG
  await prisma.user.upsert({
    where: { email: "pauline@batimcam.cm" },
    create: {
      tenantId,
      email: "pauline@batimcam.cm",
      firstName: "Pauline",
      lastName: "NTSAMA",
      passwordHash,
      role: Role.EMPLOYEE,
      emailVerified: true,
      phone: "+237 6 99 14 28 73",
      phoneMobile: "+237 6 99 14 28 73",
      matricule: "BTC-2020-0089",
      employeeId: "EMP-2020-0089",
      hireDate: new Date("2020-09-01"),
      dateOfBirth: new Date("1992-07-22"),
      cniNumber: "CM-CE-31092201",
      address: "Bastos, Yaoundé I",
      familyStatus: "Célibataire",
      emergencyContactName: "Marie NTSAMA",
      emergencyContactPhone: "+237 6 75 18 91 03",
      personalEmail: "pauline.ntsama@gmail.com",
      position: "Assistante DG",
      professionalCategory: "Cadre · ETAM",
      category: "ETAM",
      contractType: ContractType.CDI,
      cnpsNumber: "CNPS-218-2020-0089",
      niu: "F218008923187",
      bankName: "SGBC",
      bankAgency: "Centre Ville Yaoundé",
      rib: "10006 00018 98765432109 18",
      teamLeader: false,
      preferredLanguage: "fr-CM",
      notificationChannel: "EMAIL",
      // Employée bureau : pas de chantier assigné
      assignedSiteIds: [],
    },
    update: {
      passwordHash,
      firstName: "Pauline",
      lastName: "NTSAMA",
      role: Role.EMPLOYEE,
      matricule: "BTC-2020-0089",
      employeeId: "EMP-2020-0089",
      position: "Assistante DG",
      professionalCategory: "Cadre · ETAM",
      hireDate: new Date("2020-09-01"),
      teamLeader: false,
      assignedSiteIds: [],
      phone: "+237 6 99 14 28 73",
      phoneMobile: "+237 6 99 14 28 73",
      preferredLanguage: "fr-CM",
      notificationChannel: "EMAIL",
    },
  });
  console.log("  ✓ Pauline NTSAMA créée (employée bureau)");

  // 3) 30 ouvriers réalistes
  for (const w of WORKERS) {
    const email = `${w.firstName.toLowerCase().replace(/[éèêë]/g, "e")}.${w.lastName.toLowerCase()}@batimcam.cm`;
    await prisma.user.upsert({
      where: { email },
      create: {
        tenantId,
        email,
        firstName: w.firstName,
        lastName: w.lastName,
        passwordHash,
        role: Role.WORKER,
        emailVerified: true,
        phone: phoneFor(w.matricule),
        phoneMobile: phoneFor(w.matricule),
        matricule: w.matricule,
        hireDate: new Date(`${w.hireYear}-04-01`),
        position: w.position,
        professionalCategory: "Catégorie 6 · échelon 2",
        category: w.position.includes("Chef") ? "OQ" : "OS",
        contractType: w.hireYear < 2022 ? ContractType.CDI : ContractType.CDD,
        teamLeader: w.teamLeader ?? false,
        preferredLanguage: "fr-CM",
        notificationChannel: "WHATSAPP",
        assignedSiteIds: [pontMfoundi.id],
      },
      update: {
        firstName: w.firstName,
        lastName: w.lastName,
        role: Role.WORKER,
        matricule: w.matricule,
        position: w.position,
        teamLeader: w.teamLeader ?? false,
        contractType: w.hireYear < 2022 ? ContractType.CDI : ContractType.CDD,
        hireDate: new Date(`${w.hireYear}-04-01`),
        assignedSiteIds: [pontMfoundi.id],
        preferredLanguage: "fr-CM",
        notificationChannel: "WHATSAPP",
      },
    });
  }
  console.log(`  ✓ ${WORKERS.length} ouvriers créés/mis à jour`);

  // 4) LeaveBalance 2026 pour François : 30 acquis · 12 pris · 18 restants
  await prisma.leaveBalance.upsert({
    where: { employeeKey: francois.id },
    create: {
      tenantId,
      employeeKey: francois.id,
      employeeName: "François NDONGO",
      userId: francois.id,
      year: 2026,
      paidLeaveAcquired: 30,
      paidLeaveTaken: 12,
      paidLeaveRemaining: 18,
      compensatoryDays: 3,
      sickDaysUsed: 2,
      unpaidLeaveUsed: 0,
      rttBalance: 0,
      lastTakenAt: new Date("2026-04-04"),
    },
    update: {
      userId: francois.id,
      year: 2026,
      paidLeaveAcquired: 30,
      paidLeaveTaken: 12,
      paidLeaveRemaining: 18,
      compensatoryDays: 3,
      sickDaysUsed: 2,
    },
  });
  console.log("  ✓ LeaveBalance 2026 François (18 j restants)");

  // 5) Demande de congé en cours : 26/05 → 30/05/2026
  const pendingLeave = await prisma.leaveRequest.findFirst({
    where: { userId: francois.id, type: LeaveType.PAID_LEAVE, startDate: new Date("2026-05-26") },
    select: { id: true },
  });
  if (!pendingLeave) {
    await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeKey: francois.id,
        employeeName: "François NDONGO",
        userId: francois.id,
        type: LeaveType.PAID_LEAVE,
        startDate: new Date("2026-05-26"),
        endDate: new Date("2026-05-30"),
        daysCount: 5,
        reason: "Congés familiaux",
        status: LeaveStatus.PENDING,
      },
    });
    console.log("  ✓ LeaveRequest en attente (26/05 → 30/05)");
  } else {
    console.log("  ✓ LeaveRequest en attente déjà présente");
  }

  // 6) TimeReport semaine 19 mai 2026 (lun 11/05 → ven 15/05)
  const week19: ReadonlyArray<{
    date: string;
    arrival: string;
    departure: string;
    overtime: number;
    overtimeType: string | null;
  }> = [
    { date: "2026-05-11", arrival: "06:52", departure: "17:28", overtime: 1.0, overtimeType: "evening_125" },
    { date: "2026-05-12", arrival: "06:45", departure: "16:30", overtime: 0, overtimeType: null },
    { date: "2026-05-13", arrival: "06:48", departure: "18:12", overtime: 2.0, overtimeType: "evening_125" },
    { date: "2026-05-14", arrival: "06:50", departure: "17:32", overtime: 1.0, overtimeType: "evening_125" },
    { date: "2026-05-15", arrival: "06:48", departure: "12:00", overtime: 0, overtimeType: null },
  ];
  for (const d of week19) {
    const date = new Date(d.date);
    const [ah, am] = d.arrival.split(":").map(Number);
    const [dh, dm] = d.departure.split(":").map(Number);
    const arrivalTime = new Date(date);
    arrivalTime.setHours(ah, am, 0, 0);
    const departureTime = new Date(date);
    departureTime.setHours(dh, dm, 0, 0);
    const totalMinutes = (dh * 60 + dm) - (ah * 60 + am) - 60; // pause 1h
    const totalHours = totalMinutes / 60;
    const standardHours = Math.max(0, totalHours - d.overtime);
    await prisma.timeReport.upsert({
      where: { userId_date: { userId: francois.id, date } },
      create: {
        tenantId,
        userId: francois.id,
        date,
        siteId: pontMfoundi.id,
        arrivalTime,
        departureTime,
        breakMinutes: 60,
        totalHours: Number(totalHours.toFixed(2)),
        standardHours: Number(standardHours.toFixed(2)),
        overtimeHours: d.overtime,
        overtimeType: d.overtimeType,
        status: TimeStatus.PRESENT,
        pointedBy: francois.id, // placeholder ; le seed CC le réassignera à Jean KAMGA si présent
      },
      update: {
        arrivalTime,
        departureTime,
        totalHours: Number(totalHours.toFixed(2)),
        standardHours: Number(standardHours.toFixed(2)),
        overtimeHours: d.overtime,
        overtimeType: d.overtimeType,
      },
    });
  }
  // Si Jean KAMGA existe, on bascule pointedBy pour cohérence métier (CC pointe ses ouvriers)
  const jean = await prisma.user.findFirst({ where: { email: "jean@batimcam.cm" }, select: { id: true } });
  if (jean) {
    await prisma.timeReport.updateMany({
      where: { userId: francois.id, date: { gte: new Date("2026-05-11"), lte: new Date("2026-05-15") } },
      data: { pointedBy: jean.id },
    });
  }
  console.log(`  ✓ 5 TimeReport semaine 19 (pointeur = ${jean ? "Jean KAMGA" : "François (placeholder)"})`);

  // 7) Payslip avril 2026 — net 142 480 FCFA
  const aprilPeriod = new Date("2026-04-01");
  const aprilEnd = new Date("2026-04-30");
  await prisma.payslip.upsert({
    where: { tenantId_userId_period: { tenantId, userId: francois.id, period: aprilPeriod } },
    create: {
      tenantId,
      userId: francois.id,
      period: aprilPeriod,
      periodEnd: aprilEnd,
      periodLabel: "2026-04",
      paymentDate: new Date("2026-05-02"),
      paymentMode: "VIREMENT",
      paymentMethod: PayslipPaymentMethod.BANK_TRANSFER,
      paymentBankAccount: "Afriland First Bank · ****1842",
      paymentReference: "BS-2026-04-NDF",
      // Composantes brut
      baseSalary: BigInt(170_000),
      overtimeAmount: BigInt(29_400),
      overtimeHours: 22,
      overtimeHours125: 22,
      seniorityBonus: BigInt(12_000),
      transportAllowance: BigInt(7_000),
      grossAmount: BigInt(218_400),
      taxableGross: BigInt(218_400),
      // Cotisations
      cnpsAmount: BigInt(9_173), // 4.2% du brut plafonné
      irppAmount: BigInt(49_747),
      socialCharges: BigInt(9_173),
      fiscalCharges: BigInt(49_747),
      otherDeductions: BigInt(0),
      employerCharges: BigInt(35_000),
      // Net
      netAmount: BigInt(142_480),
      workedDays: 21,
      reportedHours: 182,
      status: PayslipStatus.PAID,
      validatedN1At: new Date("2026-04-28"),
      validatedN2At: new Date("2026-04-30"),
      paidAt: new Date("2026-05-02"),
    },
    update: {
      paymentMethod: PayslipPaymentMethod.BANK_TRANSFER,
      paymentBankAccount: "Afriland First Bank · ****1842",
      paymentReference: "BS-2026-04-NDF",
      baseSalary: BigInt(170_000),
      overtimeAmount: BigInt(29_400),
      overtimeHours: 22,
      overtimeHours125: 22,
      seniorityBonus: BigInt(12_000),
      transportAllowance: BigInt(7_000),
      grossAmount: BigInt(218_400),
      cnpsAmount: BigInt(9_173),
      irppAmount: BigInt(49_747),
      netAmount: BigInt(142_480),
      workedDays: 21,
      reportedHours: 182,
      status: PayslipStatus.PAID,
    },
  });
  console.log("  ✓ Payslip avril 2026 François (net 142 480 FCFA · payé)");

  // 8) Historique Q1 2026 : janvier, février, mars (cumul net = 528 480 FCFA
  //    avec avril, exactement comme dans le prototype HTML).
  const Q1: ReadonlyArray<{
    label: string;
    monthStart: string;
    monthEnd: string;
    paidAt: string;
    base: number;
    overtimeHours: number;
    overtimeAmount: number;
    seniority: number;
    transport: number;
    gross: number;
    cnps: number;
    irpp: number;
    net: number;
    workedDays: number;
    reportedHours: number;
    reference: string;
  }> = [
    {
      label: "2026-01",
      monthStart: "2026-01-01",
      monthEnd: "2026-01-31",
      paidAt: "2026-02-02",
      base: 170_000,
      overtimeHours: 12,
      overtimeAmount: 16_038,
      seniority: 12_000,
      transport: 7_000,
      gross: 205_038,
      cnps: 8_612,
      irpp: 41_226,
      net: 127_400,
      workedDays: 22,
      reportedHours: 176,
      reference: "BS-2026-01-NDF",
    },
    {
      label: "2026-02",
      monthStart: "2026-02-01",
      monthEnd: "2026-02-28",
      paidAt: "2026-03-02",
      base: 170_000,
      overtimeHours: 14,
      overtimeAmount: 18_711,
      seniority: 12_000,
      transport: 7_000,
      gross: 207_711,
      cnps: 8_724,
      irpp: 41_787,
      net: 128_400,
      workedDays: 20,
      reportedHours: 160,
      reference: "BS-2026-02-NDF",
    },
    {
      label: "2026-03",
      monthStart: "2026-03-01",
      monthEnd: "2026-03-31",
      paidAt: "2026-04-02",
      base: 170_000,
      overtimeHours: 18,
      overtimeAmount: 24_057,
      seniority: 12_000,
      transport: 7_000,
      gross: 213_057,
      cnps: 8_948,
      irpp: 43_109,
      net: 130_200,
      workedDays: 22,
      reportedHours: 176,
      reference: "BS-2026-03-NDF",
    },
  ];

  for (const m of Q1) {
    const period = new Date(m.monthStart);
    const periodEnd = new Date(m.monthEnd);
    await prisma.payslip.upsert({
      where: { tenantId_userId_period: { tenantId, userId: francois.id, period } },
      create: {
        tenantId,
        userId: francois.id,
        period,
        periodEnd,
        periodLabel: m.label,
        paymentDate: new Date(m.paidAt),
        paymentMode: "VIREMENT",
        paymentMethod: PayslipPaymentMethod.BANK_TRANSFER,
        paymentBankAccount: "Afriland First Bank · ****1842",
        paymentReference: m.reference,
        baseSalary: BigInt(m.base),
        overtimeAmount: BigInt(m.overtimeAmount),
        overtimeHours: m.overtimeHours,
        overtimeHours125: m.overtimeHours,
        seniorityBonus: BigInt(m.seniority),
        transportAllowance: BigInt(m.transport),
        grossAmount: BigInt(m.gross),
        taxableGross: BigInt(m.gross),
        cnpsAmount: BigInt(m.cnps),
        irppAmount: BigInt(m.irpp),
        socialCharges: BigInt(m.cnps),
        fiscalCharges: BigInt(m.irpp),
        otherDeductions: BigInt(0),
        employerCharges: BigInt(35_000),
        netAmount: BigInt(m.net),
        workedDays: m.workedDays,
        reportedHours: m.reportedHours,
        status: PayslipStatus.PAID,
        validatedN1At: new Date(`${m.label}-26`),
        validatedN2At: new Date(`${m.label}-28`),
        paidAt: new Date(m.paidAt),
      },
      update: {
        netAmount: BigInt(m.net),
        grossAmount: BigInt(m.gross),
        paymentReference: m.reference,
        status: PayslipStatus.PAID,
      },
    });
  }
  console.log(`  ✓ Historique 2026 : ${Q1.length} bulletins (jan, fév, mars) — cumul net Q1 ${Q1.reduce((s, p) => s + p.net, 0).toLocaleString("fr-FR")} FCFA`);

  console.log("\n✅ Seed EMP terminé.");
  console.log("  → Connexion test : francois@batimcam.cm / Demo2026!  (chef d'équipe, mobile-first)");
  console.log("  → Connexion test : pauline@batimcam.cm / Demo2026!  (employée bureau)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
