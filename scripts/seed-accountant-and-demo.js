// Crée un comptable BatimCAM s'il n'existe pas + (re)lance la demo
// circuit de paiement.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();
const PWD = "Demo2026!";

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");

  // 1) Créer comptable si absent.
  let accountant = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "ACCOUNTANT", status: "ACTIVE" },
  });

  if (!accountant) {
    const passwordHash = await bcrypt.hash(PWD, 12);
    accountant = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "paul.kamga@batimcam.cm",
        firstName: "Paul",
        lastName: "KAMGA",
        role: "ACCOUNTANT",
        position: "Comptable Principal",
        category: "Cadre 10",
        employeeId: "EMP-2022-00118",
        hireDate: new Date("2022-03-14"),
        passwordHash,
        status: "ACTIVE",
      },
    });
    console.log(`✓ Comptable créé : ${accountant.firstName} ${accountant.lastName} (${accountant.email})`);
  } else {
    console.log(`✓ Comptable existant : ${accountant.firstName} ${accountant.lastName}`);
  }

  // 2) Reset éventuel du track existant pour rejouer proprement.
  const existingTrack = await prisma.paymentTrack.findFirst({
    where: { receivable: { tenantId: tenant.id }, template: { name: "Circuit Mincom" } },
  });
  if (existingTrack) {
    await prisma.paymentTrack.delete({ where: { id: existingTrack.id } });
    console.log(`↻ Track existant supprimé (rejeu propre)`);
  }

  // 3) Récupérer DAF + SG + template + dossier.
  const daf = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DAF", status: "ACTIVE" },
  });
  const sg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "SECRETARY_GENERAL", status: "ACTIVE" },
  });
  const template = await prisma.paymentCircuitTemplate.findFirst({
    where: { tenantId: tenant.id, name: "Circuit Mincom" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!template) throw new Error("Template 'Circuit Mincom' introuvable — lancer d'abord seed-payment-circuit-demo.js");

  const receivable = await prisma.receivable.findFirst({
    where: { tenantId: tenant.id, paymentTrack: null, status: "OVERDUE" },
    orderBy: { daysOverdue: "desc" },
  }) ?? await prisma.receivable.findFirst({
    where: { tenantId: tenant.id, paymentTrack: null },
    orderBy: { daysOverdue: "desc" },
  });
  if (!receivable) throw new Error("Aucun receivable sans track disponible");

  // 4) Créer track assigné au comptable.
  const track = await prisma.paymentTrack.create({
    data: {
      receivableId: receivable.id,
      templateId: template.id,
      assignedToId: accountant.id,
      createdById: daf.id,
      steps: {
        create: template.steps.map((s, idx) => ({
          templateStepId: s.id,
          order: s.order,
          label: s.label,
          status: idx === 0 ? "IN_PROGRESS" : "PENDING",
        })),
      },
    },
  });
  console.log(`✓ Track créé : ${track.id}`);
  console.log(`  ↳ Dossier : ${receivable.clientName} · ${receivable.invoiceRef}`);
  console.log(`  ↳ Suivi assigné à : ${accountant.firstName} ${accountant.lastName}`);

  // 5) Notifications comptable (suivi) + SG (info gouvernance).
  await prisma.notification.createMany({
    data: [
      {
        userId: accountant.id,
        type: "payment_track_assigned",
        title: `Suivi paiement assigné · ${template.name}`,
        body: `${receivable.clientName} · ${receivable.invoiceRef} · 4 étapes. Démarrer par Mme TCHINDA Esther (Comptable MINCOM).`,
        link: "/direction-financiere/recouvrement",
      },
      {
        userId: sg.id,
        type: "payment_track_info",
        title: `Nouveau dossier de paiement à suivre · ${receivable.clientName}`,
        body: `Circuit ${template.name} appliqué à ${receivable.invoiceRef}. Suivi confié à Paul KAMGA. SG en copie info.`,
        link: "/direction-financiere/recouvrement",
      },
    ],
  });
  console.log(`✓ 2 notifications envoyées :`);
  console.log(`  → ${accountant.firstName} ${accountant.lastName} (responsable suivi)`);
  console.log(`  → ${sg.firstName} ${sg.lastName} (en copie SG)`);

  console.log(`\n🎉 Demo prête. Connecte-toi en DAF (marie@batimcam.cm) sur /direction-financiere/recouvrement.`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
