require("./_guard-prod");
// Seed financier Mai 2026 — pour tester l'auto-fill DAF du rapport mensuel.
// Ajoute :
//   • 6 ProgressBilling (CA produit) sur 6 chantiers des 3 filiales
//   • 8 SupplierInvoice (charges fournisseurs)
//   • 2 FixedAsset acquis en Mai (CAPEX)
//   • 44 Payslip Mai 2026 (réplique de Mars 2026)
//   • 1 rapport DAF Mai 2026 vierge pour Marie
//
// Une fois lancé, Marie ouvre le rapport Mai 2026 → "Pré-remplir depuis la DB"
// → tous les KPIs apparaissent.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const VAT_RATE = 0.1925;
const today = new Date();

function ttc(htBigInt) {
  return BigInt(Math.round(Number(htBigInt) * (1 + VAT_RATE)));
}
function vat(htBigInt) {
  return BigInt(Math.round(Number(htBigInt) * VAT_RATE));
}

async function getScopeTenants() {
  const holding = await prisma.tenant.findFirst({
    where: { slug: "batimcam" },
    include: { children: { select: { id: true, slug: true } } },
  });
  if (!holding) throw new Error("Tenant batimcam introuvable");
  return { holding, filiales: holding.children };
}

async function seedProgressBillings(filiales) {
  console.log("\n=== Seed ProgressBilling Mai 2026 ===");
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: filiales.map((f) => f.id) }, status: "ACTIVE" },
    select: { id: true, tenantId: true, code: true, name: true },
    take: 6,
    orderBy: { code: "asc" },
  });

  // 6 facturations clients réalistes pour Mai
  const SAMPLES = [
    { amountHt: 185_000_000n, retentionRate: 0.05, withholdingRate: 0.022, status: "ISSUED" },
    { amountHt: 92_500_000n, retentionRate: 0.05, withholdingRate: 0.022, status: "ISSUED" },
    { amountHt: 142_000_000n, retentionRate: 0.05, withholdingRate: 0.022, status: "PAID" },
    { amountHt: 78_000_000n, retentionRate: 0.05, withholdingRate: 0.022, status: "VALIDATED" },
    { amountHt: 215_000_000n, retentionRate: 0.05, withholdingRate: 0.022, status: "ISSUED" },
    { amountHt: 56_500_000n, retentionRate: 0.05, withholdingRate: 0.022, status: "ISSUED" },
  ];

  let created = 0;
  for (let i = 0; i < Math.min(SAMPLES.length, sites.length); i++) {
    const s = sites[i];
    const sample = SAMPLES[i];
    const billingNumber = `S${String(i + 100).padStart(4, "0")}-2026-05`;

    const exists = await prisma.progressBilling.findFirst({
      where: { billingNumber },
      select: { id: true },
    });
    if (exists) {
      console.log(`  • ${billingNumber} déjà existant, skip`);
      continue;
    }

    const amountHt = sample.amountHt;
    const vatAmount = vat(amountHt);
    const amountTtc = ttc(amountHt);
    const guaranteeRetention = BigInt(Math.round(Number(amountTtc) * sample.retentionRate));
    const sourceWithholding = BigInt(Math.round(Number(amountTtc) * sample.withholdingRate));
    const netToReceive = amountTtc - guaranteeRetention - sourceWithholding;

    await prisma.progressBilling.create({
      data: {
        tenantId: s.tenantId,
        siteId: s.id,
        billingNumber,
        period: "2026-05",
        amountHt,
        vatAmount,
        amountTtc,
        guaranteeRetention,
        sourceWithholding,
        netToReceive,
        dueDate: new Date(Date.UTC(2026, 5, 30)), // 30 juin = 30j après émission
        status: sample.status,
        items: [
          { bpuCode: "001", designation: `Travaux ${s.name}`, unit: "FCFA", periodQty: 1, prevCumQty: 0, cumQty: 1, unitPrice: Number(amountHt), total: Number(amountHt) },
        ],
        ...(sample.status === "PAID" ? { paidAt: new Date(Date.UTC(2026, 5, 20)), paidAmount: netToReceive } : {}),
      },
    });
    console.log(`  ✓ ${billingNumber} sur ${s.code} : ${(Number(amountHt) / 1_000_000).toFixed(1)} M HT (${sample.status})`);
    created++;
  }
  console.log(`  → ${created} ProgressBilling créés`);
}

async function seedSupplierInvoices(scopeIds) {
  console.log("\n=== Seed SupplierInvoice Mai 2026 ===");
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: { in: scopeIds } },
    select: { id: true, tenantId: true, name: true },
    take: 8,
  });

  if (suppliers.length === 0) {
    console.log("  ⚠️ Aucun supplier sur les filiales — création depuis la holding non implémentée");
    return;
  }

  const SAMPLES = [
    { amountHt: 45_000_000n, status: "ACCOUNTED", label: "CIMENCAM — Ciment 600 tonnes" },
    { amountHt: 28_500_000n, status: "PENDING_PAYMENT", label: "METALCAM — Acier construction" },
    { amountHt: 18_750_000n, status: "PAID", label: "Total Cameroun — Carburant flotte mai" },
    { amountHt: 12_400_000n, status: "RECEIVED", label: "Caterpillar — Pièces détachées" },
    { amountHt: 35_200_000n, status: "ACCOUNTED", label: "TRADEX — Goudron bitumineux" },
    { amountHt: 8_900_000n, status: "PENDING_PAYMENT", label: "CFAO Motors — Entretien véhicules" },
    { amountHt: 22_100_000n, status: "PAID", label: "SOCATAM — Sous-traitance ferraillage" },
    { amountHt: 6_500_000n, status: "RECEIVED", label: "Tractafric — Location engin" },
  ];

  let created = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    const sup = suppliers[i % suppliers.length];
    const sample = SAMPLES[i];
    const invoiceNumber = `FA-2026-${String(100 + i).padStart(4, "0")}`;

    const exists = await prisma.supplierInvoice.findFirst({
      where: { invoiceNumber },
      select: { id: true },
    });
    if (exists) {
      console.log(`  • ${invoiceNumber} déjà existant, skip`);
      continue;
    }

    const amountHt = sample.amountHt;
    const vatAmount = vat(amountHt);
    const amountTtc = ttc(amountHt);
    const invoiceDate = new Date(Date.UTC(2026, 4, 5 + (i * 3)));
    const dueDate = new Date(Date.UTC(2026, 5, 5 + (i * 3))); // 30j après

    await prisma.supplierInvoice.create({
      data: {
        tenantId: sup.tenantId,
        supplierId: sup.id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        amountHt,
        vatAmount,
        amountTtc,
        status: sample.status,
        ...(sample.status === "PAID" ? { paidAt: new Date(Date.UTC(2026, 4, 20 + i)) } : {}),
        ...(sample.status === "ACCOUNTED" || sample.status === "PAID" ? { accountedAt: new Date(Date.UTC(2026, 4, 10 + i)) } : {}),
      },
    });
    console.log(`  ✓ ${invoiceNumber} ${sup.name} : ${(Number(amountHt) / 1_000_000).toFixed(1)} M HT (${sample.status})`);
    created++;
  }
  console.log(`  → ${created} SupplierInvoice créées`);
}

async function seedFixedAssetsCapex(filiales) {
  console.log("\n=== Seed FixedAsset (CAPEX Mai 2026) ===");

  const SAMPLES = [
    { code: "IMMO-2026-005", description: "Pelle Komatsu PC200 (acquisition Olembé)", grossValue: 78_000_000n, category: "EQUIPMENT", usefulLifeMonths: 84 },
    { code: "IMMO-2026-006", description: "Camion benne Hino 6×4", grossValue: 52_000_000n, category: "VEHICLE", usefulLifeMonths: 60 },
  ];

  let created = 0;
  for (const sample of SAMPLES) {
    const exists = await prisma.fixedAsset.findFirst({ where: { code: sample.code }, select: { id: true } });
    if (exists) {
      console.log(`  • ${sample.code} déjà existant, skip`);
      continue;
    }
    await prisma.fixedAsset.create({
      data: {
        tenantId: filiales[0].id, // Douala
        code: sample.code,
        description: sample.description,
        category: sample.category,
        acquisitionDate: new Date(Date.UTC(2026, 4, 10)),
        grossValue: sample.grossValue,
        accumulatedDepreciation: 0n,
        netValue: sample.grossValue,
        usefulLifeMonths: sample.usefulLifeMonths,
        condition: "EXCELLENT",
      },
    });
    console.log(`  ✓ ${sample.code} : ${(Number(sample.grossValue) / 1_000_000).toFixed(1)} M`);
    created++;
  }
  console.log(`  → ${created} FixedAsset créés`);
}

async function seedPayslipsMay(scopeIds) {
  console.log("\n=== Seed Payslip Mai 2026 (réplique Mars) ===");

  // On clone les payslips de Mars 2026 vers Mai 2026 (44 employés)
  const marsPayslips = await prisma.payslip.findMany({
    where: {
      tenantId: { in: scopeIds },
      period: { gte: new Date(Date.UTC(2026, 2, 1)), lt: new Date(Date.UTC(2026, 3, 1)) },
    },
  });

  if (marsPayslips.length === 0) {
    console.log("  ⚠️ Aucun Payslip Mars trouvé — impossible de cloner");
    return;
  }

  const existsMay = await prisma.payslip.count({
    where: {
      tenantId: { in: scopeIds },
      period: { gte: new Date(Date.UTC(2026, 4, 1)), lt: new Date(Date.UTC(2026, 5, 1)) },
    },
  });
  if (existsMay > 0) {
    console.log(`  • ${existsMay} Payslip Mai déjà existants, skip`);
    return;
  }

  let created = 0;
  for (const ps of marsPayslips) {
    // Évite la collision unique (probablement userId+period)
    const periodMay = new Date(Date.UTC(2026, 4, 31, ps.period.getUTCHours(), ps.period.getUTCMinutes()));
    const periodEndMay = new Date(Date.UTC(2026, 4, 31, 23, 59, 59));

    // Strip id + dates auto + uniques pour insert
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, bulletinNumber, verificationUuid, verificationCode, verificationHash, verifiedPublicUrl, snapshotId, replacedById, ...rest } = ps;
    await prisma.payslip.create({
      data: {
        ...rest,
        period: periodMay,
        periodEnd: periodEndMay,
        periodLabel: "2026-05",
        paymentDate: new Date(Date.UTC(2026, 5, 5)),
        status: "PAID",
        paidAt: new Date(Date.UTC(2026, 5, 5)),
      },
    });
    created++;
  }
  console.log(`  ✓ ${created} Payslip Mai créés (clone de Mars)`);
}

async function seedDafReportMay(holding, marie) {
  console.log("\n=== Seed DafMonthlyFinancialReport Mai 2026 (vierge) ===");
  const exists = await prisma.dafMonthlyFinancialReport.findFirst({
    where: { tenantId: holding.id, period: new Date(Date.UTC(2026, 4, 1)) },
    select: { id: true, periodLabel: true },
  });
  if (exists) {
    console.log(`  • ${exists.periodLabel ?? "Mai 2026"} déjà existant (${exists.id}), skip`);
    return exists;
  }
  const r = await prisma.dafMonthlyFinancialReport.create({
    data: {
      tenantId: holding.id,
      authorId: marie.id,
      period: new Date(Date.UTC(2026, 4, 1)),
      periodLabel: "Mai 2026",
      status: "DRAFT",
    },
    select: { id: true, periodLabel: true },
  });
  console.log(`  ✓ Rapport DAF ${r.periodLabel} créé (${r.id}) — vide, prêt pour le bouton "Pré-remplir"`);
  return r;
}

async function main() {
  const { holding, filiales } = await getScopeTenants();
  console.log(`Holding : ${holding.slug} (${holding.id})`);
  console.log(`Filiales : ${filiales.map((f) => f.slug).join(", ")}`);

  const marie = await prisma.user.findFirst({
    where: { tenantId: holding.id, email: "marie@batimcam.cm" },
  });
  if (!marie) throw new Error("Marie NGONO introuvable");

  const scopeIds = [holding.id, ...filiales.map((f) => f.id)];
  await seedProgressBillings(filiales);
  await seedSupplierInvoices(scopeIds);
  await seedFixedAssetsCapex(filiales);
  await seedPayslipsMay(scopeIds);
  const report = await seedDafReportMay(holding, marie);

  console.log("\n=== Récap pour test ===");
  console.log("Marie peut maintenant ouvrir le rapport :");
  console.log(`  /batimcam/direction-financiere/rapports-mensuels/${report?.id ?? "<id>"}`);
  console.log("  → cliquer 'Pré-remplir depuis la DB'");
  console.log("  → tous les KPIs doivent se remplir automatiquement");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
