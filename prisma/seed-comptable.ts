import "./_guard-prod";
/**
 * Seed complémentaire — données Comptable (Bloc 0/1).
 *
 * À lancer APRÈS le seed principal (`pnpm db:seed`) :
 *   pnpm exec tsx prisma/seed-comptable.ts
 *
 * Ajoute :
 *  - Plan comptable SYSCOHADA Cameroun (extrait ~80 comptes les plus utilisés)
 *  - Sites cashboxes pour chaque chantier actif
 *  - Quelques écritures + factures fournisseurs + situations de travaux
 *  - Promotions Jacques MBARGA + Christine NGAH vers ACCOUNTANT chantier
 */
import {
  PrismaClient,
  Role,
  AccountType,
  CptEntryStatus,
  InvoiceStatus,
  BillingStatus,
  CashDirection,
  PromotionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ===== PLAN COMPTABLE SYSCOHADA (extrait Cameroun) =====
const SYSCOHADA_ACCOUNTS: Array<{ code: string; name: string; class: number; type: AccountType; rt?: boolean }> = [
  // Classe 1 — Capitaux
  { code: "101000", name: "Capital social", class: 1, type: AccountType.EQUITY },
  { code: "106000", name: "Réserves", class: 1, type: AccountType.EQUITY },
  { code: "120000", name: "Résultat de l'exercice", class: 1, type: AccountType.EQUITY },
  { code: "168000", name: "Emprunts auprès des banques", class: 1, type: AccountType.LIABILITY },
  // Classe 2 — Immobilisations
  { code: "211000", name: "Terrains", class: 2, type: AccountType.ASSET },
  { code: "213000", name: "Constructions", class: 2, type: AccountType.ASSET },
  { code: "215000", name: "Matériel et outillage", class: 2, type: AccountType.ASSET },
  { code: "218000", name: "Matériel de transport", class: 2, type: AccountType.ASSET },
  { code: "281500", name: "Amortissements matériel et outillage", class: 2, type: AccountType.ASSET },
  { code: "281800", name: "Amortissements matériel de transport", class: 2, type: AccountType.ASSET },
  // Classe 3 — Stocks
  { code: "311000", name: "Marchandises", class: 3, type: AccountType.ASSET },
  { code: "321000", name: "Matières premières", class: 3, type: AccountType.ASSET },
  { code: "351000", name: "Produits en cours", class: 3, type: AccountType.ASSET },
  // Classe 4 — Tiers
  { code: "401000", name: "Fournisseurs", class: 4, type: AccountType.LIABILITY, rt: true },
  { code: "411000", name: "Clients", class: 4, type: AccountType.ASSET, rt: true },
  { code: "421000", name: "Personnel - rémunérations dues", class: 4, type: AccountType.LIABILITY },
  { code: "431000", name: "Sécurité sociale (CNPS)", class: 4, type: AccountType.LIABILITY },
  { code: "443000", name: "État - TVA collectée", class: 4, type: AccountType.LIABILITY },
  { code: "445660", name: "État - TVA déductible 19,25%", class: 4, type: AccountType.ASSET },
  { code: "447100", name: "État - IRPP retenu à la source", class: 4, type: AccountType.LIABILITY },
  { code: "468000", name: "Comptes courants débiteurs / créditeurs", class: 4, type: AccountType.ASSET },
  // Classe 5 — Trésorerie
  { code: "521000", name: "Banques", class: 5, type: AccountType.ASSET },
  { code: "531000", name: "Caisse siège", class: 5, type: AccountType.ASSET },
  { code: "532000", name: "Caisses chantiers", class: 5, type: AccountType.ASSET },
  // Classe 6 — Charges
  { code: "601000", name: "Achats matières premières", class: 6, type: AccountType.EXPENSE },
  { code: "604000", name: "Achats matériaux et fournitures", class: 6, type: AccountType.EXPENSE },
  { code: "605000", name: "Autres achats", class: 6, type: AccountType.EXPENSE },
  { code: "611000", name: "Sous-traitance générale", class: 6, type: AccountType.EXPENSE },
  { code: "612000", name: "Locations", class: 6, type: AccountType.EXPENSE },
  { code: "615000", name: "Entretien et réparations", class: 6, type: AccountType.EXPENSE },
  { code: "618000", name: "Documentation, frais postaux, téléphone", class: 6, type: AccountType.EXPENSE },
  { code: "622000", name: "Rémunérations intermédiaires et honoraires", class: 6, type: AccountType.EXPENSE },
  { code: "624000", name: "Transports de biens et personnel", class: 6, type: AccountType.EXPENSE },
  { code: "625000", name: "Déplacements, missions, réceptions", class: 6, type: AccountType.EXPENSE },
  { code: "626000", name: "Frais postaux et de télécommunications", class: 6, type: AccountType.EXPENSE },
  { code: "627000", name: "Services bancaires", class: 6, type: AccountType.EXPENSE },
  { code: "631000", name: "Impôts et taxes", class: 6, type: AccountType.EXPENSE },
  { code: "641000", name: "Rémunérations du personnel", class: 6, type: AccountType.EXPENSE },
  { code: "645000", name: "Charges sociales (CNPS)", class: 6, type: AccountType.EXPENSE },
  { code: "648000", name: "Autres charges sociales", class: 6, type: AccountType.EXPENSE },
  { code: "661000", name: "Frais financiers (intérêts emprunts)", class: 6, type: AccountType.EXPENSE },
  { code: "681100", name: "Dotations aux amortissements", class: 6, type: AccountType.EXPENSE },
  { code: "691000", name: "Charges exceptionnelles", class: 6, type: AccountType.EXPENSE },
  // Classe 7 — Produits
  { code: "701000", name: "Ventes de marchandises", class: 7, type: AccountType.REVENUE },
  { code: "705000", name: "Travaux de BTP — situations", class: 7, type: AccountType.REVENUE },
  { code: "706000", name: "Prestations de services", class: 7, type: AccountType.REVENUE },
  { code: "708000", name: "Produits accessoires", class: 7, type: AccountType.REVENUE },
  { code: "770000", name: "Produits financiers", class: 7, type: AccountType.REVENUE },
  { code: "790000", name: "Produits exceptionnels", class: 7, type: AccountType.REVENUE },
];

async function main() {
  console.log("🌱 Seed Comptable...");

  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  if (tenants.length === 0) {
    console.error("Aucun tenant — lancez d'abord pnpm db:seed");
    return;
  }
  // On vise la tenant mère BatimCAM SA (catalogue suppliers + comptable),
  // par défaut le tenant identifié par slug `batimcam`. Fallback : le premier
  // tenant qui a au moins un fournisseur.
  let tenantId = tenants.find((t) => t.slug === "batimcam")?.id;
  if (!tenantId) {
    for (const t of tenants) {
      const supplierCount = await prisma.supplier.count({ where: { tenantId: t.id } });
      if (supplierCount > 0) {
        tenantId = t.id;
        break;
      }
    }
  }
  if (!tenantId) {
    console.error("Aucun tenant avec fournisseurs — lancez d'abord pnpm db:seed");
    return;
  }
  const tenantSlug = tenants.find((t) => t.id === tenantId)?.slug ?? "?";
  console.log(`  → Tenant ciblé : ${tenantSlug}`);

  // 1. Plan comptable
  await prisma.chartOfAccounts.deleteMany({ where: { tenantId } });
  await prisma.chartOfAccounts.createMany({
    data: SYSCOHADA_ACCOUNTS.map((a) => ({
      tenantId,
      code: a.code,
      name: a.name,
      class: a.class,
      type: a.type,
      requiresThirdParty: a.rt ?? false,
      active: true,
    })),
  });
  console.log(`  ✓ ${SYSCOHADA_ACCOUNTS.length} comptes SYSCOHADA seedés`);

  // 2. Cashboxes pour chaque chantier
  // BatimCAM SA est une mère sans sites propres — on cherche dans les filiales
  // (parentTenantId = tenantId) pour récupérer les chantiers réels.
  const groupTenantIds = [
    tenantId,
    ...(await prisma.tenant
      .findMany({ where: { parentId: tenantId }, select: { id: true } })
      .then((arr) => arr.map((t) => t.id))),
  ];
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: groupTenantIds }, status: { in: ["ACTIVE", "AT_RISK", "DRIFTING"] } },
    select: { id: true, code: true },
    take: 10,
  });
  const directionUser = await prisma.user.findFirst({
    where: { tenantId, role: { in: [Role.DAF, Role.DG] } },
    select: { id: true },
  });
  if (directionUser) {
    for (const s of sites) {
      await prisma.siteCashbox.upsert({
        where: { siteId: s.id },
        create: { siteId: s.id, balance: BigInt(500_000), custodianId: directionUser.id },
        update: {},
      });
    }
    console.log(`  ✓ ${sites.length} caisses chantier créées`);
  }

  // 3. Promotions ACCOUNTANT chantier
  const accountantUser = await prisma.user.findFirst({
    where: { tenantId, role: Role.ACCOUNTANT },
    select: { id: true, role: true },
  });
  const hr = await prisma.user.findFirst({
    where: { tenantId, role: Role.HR },
    select: { id: true },
  });
  if (accountantUser && hr && sites.length >= 2) {
    await prisma.rolePromotionRequest.deleteMany({ where: { tenantId } });
    await prisma.rolePromotionRequest.create({
      data: {
        tenantId,
        targetUserId: accountantUser.id,
        fromRole: accountantUser.role,
        toRole: Role.ACCOUNTANT,
        requestedSiteIds: [sites[0].id, sites[1].id],
        justification:
          "Affectation comme Comptable Chantier sur les 2 chantiers majeurs — workflow standard",
        requestedById: hr.id,
        validatorRoles: [Role.DAF],
        validations: [],
        status: PromotionStatus.PENDING,
      },
    });
    console.log(`  ✓ Demande promotion Comptable Chantier créée`);
  }

  // 4. Quelques écritures de démo
  if (accountantUser) {
    // ─── Panel de factures fournisseurs couvrant tous les statuts ───
    // Source unique (table SupplierInvoice) consommée par :
    //   - /comptable/factures-frns (page comptable, onglets par statut)
    //   - /direction-financiere/comptabilite (widget PendingInvoicesPanel DAF)
    // Donc tout ce qui est seedé ici apparaît automatiquement aux 2 endroits.
    await prisma.supplierInvoice.deleteMany({ where: { tenantId } });

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
    const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000);

    // On choisit des fournisseurs réels du seed principal pour rester cohérent.
    const supplierNames = [
      "Caterpillar Cameroun",
      "Total Cameroun",
      "Tractafric Equipment",
      "CFAO Motors",
      "ENEO",
      "Quincaillerie Centrale 1",
      "Sablière du Nyong",
      "Transport Cameroun",
      "Bureau d'études 1",
      "EPI Pro 1",
    ];
    const suppliersByName = new Map<string, { id: string }>();
    for (const name of supplierNames) {
      const s = await prisma.supplier.findFirst({ where: { tenantId, name }, select: { id: true } });
      if (s) suppliersByName.set(name, s);
    }
    const fallbackSupplier = await prisma.supplier.findFirst({
      where: { tenantId },
      select: { id: true },
    });

    const getSupplier = (name: string): string | null => {
      return suppliersByName.get(name)?.id ?? fallbackSupplier?.id ?? null;
    };

    interface SeedInvoice {
      number: string;
      supplier: string;
      invoiceDaysAgo: number;
      dueInDays: number; // négatif = échéance dépassée
      amountHt: number;
      siteIdx: number | null;
      status: InvoiceStatus;
      poRef?: string;
      disputeReason?: string;
      receivedDaysAgo?: number;
      accountedDaysAgo?: number;
      paidDaysAgo?: number;
    }

    const fixtures: SeedInvoice[] = [
      // ─── À COMPTABILISER : RECEIVED (3) ───────────────────────────────
      {
        number: "FA-2026-0042",
        supplier: "Caterpillar Cameroun",
        invoiceDaysAgo: 5,
        dueInDays: 25,
        amountHt: 4_200_000,
        siteIdx: 0,
        status: InvoiceStatus.RECEIVED,
        receivedDaysAgo: 4,
      },
      {
        number: "FA-2026-0058",
        supplier: "ENEO",
        invoiceDaysAgo: 3,
        dueInDays: 27,
        amountHt: 1_850_000,
        siteIdx: null,
        status: InvoiceStatus.RECEIVED,
        receivedDaysAgo: 2,
      },
      {
        number: "FA-2026-0061",
        supplier: "Quincaillerie Centrale 1",
        invoiceDaysAgo: 1,
        dueInDays: 29,
        amountHt: 850_000,
        siteIdx: 1,
        status: InvoiceStatus.RECEIVED,
        receivedDaysAgo: 1,
      },

      // ─── PENDING_3WAY_MATCH (2) — avec poRef ──────────────────────────
      {
        number: "FA-2026-0049",
        supplier: "Total Cameroun",
        invoiceDaysAgo: 8,
        dueInDays: 22,
        amountHt: 12_500_000,
        siteIdx: 0,
        status: InvoiceStatus.PENDING_3WAY_MATCH,
        poRef: "BC-2026-0117",
        receivedDaysAgo: 7,
      },
      {
        number: "FA-2026-0053",
        supplier: "Tractafric Equipment",
        invoiceDaysAgo: 12,
        dueInDays: 78,
        amountHt: 28_400_000,
        siteIdx: 1,
        status: InvoiceStatus.PENDING_3WAY_MATCH,
        poRef: "BC-2026-0124",
        receivedDaysAgo: 10,
      },

      // ─── DISPUTED (2) — avec motif ────────────────────────────────────
      {
        number: "FA-2026-0036",
        supplier: "Sablière du Nyong",
        invoiceDaysAgo: 18,
        dueInDays: -3, // déjà en retard
        amountHt: 6_700_000,
        siteIdx: 0,
        status: InvoiceStatus.DISPUTED,
        disputeReason: "Volume facturé > quantité livrée (BL 80 m³ vs facture 95 m³)",
        receivedDaysAgo: 16,
      },
      {
        number: "FA-2026-0040",
        supplier: "Transport Cameroun",
        invoiceDaysAgo: 14,
        dueInDays: 16,
        amountHt: 2_100_000,
        siteIdx: null,
        status: InvoiceStatus.DISPUTED,
        disputeReason: "Tarif unitaire non conforme au contrat-cadre",
        receivedDaysAgo: 12,
      },

      // ─── ACCOUNTED (2) — comptabilisées, pas encore payées ────────────
      {
        number: "FA-2026-0030",
        supplier: "Bureau d'études 1",
        invoiceDaysAgo: 22,
        dueInDays: 8,
        amountHt: 5_400_000,
        siteIdx: 0,
        status: InvoiceStatus.ACCOUNTED,
        receivedDaysAgo: 20,
        accountedDaysAgo: 8,
      },
      {
        number: "FA-2026-0033",
        supplier: "EPI Pro 1",
        invoiceDaysAgo: 25,
        dueInDays: 5,
        amountHt: 1_280_000,
        siteIdx: 1,
        status: InvoiceStatus.ACCOUNTED,
        receivedDaysAgo: 24,
        accountedDaysAgo: 5,
      },

      // ─── PENDING_PAYMENT (2) — à payer J+7 ────────────────────────────
      {
        number: "FA-2026-0024",
        supplier: "Caterpillar Cameroun",
        invoiceDaysAgo: 28,
        dueInDays: 2,
        amountHt: 8_900_000,
        siteIdx: 0,
        status: InvoiceStatus.PENDING_PAYMENT,
        poRef: "BC-2026-0085",
        receivedDaysAgo: 26,
        accountedDaysAgo: 12,
      },
      {
        number: "FA-2026-0027",
        supplier: "CFAO Motors",
        invoiceDaysAgo: 60,
        dueInDays: -1, // J-1 : payable URGENT
        amountHt: 18_500_000,
        siteIdx: null,
        status: InvoiceStatus.PENDING_PAYMENT,
        poRef: "BC-2026-0061",
        receivedDaysAgo: 58,
        accountedDaysAgo: 40,
      },

      // ─── PAID (3) — payées récemment ──────────────────────────────────
      {
        number: "FA-2026-0015",
        supplier: "Total Cameroun",
        invoiceDaysAgo: 40,
        dueInDays: -10,
        amountHt: 7_300_000,
        siteIdx: 0,
        status: InvoiceStatus.PAID,
        poRef: "BC-2026-0040",
        receivedDaysAgo: 38,
        accountedDaysAgo: 25,
        paidDaysAgo: 9,
      },
      {
        number: "FA-2026-0018",
        supplier: "ENEO",
        invoiceDaysAgo: 35,
        dueInDays: -5,
        amountHt: 2_200_000,
        siteIdx: null,
        status: InvoiceStatus.PAID,
        receivedDaysAgo: 34,
        accountedDaysAgo: 20,
        paidDaysAgo: 4,
      },
      {
        number: "FA-2026-0022",
        supplier: "Quincaillerie Centrale 1",
        invoiceDaysAgo: 45,
        dueInDays: -15,
        amountHt: 980_000,
        siteIdx: 1,
        status: InvoiceStatus.PAID,
        receivedDaysAgo: 44,
        accountedDaysAgo: 30,
        paidDaysAgo: 14,
      },
    ];

    let createdCount = 0;
    for (const f of fixtures) {
      const supplierId = getSupplier(f.supplier);
      if (!supplierId) continue;
      const amountHt = BigInt(f.amountHt);
      const vatAmount = BigInt(Math.round(f.amountHt * 0.1925));
      const amountTtc = amountHt + vatAmount;
      await prisma.supplierInvoice.create({
        data: {
          tenantId,
          supplierId,
          invoiceNumber: f.number,
          invoiceDate: daysAgo(f.invoiceDaysAgo),
          dueDate: daysAhead(f.dueInDays),
          amountHt,
          vatAmount,
          amountTtc,
          siteId: f.siteIdx !== null ? sites[f.siteIdx]?.id ?? null : null,
          poRef: f.poRef,
          status: f.status,
          disputeReason: f.disputeReason,
          receivedAt: daysAgo(f.receivedDaysAgo ?? f.invoiceDaysAgo),
          accountedAt: f.accountedDaysAgo !== undefined ? daysAgo(f.accountedDaysAgo) : null,
          paidAt: f.paidDaysAgo !== undefined ? daysAgo(f.paidDaysAgo) : null,
        },
      });
      createdCount++;
    }
    console.log(`  ✓ ${createdCount} factures fournisseurs démo créées (tous statuts)`);

    // ─── Panel de situations de travaux couvrant tous les statuts ────
    await prisma.progressBilling.deleteMany({ where: { tenantId } });

    interface SeedBilling {
      ref: string;
      siteIdx: number;
      periodOffset: number; // -1 = mois précédent, 0 = mois courant
      dueInDays: number; // négatif = échéance dépassée
      amountHt: number;
      status: BillingStatus;
      paidOffsetDays?: number; // si payé : il y a X jours
      paidRatio?: number; // 1 = totalement, < 1 = partiel
      items: Array<{ bpuCode: string; designation: string; unit: string; cumQty: number; prevCumQty: number; unitPrice: number }>;
    }

    const billingFixtures: SeedBilling[] = [
      // À émettre (DRAFT)
      {
        ref: "S0001",
        siteIdx: 0,
        periodOffset: 0,
        dueInDays: 30,
        amountHt: 218_000_000,
        status: BillingStatus.DRAFT,
        items: [
          { bpuCode: "001", designation: "Béton C25/30", unit: "m³", cumQty: 1500, prevCumQty: 1100, unitPrice: 90_000 },
          { bpuCode: "002", designation: "Acier HA12", unit: "tonne", cumQty: 80, prevCumQty: 60, unitPrice: 850_000 },
        ],
      },
      // Validée (prête à émettre)
      {
        ref: "S0002",
        siteIdx: 1,
        periodOffset: 0,
        dueInDays: 28,
        amountHt: 64_500_000,
        status: BillingStatus.VALIDATED,
        items: [
          { bpuCode: "T01", designation: "Terrassement remblai", unit: "m³", cumQty: 4500, prevCumQty: 3000, unitPrice: 12_000 },
          { bpuCode: "ENR", designation: "Couche enrobé 6 cm", unit: "m²", cumQty: 8000, prevCumQty: 4500, unitPrice: 13_000 },
        ],
      },
      // Émise (ISSUED — en attente d'encaissement, échéance future)
      {
        ref: "S0003",
        siteIdx: 2,
        periodOffset: -1,
        dueInDays: 12,
        amountHt: 145_000_000,
        status: BillingStatus.ISSUED,
        items: [
          { bpuCode: "F01", designation: "Forage AEP Ø150 mm", unit: "ml", cumQty: 320, prevCumQty: 200, unitPrice: 1_200_000 },
        ],
      },
      // En retard (ISSUED + dueDate dépassée)
      {
        ref: "S0004",
        siteIdx: 0,
        periodOffset: -2,
        dueInDays: -8,
        amountHt: 92_000_000,
        status: BillingStatus.ISSUED,
        items: [
          { bpuCode: "GC", designation: "Génie civil ouvrage d'art", unit: "fft", cumQty: 1, prevCumQty: 0, unitPrice: 92_000_000 },
        ],
      },
      // Partiellement payée
      {
        ref: "S0005",
        siteIdx: 1,
        periodOffset: -1,
        dueInDays: 5,
        amountHt: 58_000_000,
        status: BillingStatus.PARTIALLY_PAID,
        paidRatio: 0.55,
        items: [
          { bpuCode: "MO1", designation: "Main-d'œuvre maçonnerie", unit: "h", cumQty: 2400, prevCumQty: 1600, unitPrice: 6_000 },
          { bpuCode: "B05", designation: "Briques B27", unit: "u", cumQty: 75000, prevCumQty: 45000, unitPrice: 480 },
        ],
      },
      // Totalement encaissée
      {
        ref: "S0006",
        siteIdx: 0,
        periodOffset: -2,
        dueInDays: -25,
        amountHt: 184_500_000,
        status: BillingStatus.PAID,
        paidOffsetDays: 18,
        paidRatio: 1,
        items: [
          { bpuCode: "FND", designation: "Fondations spéciales", unit: "ml", cumQty: 280, prevCumQty: 180, unitPrice: 1_650_000 },
          { bpuCode: "GR", designation: "Grue tour mois", unit: "mois", cumQty: 5, prevCumQty: 4, unitPrice: 19_500_000 },
        ],
      },
    ];

    let billingCount = 0;
    for (const b of billingFixtures) {
      if (b.siteIdx >= sites.length) continue;
      const period = new Date();
      period.setMonth(period.getMonth() + b.periodOffset);
      const periodStr = period.toISOString().slice(0, 7);

      // Calculs OHADA Cameroun
      const amountHt = BigInt(b.amountHt);
      const vatAmount = BigInt(Math.round(b.amountHt * 0.1925));
      const amountTtc = amountHt + vatAmount;
      const guarantee = BigInt(Math.round(b.amountHt * 0.05));
      const sourceWh = BigInt(Math.round(b.amountHt * 0.022));
      const netToReceive = amountTtc - guarantee - sourceWh;
      const paidAmount =
        b.paidRatio !== undefined ? BigInt(Math.round(Number(netToReceive) * b.paidRatio)) : null;

      await prisma.progressBilling.create({
        data: {
          tenantId,
          siteId: sites[b.siteIdx].id,
          billingNumber: `${b.ref}-${periodStr}`,
          period: periodStr,
          amountHt,
          vatAmount,
          amountTtc,
          guaranteeRetention: guarantee,
          sourceWithholding: sourceWh,
          netToReceive,
          dueDate: daysAhead(b.dueInDays),
          items: b.items.map((it) => ({
            ...it,
            periodQty: it.cumQty - it.prevCumQty,
            total: (it.cumQty - it.prevCumQty) * it.unitPrice,
          })) as unknown as object[],
          status: b.status,
          paidAmount,
          paidAt: b.paidOffsetDays !== undefined ? daysAgo(b.paidOffsetDays) : null,
        },
      });
      billingCount++;
    }
    console.log(`  ✓ ${billingCount} situations de travaux démo créées (tous statuts)`);

    // Cashbox movement
    if (sites[0]) {
      const cashbox = await prisma.siteCashbox.findUnique({ where: { siteId: sites[0].id } });
      if (cashbox) {
        await prisma.cashboxMovement.create({
          data: {
            cashboxId: cashbox.id,
            direction: CashDirection.OUT,
            amount: BigInt(50_000),
            reason: "Achat consommables chantier",
            occurredAt: new Date(),
            recordedById: accountantUser.id,
          },
        });
        console.log(`  ✓ Mouvement caisse démo`);
      }
    }
  }

  console.log("✅ Seed Comptable terminé");
}

function today() {
  return new Date().toISOString();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
