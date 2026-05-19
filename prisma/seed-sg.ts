import "./_guard-prod";
/**
 * Seed complémentaire — SG · Secrétaire Général (Élisabeth NDONGMO · Bloc 0).
 *
 * À lancer APRÈS le seed principal (`pnpm db:seed`) :
 *   pnpm exec tsx prisma/seed-sg.ts
 *
 * Ajoute :
 *  - Élisabeth NDONGMO (SECRETARY_GENERAL, 5 flags actifs) au tenant BatimCAM
 *  - 6 ClientContract (subset des 23 marchés réels — 2 par phase clé)
 *  - 3 BankGuarantee (1 par contrat actif)
 *  - 9 BoardMember (Albert PCA-DG + 8 administrateurs)
 *  - 8 Shareholder (capital 500 M FCFA · 50 000 actions × 10 000)
 *  - 4 LegalCase actifs (provisions 82 M FCFA) + 6 LegalCaseEvent
 *  - 2 GovernanceMeeting (CA prochain + AG annuelle) + 4 MeetingDecision
 *  - 8 RegulatoryRegister (1 par RegisterType)
 *  - 8 Institution (échantillon : 2 ministères + 2 communes + 2 banques + 2 cabinets)
 *  - 3 ProfessionalApproval (Agrément BTP cat. 4, AEP, ouvrages d'art)
 *  - 12 OfficialCorrespondence (mix INCOMING/OUTGOING + statuts variés)
 */
import {
  PrismaClient,
  Role,
  ContractingAuthorityType,
  ContractPhase,
  LegalContractStatus,
  MarketContractStatus,
  GuaranteeType,
  GuaranteeStatus,
  MeetingType,
  MeetingStatus,
  DecisionType,
  BoardMemberFunction,
  BoardMemberStatus,
  ShareholderEntityType,
  ShareholderStatus,
  LegalPosition,
  LegalCaseStatus,
  RegisterType,
  RegisterStatus,
  CorrespondenceDirection,
  CorrespondenceConfidentiality,
  CorrespondenceStatus,
  InstitutionType,
  InstitutionCategory,
  RelationshipStatus,
  ApprovalStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed SG (Élisabeth NDONGMO · Secrétaire Général)...");

  const albert = await prisma.user.findFirst({
    where: { email: "albert@batimcam.cm" },
    select: { id: true, tenantId: true },
  });
  if (!albert?.tenantId) {
    console.error("DG Albert introuvable — lancez d'abord pnpm db:seed");
    return;
  }
  const tenantId = albert.tenantId;

  // ────────────────────────────────────────────────────────────────────────
  // 1. Élisabeth NDONGMO — SECRETARY_GENERAL avec les 5 flags
  // ────────────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Demo2026!", 10);
  const elisabeth = await prisma.user.upsert({
    where: { email: "elisabeth@batimcam.cm" },
    update: {
      role: Role.SECRETARY_GENERAL,
      tenantId,
      canManageCorporateGovernance: true,
      canManageMarketContracts: true,
      canManageLegalCases: true,
      canManageOfficialCorrespondence: true,
      canReadAllDashboards: true,
    },
    create: {
      email: "elisabeth@batimcam.cm",
      passwordHash,
      firstName: "Élisabeth",
      lastName: "NDONGMO",
      phone: "+237699445566",
      role: Role.SECRETARY_GENERAL,
      tenantId,
      position: "Secrétaire Général",
      category: "Cadre dirigeant",
      assignedSiteIds: [],
      canManageCorporateGovernance: true,
      canManageMarketContracts: true,
      canManageLegalCases: true,
      canManageOfficialCorrespondence: true,
      canReadAllDashboards: true,
      emailVerified: true,
    },
    select: { id: true },
  });
  console.log(`  ✓ Élisabeth NDONGMO (SECRETARY_GENERAL · 5 flags actifs)`);

  // Récupère sites pour lier les marchés
  const sites = await prisma.site.findMany({
    where: { code: { in: ["CHT-2025-031", "CHT-2025-018", "CHT-2026-022", "CHT-2026-031", "CHT-2026-001", "CHT-2026-018"] } },
    select: { id: true, code: true, name: true },
  });
  const siteByCode = new Map(sites.map((s) => [s.code, s]));

  // ────────────────────────────────────────────────────────────────────────
  // 2. ClientContract — 6 marchés représentatifs
  // ────────────────────────────────────────────────────────────────────────
  const now = new Date();
  const contractsSeed = [
    {
      reference: "M-2024-008",
      title: "Construction Pont Mfoundi",
      contractingAuthority: "Commune Yaoundé I",
      authorityType: ContractingAuthorityType.PUBLIC_MUNICIPALITY,
      amountHT: 280_000_000n,
      phase: ContractPhase.EXECUTION,
      siteCode: "CHT-2025-031",
      legalStatus: LegalContractStatus.OK,
      status: MarketContractStatus.ACTIVE,
      signatureDate: new Date("2024-08-15"),
      orderServiceDate: new Date("2024-09-01"),
      executionStartDate: new Date("2024-09-15"),
      submissionGuaranteeAmount: 8_400_000n,
      performanceGuaranteeAmount: 14_000_000n,
    },
    {
      reference: "M-2025-002",
      title: "Réhabilitation Route Yaoundé–Nsimalen",
      contractingAuthority: "MINTP — Ministère des Travaux Publics",
      authorityType: ContractingAuthorityType.PUBLIC_MINISTRY,
      amountHT: 840_000_000n,
      phase: ContractPhase.EXECUTION,
      siteCode: "CHT-2025-018",
      legalStatus: LegalContractStatus.AMENDMENT_PENDING,
      status: MarketContractStatus.ACTIVE,
      signatureDate: new Date("2025-02-10"),
      orderServiceDate: new Date("2025-03-01"),
      executionStartDate: new Date("2025-03-15"),
      submissionGuaranteeAmount: 25_200_000n,
      performanceGuaranteeAmount: 42_000_000n,
    },
    {
      reference: "M-2026-001",
      title: "Échangeur Olembé — terrassements + ouvrages d'art",
      contractingAuthority: "MINHDU — Ministère Habitat",
      authorityType: ContractingAuthorityType.PUBLIC_MINISTRY,
      amountHT: 2_350_000_000n,
      phase: ContractPhase.ORDER_SERVICE,
      siteCode: "CHT-2026-022",
      legalStatus: LegalContractStatus.OK,
      status: MarketContractStatus.ACTIVE,
      signatureDate: new Date("2026-01-25"),
      orderServiceDate: new Date("2026-02-15"),
      submissionGuaranteeAmount: 70_500_000n,
      performanceGuaranteeAmount: 117_500_000n,
    },
    {
      reference: "M-2026-004",
      title: "Hôpital de référence Garoua — gros œuvre",
      contractingAuthority: "MINSANTÉ — Ministère Santé",
      authorityType: ContractingAuthorityType.PUBLIC_MINISTRY,
      amountHT: 1_780_000_000n,
      phase: ContractPhase.CONTRACT_SIGNATURE,
      siteCode: "CHT-2026-001",
      legalStatus: LegalContractStatus.OK,
      status: MarketContractStatus.ACTIVE,
      notificationDate: new Date("2026-04-15"),
      submissionGuaranteeAmount: 53_400_000n,
    },
    {
      reference: "AO-2026-012",
      title: "Forage AEP Mbalmayo (étude)",
      contractingAuthority: "Commune Mbalmayo",
      authorityType: ContractingAuthorityType.PUBLIC_MUNICIPALITY,
      amountHT: 145_000_000n,
      phase: ContractPhase.STUDY_AND_SUBMISSION,
      siteCode: "CHT-2026-018",
      legalStatus: LegalContractStatus.OK,
      status: MarketContractStatus.DRAFT,
      callForTendersOpenDate: new Date("2026-04-01"),
      callForTendersCloseDate: new Date("2026-05-30"),
    },
    {
      reference: "M-2025-018",
      title: "Réhabilitation Pont Sanaga",
      contractingAuthority: "MINTP",
      authorityType: ContractingAuthorityType.PUBLIC_MINISTRY,
      amountHT: 920_000_000n,
      phase: ContractPhase.GUARANTEE_PERIOD,
      siteCode: "CHT-2026-031",
      legalStatus: LegalContractStatus.OK,
      status: MarketContractStatus.ACTIVE,
      signatureDate: new Date("2025-05-20"),
      receptionPV: new Date("2026-03-15"),
      gpaEndDate: new Date("2027-03-15"),
      retentionGuaranteeAmount: 46_000_000n,
    },
  ];

  const contractByRef = new Map<string, string>();
  for (const c of contractsSeed) {
    const site = siteByCode.get(c.siteCode);
    const created = await prisma.clientContract.upsert({
      where: { reference: c.reference },
      update: {
        title: c.title,
        contractingAuthority: c.contractingAuthority,
        authorityType: c.authorityType,
        amountHT: c.amountHT,
        phase: c.phase,
        legalStatus: c.legalStatus,
        status: c.status,
        siteId: site?.id ?? null,
      },
      create: {
        tenantId,
        reference: c.reference,
        title: c.title,
        contractingAuthority: c.contractingAuthority,
        authorityType: c.authorityType,
        amountHT: c.amountHT,
        phase: c.phase,
        legalStatus: c.legalStatus,
        status: c.status,
        siteId: site?.id ?? null,
        callForTendersOpenDate: c.callForTendersOpenDate,
        callForTendersCloseDate: c.callForTendersCloseDate,
        notificationDate: c.notificationDate,
        signatureDate: c.signatureDate,
        orderServiceDate: c.orderServiceDate,
        executionStartDate: c.executionStartDate,
        receptionPV: c.receptionPV,
        gpaEndDate: c.gpaEndDate,
        submissionGuaranteeAmount: c.submissionGuaranteeAmount,
        performanceGuaranteeAmount: c.performanceGuaranteeAmount,
        retentionGuaranteeAmount: c.retentionGuaranteeAmount,
        createdBy: elisabeth.id,
      },
      select: { id: true },
    });
    contractByRef.set(c.reference, created.id);
  }
  console.log(`  ✓ ${contractsSeed.length} ClientContract`);

  // ────────────────────────────────────────────────────────────────────────
  // 3. BankGuarantee — 3 garanties actives
  // ────────────────────────────────────────────────────────────────────────
  const guaranteesSeed = [
    {
      contractRef: "M-2024-008",
      type: GuaranteeType.PERFORMANCE,
      amount: 14_000_000n,
      issuingBank: "SGBC — Société Générale Cameroun",
      issuedAt: new Date("2024-09-01"),
      expiryDate: new Date("2027-03-15"),
      status: GuaranteeStatus.ACTIVE,
    },
    {
      contractRef: "M-2025-002",
      type: GuaranteeType.PERFORMANCE,
      amount: 42_000_000n,
      issuingBank: "Afriland First Bank",
      issuedAt: new Date("2025-03-01"),
      expiryDate: new Date("2026-08-30"),
      status: GuaranteeStatus.ACTIVE,
    },
    {
      contractRef: "M-2025-018",
      type: GuaranteeType.RETENTION,
      amount: 46_000_000n,
      issuingBank: "BICEC",
      issuedAt: new Date("2026-03-15"),
      expiryDate: new Date("2027-03-15"),
      status: GuaranteeStatus.ACTIVE,
    },
  ];
  let guaranteeCount = 0;
  for (const g of guaranteesSeed) {
    const cid = contractByRef.get(g.contractRef);
    if (!cid) continue;
    const exists = await prisma.bankGuarantee.findFirst({
      where: { contractId: cid, type: g.type },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.bankGuarantee.create({
      data: {
        contractId: cid,
        type: g.type,
        amount: g.amount,
        issuingBank: g.issuingBank,
        issuedAt: g.issuedAt,
        expiryDate: g.expiryDate,
        status: g.status,
      },
    });
    guaranteeCount++;
  }
  console.log(`  ✓ ${guaranteeCount} BankGuarantee`);

  // ────────────────────────────────────────────────────────────────────────
  // 4. BoardMember — 9 administrateurs (Albert PCA-DG + 8)
  // ────────────────────────────────────────────────────────────────────────
  const boardSeed = [
    { fullName: "Albert DAAYANG", function_: BoardMemberFunction.PRESIDENT_CEO, isIndependent: false, userIdLink: albert.id },
    { fullName: "Marie NGONO", function_: BoardMemberFunction.DIRECTOR_GENERAL, isIndependent: false, representingEntity: "Famille DAAYANG" },
    { fullName: "Élisabeth NDONGMO", function_: BoardMemberFunction.BOARD_SECRETARY, isIndependent: false, userIdLink: elisabeth.id },
    { fullName: "Joseph EKOTTO", function_: BoardMemberFunction.ADMINISTRATOR, isIndependent: false, representingEntity: "SOFICAM SA" },
    { fullName: "Catherine MBALLA", function_: BoardMemberFunction.ADMINISTRATOR, isIndependent: false, representingEntity: "Cadres BatimCAM (FCPE)" },
    { fullName: "Pr. Bertrand FOUDA", function_: BoardMemberFunction.INDEPENDENT_DIRECTOR, isIndependent: true, biography: "Économiste, ancien doyen FSEG Yaoundé II" },
    { fullName: "Me Sophie ATANGANA", function_: BoardMemberFunction.INDEPENDENT_DIRECTOR, isIndependent: true, biography: "Avocate au barreau de Paris et Yaoundé" },
    { fullName: "Roger MOUNDI", function_: BoardMemberFunction.ADMINISTRATOR, isIndependent: false, representingEntity: "Famille DAAYANG (succession)" },
    { fullName: "François TCHANA", function_: BoardMemberFunction.ADMINISTRATOR, isIndependent: false, representingEntity: "Famille DAAYANG" },
  ];
  const mandateStart = new Date("2024-06-30");
  const mandateEnd = new Date("2027-06-30");
  let boardCount = 0;
  for (const m of boardSeed) {
    const exists = await prisma.boardMember.findFirst({
      where: { tenantId, fullName: m.fullName },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.boardMember.create({
      data: {
        tenantId,
        userId: m.userIdLink ?? null,
        fullName: m.fullName,
        function: m.function_,
        representingEntity: m.representingEntity ?? null,
        isIndependent: m.isIndependent,
        mandateStartDate: mandateStart,
        mandateEndDate: mandateEnd,
        biography: m.biography ?? null,
        status: BoardMemberStatus.ACTIVE,
      },
    });
    boardCount++;
  }
  console.log(`  ✓ ${boardCount} BoardMember`);

  // ────────────────────────────────────────────────────────────────────────
  // 5. Shareholder — 8 actionnaires (capital 500 M / 50 000 actions × 10 000)
  // ────────────────────────────────────────────────────────────────────────
  const TOTAL_SHARES = 50_000;
  const shareholdersSeed = [
    { fullName: "Albert DAAYANG", entityType: ShareholderEntityType.INDIVIDUAL, shares: 21_000, percentage: 42.0, nationality: "Camerounaise" },
    { fullName: "Famille DAAYANG (succession)", entityType: ShareholderEntityType.INDIVIDUAL, shares: 8_500, percentage: 17.0, nationality: "Camerounaise" },
    { fullName: "Marie NGONO (épouse)", entityType: ShareholderEntityType.INDIVIDUAL, shares: 5_500, percentage: 11.0, nationality: "Camerounaise" },
    { fullName: "SOFICAM SA", entityType: ShareholderEntityType.CORPORATION, shares: 9_000, percentage: 18.0, nationality: "Camerounaise" },
    { fullName: "FCPE Cadres BatimCAM", entityType: ShareholderEntityType.EMPLOYEE_PLAN, shares: 4_000, percentage: 8.0, nationality: "Camerounaise" },
    { fullName: "Joseph EKOTTO", entityType: ShareholderEntityType.INDIVIDUAL, shares: 1_000, percentage: 2.0, nationality: "Camerounaise" },
    { fullName: "Catherine MBALLA", entityType: ShareholderEntityType.INDIVIDUAL, shares: 600, percentage: 1.2, nationality: "Camerounaise" },
    { fullName: "Roger MOUNDI", entityType: ShareholderEntityType.INDIVIDUAL, shares: 400, percentage: 0.8, nationality: "Camerounaise" },
  ];
  let shareholderCount = 0;
  for (const s of shareholdersSeed) {
    const exists = await prisma.shareholder.findFirst({
      where: { tenantId, fullName: s.fullName },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.shareholder.create({
      data: {
        tenantId,
        fullName: s.fullName,
        entityType: s.entityType,
        numberOfShares: s.shares,
        totalShares: TOTAL_SHARES,
        percentage: s.percentage,
        nationality: s.nationality,
        acquisitionDate: new Date("2018-04-15"),
        acquisitionPrice: BigInt(s.shares * 10_000),
        status: ShareholderStatus.ACTIVE,
        isVoting: true,
      },
    });
    shareholderCount++;
  }
  console.log(`  ✓ ${shareholderCount} Shareholder`);

  // ────────────────────────────────────────────────────────────────────────
  // 6. LegalCase — 4 contentieux actifs (provisions 82 M FCFA)
  // ────────────────────────────────────────────────────────────────────────
  const casesSeed = [
    {
      reference: "CONT-2025-001",
      title: "Pont Mfoundi — réclamation pénalités retard",
      description: "La Commune Yaoundé I réclame 28 M FCFA de pénalités pour retard livraison. Position : contestable, retard majoritairement imputable à approvisionnement ciment.",
      ourPosition: LegalPosition.DEFENDEUR,
      jurisdiction: "Tribunal de Première Instance Yaoundé",
      caseNumber: "TPI/Yaoundé/2025/0287",
      opposingParty: "Commune Yaoundé I",
      opposingPartyType: ContractingAuthorityType.PUBLIC_MUNICIPALITY,
      amountAtStake: 28_000_000n,
      provisionAmount: 18_000_000n,
      lawyerName: "Me Sophie ATANGANA",
      lawFirm: "Cabinet ATANGANA & Associés",
      status: LegalCaseStatus.COURT_PENDING,
      nextHearingDate: new Date("2026-06-12"),
      relatedContractRef: "M-2024-008",
    },
    {
      reference: "CONT-2025-004",
      title: "Litige sous-traitant ferraillage Olembé",
      description: "Sous-traitant SOCATAM réclame 12 M FCFA de prestations supplémentaires non commandées. Médiation en cours.",
      ourPosition: LegalPosition.DEFENDEUR,
      jurisdiction: "Médiation CCJA OHADA",
      opposingParty: "SOCATAM SARL",
      opposingPartyType: ContractingAuthorityType.PRIVATE_COMPANY,
      amountAtStake: 12_000_000n,
      provisionAmount: 6_000_000n,
      lawyerName: "Me Jean-Paul EBALE",
      lawFirm: "Cabinet EBALE & Frères",
      status: LegalCaseStatus.MEDIATION,
      nextHearingDate: new Date("2026-05-28"),
    },
    {
      reference: "CONT-2026-002",
      title: "Recouvrement client privé — chantier abandonné",
      description: "Client privé refuse de payer la dernière situation (24 M FCFA) suite à abandon partiel travaux. Action en recouvrement initiée.",
      ourPosition: LegalPosition.DEMANDEUR,
      jurisdiction: "Tribunal de Commerce Douala",
      caseNumber: "TC/Douala/2026/0118",
      opposingParty: "M. Pierre KAMTO (particulier)",
      opposingPartyType: ContractingAuthorityType.PRIVATE_INDIVIDUAL,
      amountAtStake: 24_000_000n,
      provisionAmount: 0n,
      lawyerName: "Me Sophie ATANGANA",
      lawFirm: "Cabinet ATANGANA & Associés",
      status: LegalCaseStatus.OPEN,
      nextHearingDate: new Date("2026-07-08"),
    },
    {
      reference: "CONT-2026-005",
      title: "Réclamation main-d'œuvre — N3 Yaoundé–Bafia",
      description: "Réclamation collective de 15 ouvriers journaliers (heures supplémentaires non payées). Inspection du travail saisie. Provisions IFRS conservatoires.",
      ourPosition: LegalPosition.DEFENDEUR,
      jurisdiction: "Inspection du Travail Centre",
      opposingParty: "Collectif ouvriers chantier N3",
      amountAtStake: 4_500_000n,
      provisionAmount: 4_500_000n,
      lawyerName: "Cabinet juridique BatimCAM (interne)",
      lawFirm: "Service juridique interne",
      status: LegalCaseStatus.MEDIATION,
      nextHearingDate: new Date("2026-05-22"),
    },
  ];
  let caseCount = 0;
  for (const c of casesSeed) {
    const exists = await prisma.legalCase.findUnique({
      where: { reference: c.reference },
      select: { id: true },
    });
    if (exists) continue;
    const created = await prisma.legalCase.create({
      data: {
        tenantId,
        reference: c.reference,
        title: c.title,
        description: c.description,
        ourPosition: c.ourPosition,
        jurisdiction: c.jurisdiction,
        caseNumber: c.caseNumber ?? null,
        opposingParty: c.opposingParty,
        opposingPartyType: c.opposingPartyType ?? null,
        amountAtStake: c.amountAtStake,
        provisionAmount: c.provisionAmount,
        lawyerName: c.lawyerName,
        lawFirm: c.lawFirm,
        status: c.status,
        nextHearingDate: c.nextHearingDate ?? null,
        relatedContractId: c.relatedContractRef ? contractByRef.get(c.relatedContractRef) ?? null : null,
        openedAt: new Date(now.getTime() - 90 * 86400_000),
      },
      select: { id: true },
    });
    // 1-2 events par cas
    await prisma.legalCaseEvent.createMany({
      data: [
        {
          caseId: created.id,
          eventType: "OPENING",
          eventDate: new Date(now.getTime() - 90 * 86400_000),
          description: `Ouverture du dossier · provisionnement initial ${c.provisionAmount.toString()} FCFA`,
        },
        {
          caseId: created.id,
          eventType: "STRATEGY",
          eventDate: new Date(now.getTime() - 30 * 86400_000),
          description: `Stratégie validée DG : ${c.ourPosition === LegalPosition.DEMANDEUR ? "demande recouvrement intégral" : "défense + négociation amiable préférée"}`,
        },
      ],
    });
    caseCount++;
  }
  const totalProvisions = casesSeed.reduce((s, c) => s + Number(c.provisionAmount), 0);
  console.log(`  ✓ ${caseCount} LegalCase + events (provisions ${(totalProvisions / 1_000_000).toFixed(1)} M FCFA)`);

  // ────────────────────────────────────────────────────────────────────────
  // 7. GovernanceMeeting — prochain CA + AG annuelle
  // ────────────────────────────────────────────────────────────────────────
  const next23d = new Date(now.getTime() + 23 * 86400_000);
  const nextCa = await prisma.governanceMeeting.upsert({
    where: { id: "ca-2026-q2" },
    update: {},
    create: {
      id: "ca-2026-q2",
      tenantId,
      type: MeetingType.BOARD_MEETING,
      scheduledAt: next23d,
      location: "Siège BatimCAM · salle conseil 4ème étage",
      convocationsSentAt: new Date(now.getTime() - 7 * 86400_000),
      convocationsRecipients: { admins: 9, cac: 1 },
      agenda: {
        items: [
          { num: 1, title: "Approbation PV CA précédent", duration: "10 min" },
          { num: 2, title: "Présentation comptes Q1 2026 (DAF Marie NGONO)", duration: "45 min" },
          { num: 3, title: "Proposition avenant marché Échangeur Olembé (>50 M FCFA)", duration: "30 min" },
          { num: 4, title: "Stratégie portefeuille AO Q2-Q3", duration: "30 min" },
          { num: 5, title: "Provisions IFRS contentieux 82 M FCFA — analyse", duration: "20 min" },
          { num: 6, title: "Renouvellement Agrément BTP cat. 4 (échéance 30/06)", duration: "15 min" },
          { num: 7, title: "Questions diverses", duration: "20 min" },
        ],
      },
      status: MeetingStatus.SCHEDULED,
    },
    select: { id: true },
  });
  // 1 décision en attente (renouvellement agrément)
  await prisma.meetingDecision.upsert({
    where: { meetingId_decisionNumber: { meetingId: nextCa.id, decisionNumber: 1 } },
    update: {},
    create: {
      meetingId: nextCa.id,
      decisionNumber: 1,
      title: "Mandat renouvellement Agrément BTP cat. 4",
      description: "Le Conseil mandate la SG (Élisabeth NDONGMO) pour piloter le dossier de renouvellement Agrément BTP cat. 4 auprès du MINTP (échéance 30/06/2026). Budget engagement : 5 M FCFA frais administratifs.",
      decisionType: DecisionType.AUTHORIZATION,
      followUpUserId: elisabeth.id,
      followUpStatus: "EN_COURS",
      decidedAt: next23d,
    },
  });

  // AG annuelle — 60 jours après clôture (cible 30/06)
  const agDate = new Date(now.getFullYear(), 5, 30); // 30 juin
  await prisma.governanceMeeting.upsert({
    where: { id: "ag-2026-ord" },
    update: {},
    create: {
      id: "ag-2026-ord",
      tenantId,
      type: MeetingType.ORDINARY_AG,
      scheduledAt: agDate,
      location: "Hôtel Hilton Yaoundé · salon Mvog-Mbi",
      convocationsRecipients: { shareholders: 8, cac: 1, observers: 2 },
      agenda: {
        items: [
          { num: 1, title: "Approbation des comptes exercice 2025", duration: "1h" },
          { num: 2, title: "Affectation du résultat (proposition dividende 12 % du nominal)", duration: "30 min" },
          { num: 3, title: "Quitus aux administrateurs", duration: "15 min" },
          { num: 4, title: "Renouvellement mandat CAC (Cabinet KPMG · 5 ans)", duration: "30 min" },
          { num: 5, title: "Questions diverses", duration: "30 min" },
        ],
      },
      status: MeetingStatus.SCHEDULED,
    },
  });
  console.log(`  ✓ 2 GovernanceMeeting (CA dans 23j + AG ordinaire 30/06)`);

  // ────────────────────────────────────────────────────────────────────────
  // 8. RegulatoryRegister — 8 registres (1 par RegisterType)
  // ────────────────────────────────────────────────────────────────────────
  const registersSeed: { registerType: RegisterType; name: string; legalBasis: string; status: RegisterStatus; entriesCount: number }[] = [
    { registerType: "AG_DECISIONS", name: "Registre des décisions d'AG", legalBasis: "Acte Uniforme OHADA art. 137", status: "UP_TO_DATE", entriesCount: 24 },
    { registerType: "SHAREHOLDERS", name: "Registre des actionnaires", legalBasis: "Acte Uniforme OHADA art. 746", status: "UP_TO_DATE", entriesCount: 8 },
    { registerType: "BOARD_DECISIONS", name: "Registre des délibérations du CA", legalBasis: "Statuts BatimCAM SA art. 18", status: "UP_TO_DATE", entriesCount: 86 },
    { registerType: "PERSONNEL", name: "Registre du personnel", legalBasis: "Code du travail art. 105", status: "UP_TO_DATE", entriesCount: 487 },
    { registerType: "HSE_SITES", name: "Registre HSE chantiers", legalBasis: "Code du travail art. 95 + arrêté MINEPDED", status: "UP_TO_DATE", entriesCount: 142 },
    { registerType: "REGULATED_AGREEMENTS", name: "Registre conventions réglementées", legalBasis: "Acte Uniforme OHADA art. 438", status: "TO_UPDATE", entriesCount: 6 },
    { registerType: "BANK_GUARANTEES", name: "Registre garanties bancaires émises", legalBasis: "Politique interne SG · Statuts art. 22", status: "UP_TO_DATE", entriesCount: 14 },
    { registerType: "PUBLIC_MARKETS", name: "Registre marchés publics signés", legalBasis: "Code des marchés publics art. 28", status: "UP_TO_DATE", entriesCount: 18 },
  ];
  let registerCount = 0;
  for (const r of registersSeed) {
    const exists = await prisma.regulatoryRegister.findFirst({
      where: { tenantId, registerType: r.registerType },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.regulatoryRegister.create({
      data: {
        tenantId,
        registerType: r.registerType,
        name: r.name,
        legalBasis: r.legalBasis,
        responsibleUserId: elisabeth.id,
        status: r.status,
        entriesCount: r.entriesCount,
        lastEntryDate: new Date(now.getTime() - 7 * 86400_000),
        nextReviewDate: new Date(now.getTime() + 90 * 86400_000),
      },
    });
    registerCount++;
  }
  console.log(`  ✓ ${registerCount} RegulatoryRegister (7 à jour, 1 à mettre à jour)`);

  // ────────────────────────────────────────────────────────────────────────
  // 9. Institution — 8 institutions stratégiques
  // ────────────────────────────────────────────────────────────────────────
  const institutionsSeed = [
    { name: "MINTP — Ministère des Travaux Publics", type: InstitutionType.MINISTRY, category: InstitutionCategory.CLIENT, primaryContactName: "M. ATANGA Albert", primaryContactRole: "Directeur Général", relationshipStatus: RelationshipStatus.ACTIVE },
    { name: "MINHDU — Ministère Habitat", type: InstitutionType.MINISTRY, category: InstitutionCategory.CLIENT, primaryContactName: "Mme NDONGO Lucienne", primaryContactRole: "DG Adjointe", relationshipStatus: RelationshipStatus.ACTIVE },
    { name: "Commune Yaoundé I", type: InstitutionType.MUNICIPALITY, category: InstitutionCategory.CLIENT, primaryContactName: "M. EYINGA Jean-Pierre", primaryContactRole: "Maire", relationshipStatus: RelationshipStatus.SENSITIVE, relationshipNotes: "Contentieux pénalités Pont Mfoundi en cours (28 M FCFA)" },
    { name: "Commune Mbalmayo", type: InstitutionType.MUNICIPALITY, category: InstitutionCategory.CLIENT, primaryContactName: "M. ESSOMBA Théodore", primaryContactRole: "Maire", relationshipStatus: RelationshipStatus.ACTIVE },
    { name: "GICAM — Groupement Inter-patronal du Cameroun", type: InstitutionType.PROFESSIONAL_ASSOCIATION, category: InstitutionCategory.ASSOCIATION, primaryContactName: "Mme NJIE Célestine", primaryContactRole: "Présidente", relationshipStatus: RelationshipStatus.ACTIVE, relationshipNotes: "Albert DAAYANG membre du conseil GICAM BTP" },
    { name: "Cabinet ATANGANA & Associés", type: InstitutionType.LAW_FIRM, category: InstitutionCategory.PARTNER, primaryContactName: "Me Sophie ATANGANA", primaryContactRole: "Avocate associée", primaryContactPhone: "+237699112233", primaryContactEmail: "s.atangana@cabinet-atangana.cm", relationshipStatus: RelationshipStatus.ACTIVE },
    { name: "KPMG Cameroun", type: InstitutionType.AUDIT_FIRM, category: InstitutionCategory.PARTNER, primaryContactName: "M. NDOUMBE Pierre", primaryContactRole: "Associé · CAC mandaté", relationshipStatus: RelationshipStatus.ACTIVE, relationshipNotes: "CAC titulaire mandat 2024-2029" },
    { name: "SGBC — Société Générale Cameroun", type: InstitutionType.BANK, category: InstitutionCategory.PARTNER, primaryContactName: "M. MBAH Désiré", primaryContactRole: "Directeur agence corporate", relationshipStatus: RelationshipStatus.ACTIVE, relationshipNotes: "Banque principale · 2 garanties actives 56 M FCFA" },
  ];
  let institutionCount = 0;
  for (const i of institutionsSeed) {
    const exists = await prisma.institution.findFirst({
      where: { tenantId, name: i.name },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.institution.create({
      data: {
        tenantId,
        name: i.name,
        type: i.type,
        category: i.category,
        primaryContactName: i.primaryContactName,
        primaryContactRole: i.primaryContactRole,
        primaryContactPhone: i.primaryContactPhone,
        primaryContactEmail: i.primaryContactEmail,
        relationshipStatus: i.relationshipStatus,
        relationshipNotes: i.relationshipNotes,
      },
    });
    institutionCount++;
  }
  console.log(`  ✓ ${institutionCount} Institution`);

  // ────────────────────────────────────────────────────────────────────────
  // 10. ProfessionalApproval — 3 agréments BTP
  // ────────────────────────────────────────────────────────────────────────
  const approvalsSeed = [
    {
      approvalName: "Agrément BTP catégorie 4 — Bâtiments et travaux publics tous types",
      deliveringAuthority: "MINTP",
      approvalNumber: "AGR-BTP4-2021-187",
      issuedAt: new Date("2021-06-30"),
      expiresAt: new Date(now.getFullYear(), 5, 30), // expire 30/06 année courante
      status: ApprovalStatus.EXPIRING_SOON,
    },
    {
      approvalName: "Agrément spécialisé AEP — Adduction Eau Potable",
      deliveringAuthority: "MINEE — Ministère Eau et Énergie",
      approvalNumber: "AGR-AEP-2023-042",
      issuedAt: new Date("2023-03-15"),
      expiresAt: new Date(2028, 2, 15),
      status: ApprovalStatus.VALID,
    },
    {
      approvalName: "Agrément ouvrages d'art — Ponts et tunnels",
      deliveringAuthority: "MINTP — DGA Ouvrages d'art",
      approvalNumber: "AGR-OA-2022-018",
      issuedAt: new Date("2022-09-01"),
      expiresAt: new Date(2027, 8, 1),
      status: ApprovalStatus.VALID,
    },
  ];
  let approvalCount = 0;
  for (const a of approvalsSeed) {
    const exists = await prisma.professionalApproval.findFirst({
      where: { tenantId, approvalNumber: a.approvalNumber },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.professionalApproval.create({
      data: {
        tenantId,
        approvalName: a.approvalName,
        deliveringAuthority: a.deliveringAuthority,
        approvalNumber: a.approvalNumber,
        issuedAt: a.issuedAt,
        expiresAt: a.expiresAt,
        status: a.status,
      },
    });
    approvalCount++;
  }
  console.log(`  ✓ ${approvalCount} ProfessionalApproval (1 expirant bientôt — Agrément BTP cat. 4)`);

  // ────────────────────────────────────────────────────────────────────────
  // 11. OfficialCorrespondence — 12 courriers
  // ────────────────────────────────────────────────────────────────────────
  const correspondencesSeed = [
    { reference: "C-2026-IN-0142", direction: CorrespondenceDirection.INCOMING, days: -2, correspondentName: "MINTP — Sec. Général", correspondentEntity: "Ministère Travaux Publics", subject: "Notification décision attribution Échangeur Olembé", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.ARCHIVED, requiresDgSignature: false },
    { reference: "C-2026-IN-0148", direction: CorrespondenceDirection.INCOMING, days: -1, correspondentName: "Commune Yaoundé I", subject: "Mise en demeure pénalités retard Pont Mfoundi", confidentiality: CorrespondenceConfidentiality.SENSITIVE, status: CorrespondenceStatus.IN_PROGRESS, requiresDgSignature: false },
    { reference: "C-2026-OUT-0089", direction: CorrespondenceDirection.OUTGOING, days: -3, correspondentName: "MINTP — Direction Agréments", subject: "Demande renouvellement Agrément BTP cat. 4", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.SIGNED, requiresDgSignature: true, signed: true },
    { reference: "C-2026-OUT-0092", direction: CorrespondenceDirection.OUTGOING, days: 0, correspondentName: "Cabinet ATANGANA", subject: "Position défense Pont Mfoundi · stratégie audience 12/06", confidentiality: CorrespondenceConfidentiality.CONFIDENTIAL, status: CorrespondenceStatus.AWAITING_DG_SIGNATURE, requiresDgSignature: true },
    { reference: "C-2026-IN-0151", direction: CorrespondenceDirection.INCOMING, days: -5, correspondentName: "KPMG Cameroun", subject: "Plan de mission audit légal exercice 2025", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.ARCHIVED },
    { reference: "C-2026-OUT-0095", direction: CorrespondenceDirection.OUTGOING, days: -1, correspondentName: "GICAM BTP", subject: "Position BatimCAM sur projet réforme code des marchés publics", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.SIGNED, requiresDgSignature: true, signed: true },
    { reference: "C-2026-IN-0156", direction: CorrespondenceDirection.INCOMING, days: 0, correspondentName: "Inspection du Travail Centre", subject: "Convocation médiation N3 Yaoundé–Bafia 22/05", confidentiality: CorrespondenceConfidentiality.SENSITIVE, status: CorrespondenceStatus.RECEIVED, requiresDgSignature: false },
    { reference: "C-2026-OUT-0098", direction: CorrespondenceDirection.OUTGOING, days: 1, correspondentName: "MINSANTÉ", subject: "Lettre d'engagement délais — Hôpital Garoua", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.AWAITING_DG_SIGNATURE, requiresDgSignature: true },
    { reference: "C-2026-IN-0161", direction: CorrespondenceDirection.INCOMING, days: -7, correspondentName: "BICEC", subject: "Émission garantie retenue Pont Sanaga 46 M", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.ARCHIVED },
    { reference: "C-2026-OUT-0101", direction: CorrespondenceDirection.OUTGOING, days: -2, correspondentName: "MINEE", subject: "Confirmation participation appel d'offres Forage Mbalmayo", confidentiality: CorrespondenceConfidentiality.STANDARD, status: CorrespondenceStatus.SIGNED, requiresDgSignature: true, signed: true },
    { reference: "C-2026-IN-0167", direction: CorrespondenceDirection.INCOMING, days: -1, correspondentName: "M. Pierre KAMTO", subject: "Réponse aux mises en demeure recouvrement", confidentiality: CorrespondenceConfidentiality.SENSITIVE, status: CorrespondenceStatus.IN_PROGRESS, requiresDgSignature: false },
    { reference: "C-2026-OUT-0103", direction: CorrespondenceDirection.OUTGOING, days: 2, correspondentName: "Tous administrateurs CA", subject: `Convocation CA semestriel + ordre du jour (${next23d.toLocaleDateString("fr-FR")})`, confidentiality: CorrespondenceConfidentiality.CONFIDENTIAL, status: CorrespondenceStatus.SENT, requiresDgSignature: true, signed: true },
  ];
  let corrCount = 0;
  for (const c of correspondencesSeed) {
    const exists = await prisma.officialCorrespondence.findUnique({
      where: { reference: c.reference },
      select: { id: true },
    });
    if (exists) continue;
    const date = new Date(now.getTime() + c.days * 86400_000);
    await prisma.officialCorrespondence.create({
      data: {
        tenantId,
        reference: c.reference,
        direction: c.direction,
        date,
        correspondentName: c.correspondentName,
        correspondentEntity: c.correspondentEntity ?? null,
        subject: c.subject,
        confidentiality: c.confidentiality,
        status: c.status,
        assignedToUserId: c.direction === CorrespondenceDirection.INCOMING ? elisabeth.id : null,
        dueDate: c.status === CorrespondenceStatus.IN_PROGRESS ? new Date(date.getTime() + 7 * 86400_000) : null,
        handledAt: c.status === CorrespondenceStatus.ARCHIVED || c.signed ? date : null,
        requiresDgSignature: c.requiresDgSignature,
        signedByDgAt: c.signed ? date : null,
        dgSignatureRef: c.signed ? `SIG-DG-${c.reference.slice(-4)}` : null,
      },
    });
    corrCount++;
  }
  console.log(`  ✓ ${corrCount} OfficialCorrespondence`);

  console.log("\n✅ Seed SG terminé.");
  console.log("   Compte : elisabeth@batimcam.cm / Demo2026!");
  console.log("   Note : MFA spec'd dans le prompt — non implémenté (phase 2)");
}

main()
  .catch((e) => {
    console.error("Erreur seed SG :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
