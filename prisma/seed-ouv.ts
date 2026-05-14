/**
 * Seed complémentaire — Bloc 0 OUVRIER (Étienne MBALLA).
 *
 * Pré-requis : `pnpm db:seed` puis idéalement `pnpm db:seed-emp` ont été
 * lancés (tenant BatimCAM + Pont Mfoundi + Jean KAMGA chef chantier).
 *
 * Usage :
 *   pnpm exec tsx prisma/seed-ouv.ts
 *
 * Crée :
 *  - Étienne MBALLA (etienne@batimcam.cm / login phone +237678241892 / PIN 251937)
 *    · Maçon-coffreur niveau B, matricule BTC-2018-0287, 6 ans BatimCAM
 *  - 22 TimeReport pour mai 2026 (jours ouvrés, présence + heures sup réalistes)
 *  - 3 LeaveRequest (1 annuel pending, 1 annuel taken passé, 1 sick taken)
 *  - LeaveBalance 2026 Étienne (30 acquis · 12 pris · 18 restants)
 *  - 2 MissionAssignment (1 active 68 %, 1 nouvelle pending acceptance)
 *  - 2 HseIncidentReport (1 échafaudage RESOLVED, 1 casque OPEN)
 *  - 5 EpiAssignment (casque, gilet, lunettes, gants, chaussures usées)
 *  - 1 gardien Joseph ESSAMA (isGuard=true, PIN dédié)
 *  - ~410 stubs ouvriers (volume réaliste BatimCAM 440 WORKER)
 */
import {
  PrismaClient,
  Role,
  ContractType,
  LeaveType,
  LeaveStatus,
  TimeStatus,
  MissionPriority,
  MissionStatus,
  HseIncidentType,
  HseIncidentSeverity,
  HseIncidentStatus,
  EpiType,
  EpiStatus,
  PayslipStatus,
  PayslipPaymentMethod,
  SalaryAdvanceStatus,
  SiteType,
  SiteStatus,
  Plan,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ETIENNE_EMAIL = "etienne@batimcam.cm";
const ETIENNE_PHONE = "+237678241892";
const ETIENNE_PIN = "251937";
const JOSEPH_EMAIL = "joseph.essama@batimcam.cm";
const JOSEPH_PHONE = "+237699445566";
const JOSEPH_PIN = "881204";
const PWD = "Demo2026!";

// Volume cible : ~440 ouvriers BatimCAM. seed-emp crée déjà ~32 (François + 30 stubs + Pauline).
// Cible additionnelle ici : 408 ouvriers stubs lite (juste user + role + phone + PIN générique).
const STUB_TARGET = 408;

const FIRST_NAMES = [
  "Aurelien","Boris","Cedric","David","Edgar","Fabrice","Gilbert","Hervé","Ignace","Justin",
  "Kevin","Loïc","Maurice","Norbert","Olivier","Paterne","Quentin","Roger","Samuel","Thierry",
  "Urbain","Valentin","Wilfried","Xavier","Yanick","Zacharie","Achille","Bruno","Cyrille","Donatien",
  "Emmanuel","Florent","Germain","Honoré","Isidore","Jacques","Kévin","Léopold","Magloire","Nicolas",
];

const LAST_NAMES = [
  "MBARGA","NKOMO","ESSOMBA","BELINGA","ATEBA","ELOUNDOU","FOUDA","MEKA","NDJOMO","ONANA",
  "TCHINDA","BIYA","OWONO","ZIBI","AMOUGOU","EYENGA","MOUSSA","EVINA","AYISSI","NJOYA",
  "MENGUE","FOMBI","NGUEMBOU","OYONO","ZE","EKWE","TSAFACK","KUATE","FOTSO","NDONGO",
  "BIKOK","ATANGA","ETOUNDI","MVONDO","NTSAMA","ESSAMA","NKAMA","NGONO","BIYAGA","KOM",
];

const POSITIONS = [
  "Maçon", "Maçon niveau B", "Coffreur", "Ferrailleur", "Manœuvre",
  "Journalier", "Conducteur engin", "Chauffeur", "Électricien", "Plombier",
  "Soudeur", "Mécanicien", "Peintre", "Carreleur", "Jardinier",
] as const;

function rng(seed: number) {
  // PRNG déterministe simple pour seed reproductible
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function main() {
  console.log("🌱 Seed OUV (Étienne MBALLA + données démo + 408 stubs ouvriers)…");

  // Tenant cible : BatimCAM SA (le plus peuplé). Bootstrap si DB vide.
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
  let tenantId: string | null = null;
  let tenantSlug = "batimcam";
  let bestCount = 0;
  for (const t of tenants) {
    const count = await prisma.user.count({ where: { tenantId: t.id } });
    if (count > bestCount) {
      bestCount = count;
      tenantId = t.id;
      tenantSlug = t.slug;
    }
  }
  if (!tenantId && tenants.length > 0) {
    tenantId = tenants[0].id;
    tenantSlug = tenants[0].slug;
  }
  if (!tenantId) {
    const created = await prisma.tenant.create({
      data: {
        slug: "batimcam",
        name: "BatimCAM SA",
        plan: Plan.BUSINESS,
        taxId: "M021800012345",
        cnpsId: "CNPS-EMP-218",
        primaryColor: "#A855F7",
      },
      select: { id: true, slug: true },
    });
    tenantId = created.id;
    tenantSlug = created.slug;
    console.log(`  → Tenant bootstrap : BatimCAM SA`);
  } else {
    console.log(`  → Tenant cible : ${tenantSlug} (${bestCount} utilisateurs)`);
  }

  // Pont Mfoundi (chantier d'Étienne)
  let pontMfoundi =
    (await prisma.site.findFirst({ where: { code: "CHT-2025-031" }, select: { id: true } })) ??
    (await prisma.site.findFirst({ select: { id: true } }));
  if (!pontMfoundi) {
    pontMfoundi = await prisma.site.create({
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
      },
      select: { id: true },
    });
    console.log("  → Chantier bootstrap : Pont Mfoundi");
  }

  // Jean KAMGA (Chef Chantier) — pointeur des TimeReport et assigneur de mission
  let jeanKamga = await prisma.user.findFirst({
    where: { tenantId, role: Role.SITE_MANAGER },
    select: { id: true },
  });
  if (!jeanKamga) {
    // Bootstrap minimal CC pour pouvoir pointer
    jeanKamga = await prisma.user.create({
      data: {
        tenantId,
        email: "jean.kamga@batimcam.cm",
        firstName: "Jean",
        lastName: "KAMGA",
        passwordHash: await bcrypt.hash(PWD, 12),
        role: Role.SITE_MANAGER,
        phone: "+237677889900",
        matricule: "BTC-2015-0042",
        position: "Chef de chantier Pont Mfoundi",
        assignedSiteIds: [pontMfoundi.id],
        emailVerified: true,
      },
      select: { id: true },
    });
    console.log("  → Jean KAMGA bootstrap (CC)");
  }

  const passwordHash = await bcrypt.hash(PWD, 12);
  const pinHashEtienne = await bcrypt.hash(ETIENNE_PIN, 12);
  const pinHashJoseph = await bcrypt.hash(JOSEPH_PIN, 12);

  // ---------------------------------------------------------------
  // 1) Étienne MBALLA — persona canonique OUV
  // ---------------------------------------------------------------
  const etienne = await prisma.user.upsert({
    where: { email: ETIENNE_EMAIL },
    create: {
      tenantId,
      email: ETIENNE_EMAIL,
      firstName: "Étienne",
      lastName: "MBALLA",
      passwordHash,
      pinHash: pinHashEtienne,
      phoneVerified: true,
      role: Role.WORKER,
      emailVerified: true,
      phone: ETIENNE_PHONE,
      phoneMobile: ETIENNE_PHONE,
      matricule: "BTC-2018-0287",
      employeeId: "EMP-2018-0287",
      hireDate: new Date("2020-03-15"),
      dateOfBirth: new Date("1988-07-12"),
      cniNumber: "CM-CE-19880712-A",
      address: "Mvog-Ada, Yaoundé",
      familyStatus: "Marié · 2 enfants",
      emergencyContactName: "Bernadette MBALLA (épouse)",
      emergencyContactPhone: "+237699112233",
      personalEmail: "etienne.mballa@gmail.com",
      position: "Maçon-coffreur niveau B",
      workerQualification: "Maçon-coffreur niveau B",
      professionalCategory: "Catégorie 7 · échelon 2",
      category: "OQ",
      contractType: ContractType.CDI,
      cnpsNumber: "CNPS-7438291",
      niu: "M1098273J",
      bankName: "Afriland First Bank",
      bankAgency: "Centre Ville",
      rib: "10005 00012 87543210987 56",
      teamLeader: false,
      preferredLanguage: "fr-CM",
      notificationChannel: "WHATSAPP",
      assignedSiteIds: [pontMfoundi.id],
    },
    update: {
      pinHash: pinHashEtienne,
      phoneVerified: true,
      phone: ETIENNE_PHONE,
      phoneMobile: ETIENNE_PHONE,
      matricule: "BTC-2018-0287",
      position: "Maçon-coffreur niveau B",
      workerQualification: "Maçon-coffreur niveau B",
      professionalCategory: "Catégorie 7 · échelon 2",
      category: "OQ",
      contractType: ContractType.CDI,
      hireDate: new Date("2020-03-15"),
      role: Role.WORKER,
      assignedSiteIds: [pontMfoundi.id],
      preferredLanguage: "fr-CM",
      notificationChannel: "WHATSAPP",
    },
  });
  console.log(`  ✓ Étienne MBALLA créé/maj (${etienne.id})`);

  // ---------------------------------------------------------------
  // 2) 22 TimeReport pour Étienne — mai 2026 jours ouvrés
  //    (1er mai férié exclu, samedi/dimanche exclus)
  // ---------------------------------------------------------------
  const may2026Days: Date[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(Date.UTC(2026, 4, d)); // mois 4 = mai (0-indexé)
    const wd = date.getUTCDay(); // 0=dim, 6=sam
    if (wd === 0 || wd === 6) continue;
    if (d === 1) continue; // Fête du travail
    may2026Days.push(date);
    if (may2026Days.length >= 22) break;
  }

  for (const date of may2026Days) {
    const dayNum = date.getUTCDate();
    // Pattern réaliste : 8h00-17h00 base 8h, 30 min pause, sup 0-2h variable
    const arrival = new Date(date);
    arrival.setUTCHours(6, 48 + (dayNum % 5), 0, 0); // arrivée 6:48 à 6:52
    const overtime = dayNum % 3 === 0 ? 2 : dayNum % 5 === 0 ? 1.5 : 0;
    const departure = new Date(date);
    departure.setUTCHours(17 + Math.floor(overtime), Math.round((overtime % 1) * 60), 0, 0);
    const totalHours = 8 + overtime;
    const standardHours = 8;
    await prisma.timeReport.upsert({
      where: { userId_date: { userId: etienne.id, date } },
      create: {
        tenantId,
        userId: etienne.id,
        date,
        siteId: pontMfoundi.id,
        arrivalTime: arrival,
        departureTime: departure,
        breakMinutes: 60,
        totalHours,
        standardHours,
        overtimeHours: overtime,
        overtimeType: overtime > 0 ? "evening_125" : null,
        status: TimeStatus.PRESENT,
        pointedBy: etienne.id, // SELF_OUV → pointage autonome ouvrier
        entryGeoLat: 3.866 + (dayNum % 7) * 0.00005,
        entryGeoLng: 11.519 + (dayNum % 7) * 0.00005,
        entryGeoAccuracyM: 8,
        exitGeoLat: 3.866 + (dayNum % 7) * 0.00005,
        exitGeoLng: 11.519 + (dayNum % 7) * 0.00005,
        exitGeoAccuracyM: 9,
        deviceFingerprint: "android-tecno-spark9-etienne",
        outOfGeofence: false,
      },
      update: {
        arrivalTime: arrival,
        departureTime: departure,
        totalHours,
        standardHours,
        overtimeHours: overtime,
      },
    });
  }
  console.log(`  ✓ ${may2026Days.length} TimeReport mai 2026 Étienne`);

  // ---------------------------------------------------------------
  // 3) LeaveBalance + 3 LeaveRequest
  // ---------------------------------------------------------------
  await prisma.leaveBalance.upsert({
    where: { employeeKey: etienne.id },
    create: {
      tenantId,
      employeeKey: etienne.id,
      employeeName: "Étienne MBALLA",
      userId: etienne.id,
      year: 2026,
      paidLeaveAcquired: 30,
      paidLeaveTaken: 12,
      paidLeaveRemaining: 18,
      compensatoryDays: 2,
      sickDaysUsed: 4,
      unpaidLeaveUsed: 0,
      rttBalance: 0,
      lastTakenAt: new Date("2026-03-20"),
    },
    update: {
      year: 2026,
      paidLeaveAcquired: 30,
      paidLeaveTaken: 12,
      paidLeaveRemaining: 18,
      sickDaysUsed: 4,
    },
  });

  const leavesData = [
    {
      type: LeaveType.PAID_LEAVE,
      startDate: new Date("2026-05-26"),
      endDate: new Date("2026-05-30"),
      daysCount: 5,
      reason: "Mariage du frère",
      status: LeaveStatus.PENDING,
    },
    {
      type: LeaveType.PAID_LEAVE,
      startDate: new Date("2026-01-12"),
      endDate: new Date("2026-01-14"),
      daysCount: 3,
      reason: "Repos familial Nouvel An",
      status: LeaveStatus.RH_APPROVED,
    },
    {
      type: LeaveType.SICK,
      startDate: new Date("2026-03-17"),
      endDate: new Date("2026-03-20"),
      daysCount: 4,
      reason: "Paludisme · certif Dr Onana",
      status: LeaveStatus.RH_APPROVED,
    },
  ];

  for (const l of leavesData) {
    const exists = await prisma.leaveRequest.findFirst({
      where: { userId: etienne.id, startDate: l.startDate, type: l.type },
      select: { id: true },
    });
    if (!exists) {
      await prisma.leaveRequest.create({
        data: {
          tenantId,
          employeeKey: etienne.id,
          employeeName: "Étienne MBALLA",
          userId: etienne.id,
          ...l,
        },
      });
    }
  }
  console.log("  ✓ 3 LeaveRequest + LeaveBalance Étienne");

  // ---------------------------------------------------------------
  // 4) 2 MissionAssignment
  // ---------------------------------------------------------------
  const missionsData = [
    {
      title: "Coffrage pile P3 Pont Mfoundi",
      description:
        "Coffrage complet pile P3 côté rive droite. Hauteur 8m, ferraillage HA12 espacement 15cm, béton C30/37 dosé 350 kg/m³.",
      instructions:
        "Vérifier l'aplomb au théodolite avant coulage. Pulvérisation décoffrant huile minérale Sika. Décoffrage J+3 minimum.",
      startDate: new Date("2026-05-04"),
      endDate: new Date("2026-05-20"),
      estimatedDays: 13,
      progressPercent: 68,
      priority: MissionPriority.HIGH,
      status: MissionStatus.IN_PROGRESS,
      workerAcceptedAt: new Date("2026-05-04T07:12:00Z"),
    },
    {
      title: "Reprise étanchéité semelle S2",
      description:
        "Application bicouche bitumineuse SBS sur semelle S2 après nettoyage haute pression. Surface ~28 m².",
      instructions:
        "Attendre béton sec total 72 h. Primer Sika Bituseal puis chalumeau 2 couches croisées. Casque + gilet obligatoires.",
      startDate: new Date("2026-05-22"),
      estimatedDays: 3,
      progressPercent: 0,
      priority: MissionPriority.NORMAL,
      status: MissionStatus.PENDING_ACCEPTANCE,
    },
  ];

  for (const m of missionsData) {
    const exists = await prisma.missionAssignment.findFirst({
      where: { userId: etienne.id, title: m.title },
      select: { id: true },
    });
    if (!exists) {
      await prisma.missionAssignment.create({
        data: {
          tenantId,
          userId: etienne.id,
          siteId: pontMfoundi.id,
          assignedById: jeanKamga.id,
          ...m,
        },
      });
    }
  }
  console.log("  ✓ 2 MissionAssignment Étienne");

  // ---------------------------------------------------------------
  // 5) 2 HseIncidentReport
  // ---------------------------------------------------------------
  const hseData = [
    {
      type: HseIncidentType.SITE_DANGER,
      severity: HseIncidentSeverity.MEDIUM,
      title: "Échafaudage instable pile P3",
      description:
        "Constaté ce matin : étage 2 de l'échafaudage métallique pile P3 présente jeu anormal — boulons desserrés sur 3 nœuds. Risque chute matériel.",
      locationDetail: "Pile P3 rive droite, étage 2",
      photosUrls: [],
      status: HseIncidentStatus.RESOLVED,
      resolution: "Resserrage complet par équipe coffrage. Audit échafaudage planifié hebdo désormais.",
      resolvedAt: new Date("2026-04-22T14:30:00Z"),
      isAnonymous: false,
      reportedAt: new Date("2026-04-22T08:15:00Z"),
    },
    {
      type: HseIncidentType.EQUIPMENT_DEFECT,
      severity: HseIncidentSeverity.LOW,
      title: "Casque endommagé impact chute béton",
      description:
        "Mon casque a pris un impact lors d'une chute de béton frais du niveau supérieur. Coque fissurée côté droit. Toujours utilisable mais à remplacer.",
      locationDetail: "Zone coulage pile P3",
      photosUrls: [],
      status: HseIncidentStatus.OPEN,
      isAnonymous: false,
      reportedAt: new Date("2026-05-08T11:42:00Z"),
    },
  ];

  for (const h of hseData) {
    const exists = await prisma.hseIncidentReport.findFirst({
      where: { reportedById: etienne.id, title: h.title },
      select: { id: true },
    });
    if (!exists) {
      const { reportedAt, ...rest } = h;
      await prisma.hseIncidentReport.create({
        data: {
          tenantId,
          reportedById: etienne.id,
          siteId: pontMfoundi.id,
          ...rest,
          createdAt: reportedAt,
        },
      });
    }
  }
  console.log("  ✓ 2 HseIncidentReport Étienne");

  // ---------------------------------------------------------------
  // 6) 5 EpiAssignment
  // ---------------------------------------------------------------
  const epiData = [
    { epiType: EpiType.HELMET, name: "Casque chantier blanc 3M", serial: "HEL-2024-0287", years: 2, status: EpiStatus.OK },
    { epiType: EpiType.HIGH_VIS_VEST, name: "Gilet haute visibilité jaune", serial: "VST-2025-0287", years: 1, status: EpiStatus.OK },
    { epiType: EpiType.SAFETY_GLASSES, name: "Lunettes anti-projections", serial: "GLS-2025-0287", years: 1, status: EpiStatus.OK },
    { epiType: EpiType.GLOVES, name: "Gants cuir vachette", serial: "GLV-2026-0287", years: 0.5, status: EpiStatus.OK },
    { epiType: EpiType.SAFETY_SHOES, name: "Chaussures sécurité S3", serial: "SHO-2024-0287", years: 2, status: EpiStatus.WORN_OUT },
  ];

  for (const e of epiData) {
    const exists = await prisma.epiAssignment.findFirst({
      where: { userId: etienne.id, epiType: e.epiType, serialNumber: e.serial },
      select: { id: true },
    });
    if (!exists) {
      const assigned = new Date("2024-01-15");
      const expected = new Date(assigned);
      expected.setMonth(expected.getMonth() + Math.round(e.years * 12));
      await prisma.epiAssignment.create({
        data: {
          tenantId,
          userId: etienne.id,
          epiType: e.epiType,
          name: e.name,
          serialNumber: e.serial,
          assignedAt: assigned,
          expectedReplacementAt: expected,
          status: e.status,
        },
      });
    }
  }
  console.log("  ✓ 5 EpiAssignment Étienne");

  // ---------------------------------------------------------------
  // 6bis) Payslips Q1 + avril 2026 pour Étienne (fn 1.3)
  //       Cible avril = net 142 480 FCFA (identique au prototype).
  // ---------------------------------------------------------------
  const payslipsData: Array<{
    period: string;
    end: string;
    paymentDate: string;
    base: number;
    overtimeHours: number;
    overtimeAmount: number;
    seniorityBonus: number;
    transportAllowance: number;
    gross: number;
    cnps: number;
    irpp: number;
    net: number;
    workedDays: number;
    reportedHours: number;
    reference: string;
  }> = [
    {
      period: "2026-04-01",
      end: "2026-04-30",
      paymentDate: "2026-05-02",
      base: 142_142,
      overtimeHours: 22,
      overtimeAmount: 21_530,
      seniorityBonus: 0,
      transportAllowance: 28_000,
      gross: 191_672,
      cnps: 8_005,
      irpp: 12_187,
      net: 142_480,
      workedDays: 22,
      reportedHours: 182,
      reference: "BS-2026-04-MBA",
    },
    {
      period: "2026-03-01",
      end: "2026-03-31",
      paymentDate: "2026-04-03",
      base: 142_142,
      overtimeHours: 18,
      overtimeAmount: 17_620,
      seniorityBonus: 0,
      transportAllowance: 25_000,
      gross: 184_762,
      cnps: 7_760,
      irpp: 11_770,
      net: 130_250,
      workedDays: 21,
      reportedHours: 174,
      reference: "BS-2026-03-MBA",
    },
    {
      period: "2026-02-01",
      end: "2026-02-28",
      paymentDate: "2026-03-02",
      base: 142_142,
      overtimeHours: 16,
      overtimeAmount: 15_660,
      seniorityBonus: 0,
      transportAllowance: 25_000,
      gross: 182_802,
      cnps: 7_678,
      irpp: 11_524,
      net: 128_420,
      workedDays: 20,
      reportedHours: 166,
      reference: "BS-2026-02-MBA",
    },
    {
      period: "2026-01-01",
      end: "2026-01-31",
      paymentDate: "2026-02-02",
      base: 142_142,
      overtimeHours: 19,
      overtimeAmount: 18_595,
      seniorityBonus: 0,
      transportAllowance: 25_000,
      gross: 185_737,
      cnps: 7_801,
      irpp: 11_836,
      net: 132_100,
      workedDays: 22,
      reportedHours: 176,
      reference: "BS-2026-01-MBA",
    },
  ];
  for (const p of payslipsData) {
    const periodDate = new Date(p.period);
    await prisma.payslip.upsert({
      where: {
        tenantId_userId_period: { tenantId, userId: etienne.id, period: periodDate },
      },
      create: {
        tenantId,
        userId: etienne.id,
        period: periodDate,
        periodEnd: new Date(p.end),
        periodLabel: p.period.slice(0, 7),
        paymentDate: new Date(p.paymentDate),
        paymentMode: "VIREMENT",
        paymentMethod: PayslipPaymentMethod.BANK_TRANSFER,
        paymentBankAccount: "Afriland First Bank · ****1842",
        paymentReference: p.reference,
        baseSalary: BigInt(p.base),
        overtimeAmount: BigInt(p.overtimeAmount),
        overtimeHours: p.overtimeHours,
        overtimeHours125: p.overtimeHours,
        seniorityBonus: BigInt(p.seniorityBonus),
        transportAllowance: BigInt(p.transportAllowance),
        otherBonuses: [{ code: "PANIER_REPAS", label: "Prime chantier · panier repas", amount: p.transportAllowance }],
        grossAmount: BigInt(p.gross),
        taxableGross: BigInt(p.gross),
        cnpsAmount: BigInt(p.cnps),
        irppAmount: BigInt(p.irpp),
        socialCharges: BigInt(p.cnps),
        fiscalCharges: BigInt(p.irpp),
        otherDeductions: BigInt(0),
        employerCharges: BigInt(Math.round(p.gross * 0.16)),
        netAmount: BigInt(p.net),
        workedDays: p.workedDays,
        reportedHours: p.reportedHours,
        status: PayslipStatus.PAID,
        paidAt: new Date(p.paymentDate),
      },
      update: {
        paymentBankAccount: "Afriland First Bank · ****1842",
        paymentReference: p.reference,
        baseSalary: BigInt(p.base),
        overtimeAmount: BigInt(p.overtimeAmount),
        overtimeHours: p.overtimeHours,
        seniorityBonus: BigInt(p.seniorityBonus),
        transportAllowance: BigInt(p.transportAllowance),
        grossAmount: BigInt(p.gross),
        cnpsAmount: BigInt(p.cnps),
        irppAmount: BigInt(p.irpp),
        netAmount: BigInt(p.net),
        status: PayslipStatus.PAID,
      },
    });
  }
  console.log(`  ✓ ${payslipsData.length} Payslips Étienne (avril 2026 net 142 480 + Q1)`);

  // ---------------------------------------------------------------
  // 6ter) 1 avance sur salaire déjà payée (mars) + 1 demande en attente
  // ---------------------------------------------------------------
  const advanceMarch = await prisma.salaryAdvanceRequest.findFirst({
    where: { userId: etienne.id, reason: "Scolarité enfants — rentrée Pâques" },
    select: { id: true },
  });
  if (!advanceMarch) {
    await prisma.salaryAdvanceRequest.create({
      data: {
        tenantId,
        userId: etienne.id,
        amountXAF: BigInt(30_000),
        maxAllowedXAF: BigInt(42_600), // 30% × 142 000
        reason: "Scolarité enfants — rentrée Pâques",
        status: SalaryAdvanceStatus.PAID,
        validatedAt: new Date("2026-03-04T09:30:00Z"),
        payoutAt: new Date("2026-03-05T14:00:00Z"),
        payoutMethod: "BANK_TRANSFER",
        recoveryMonth: "2026-04",
        recoveredAt: new Date("2026-05-02"),
        createdAt: new Date("2026-03-03T11:20:00Z"),
      },
    });
  }
  console.log("  ✓ 1 avance Étienne (30 000 FCFA · récupérée sur paie avril)");

  // ---------------------------------------------------------------
  // 7) Joseph ESSAMA — gardien (isGuard=true)
  // ---------------------------------------------------------------
  await prisma.user.upsert({
    where: { email: JOSEPH_EMAIL },
    create: {
      tenantId,
      email: JOSEPH_EMAIL,
      firstName: "Joseph",
      lastName: "ESSAMA",
      passwordHash,
      pinHash: pinHashJoseph,
      phoneVerified: true,
      role: Role.WORKER,
      emailVerified: true,
      phone: JOSEPH_PHONE,
      phoneMobile: JOSEPH_PHONE,
      matricule: "BTC-2017-0145",
      hireDate: new Date("2017-06-01"),
      position: "Gardien chantier",
      workerQualification: "Gardien · tour de garde",
      professionalCategory: "Catégorie 5 · échelon 1",
      category: "OS",
      contractType: ContractType.CDI,
      isGuard: true,
      teamLeader: false,
      assignedSiteIds: [pontMfoundi.id],
      preferredLanguage: "fr-CM",
      notificationChannel: "WHATSAPP",
    },
    update: {
      pinHash: pinHashJoseph,
      isGuard: true,
      phone: JOSEPH_PHONE,
      role: Role.WORKER,
    },
  });
  console.log("  ✓ Joseph ESSAMA (gardien) créé/maj");

  // ---------------------------------------------------------------
  // 8) ~408 ouvriers stubs (volume réaliste 440 WORKER BatimCAM)
  //    Stubs lite : email + nom + role + phone + matricule + qualif.
  //    Pas de PIN (créé à la demande RH lors de l'enrôlement réel).
  // ---------------------------------------------------------------
  const existingWorkerCount = await prisma.user.count({
    where: { tenantId, role: Role.WORKER },
  });
  const stubsToCreate = Math.max(0, STUB_TARGET - (existingWorkerCount - 2));
  if (stubsToCreate > 0) {
    const rand = rng(42);
    const stubs: Array<{ data: Parameters<typeof prisma.user.create>[0]["data"] }> = [];
    let createdStubs = 0;
    let i = 0;
    while (createdStubs < stubsToCreate && i < stubsToCreate * 3) {
      i++;
      const fn = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const ln = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      const pos = POSITIONS[Math.floor(rand() * POSITIONS.length)];
      const hireYear = 2016 + Math.floor(rand() * 10);
      const seq = 1000 + i;
      const matricule = `BTC-${hireYear}-${String(seq).padStart(4, "0")}`;
      const email = `ouv.${matricule.toLowerCase()}@batimcam.cm`;
      const phone = `+2376${String(70_000_000 + Math.floor(rand() * 29_999_999)).slice(0, 8)}`;

      const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (exists) continue;

      stubs.push({
        data: {
          tenantId,
          email,
          firstName: fn,
          lastName: ln,
          passwordHash,
          role: Role.WORKER,
          phone,
          phoneMobile: phone,
          matricule,
          hireDate: new Date(`${hireYear}-04-01`),
          position: pos,
          workerQualification: pos,
          professionalCategory: "Catégorie 6 · échelon 1",
          category: pos.includes("Chef") ? "OQ" : "OS",
          contractType: hireYear < 2023 ? ContractType.CDI : ContractType.JOURNALIER,
          assignedSiteIds: [pontMfoundi.id],
          preferredLanguage: "fr-CM",
          notificationChannel: "WHATSAPP",
        },
      });
      createdStubs++;
    }

    if (stubs.length > 0) {
      // Inserts en batch via createMany (skipDuplicates au cas où)
      await prisma.user.createMany({
        data: stubs.map((s) => s.data) as any,
        skipDuplicates: true,
      });
    }
    console.log(`  ✓ ${stubs.length} ouvriers stubs créés (volume cible ${STUB_TARGET})`);
  } else {
    console.log(`  → Volume ouvriers déjà atteint (${existingWorkerCount} WORKER présents)`);
  }

  const finalWorkerCount = await prisma.user.count({ where: { tenantId, role: Role.WORKER } });
  console.log(`\n🎉 Seed OUV terminé — ${finalWorkerCount} WORKER au total dans le tenant.\n`);
  console.log(`Connexion Étienne (PWA mobile) :`);
  console.log(`   URL  : http://${tenantSlug}.terp.local:5000/ouv-login`);
  console.log(`   Tél  : ${ETIENNE_PHONE}`);
  console.log(`   PIN  : ${ETIENNE_PIN}\n`);
}

main()
  .catch((err) => {
    console.error("❌ Seed OUV erreur :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
