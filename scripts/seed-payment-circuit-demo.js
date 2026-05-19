require("./_guard-prod");
// Demo seed : crée un Circuit de paiement Mincom + applique sur un dossier
// existant + désigne comptable, notifie comptable + SG.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  // 1) Tenant Batimcam + ses users clés.
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  if (!tenant) throw new Error("Tenant batimcam introuvable");
  console.log("✓ Tenant :", tenant.name);

  const daf = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "DAF", status: "ACTIVE" },
  });
  const accountant = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "ACCOUNTANT", status: "ACTIVE" },
  });
  const sg = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: "SECRETARY_GENERAL", status: "ACTIVE" },
  });

  console.log("DAF :", daf ? `${daf.firstName} ${daf.lastName}` : "introuvable");
  console.log("Comptable :", accountant ? `${accountant.firstName} ${accountant.lastName}` : "introuvable");
  console.log("SG :", sg ? `${sg.firstName} ${sg.lastName}` : "introuvable");
  if (!daf) throw new Error("Aucun DAF actif sur batimcam — impossible de seeder");

  // 2) Trouver un dossier (Receivable) à utiliser. Privilégier un client public.
  let receivable = await prisma.receivable.findFirst({
    where: {
      tenantId: tenant.id,
      paymentTrack: null,
      OR: [
        { clientName: { contains: "Mincom", mode: "insensitive" } },
        { clientName: { contains: "Ministère", mode: "insensitive" } },
        { clientName: { contains: "Commune", mode: "insensitive" } },
        { status: "OVERDUE" },
      ],
    },
    orderBy: { daysOverdue: "desc" },
  });

  // Sinon prendre n'importe quel dossier sans track.
  if (!receivable) {
    receivable = await prisma.receivable.findFirst({
      where: { tenantId: tenant.id, paymentTrack: null },
      orderBy: { daysOverdue: "desc" },
    });
  }
  if (!receivable) throw new Error("Aucun Receivable disponible sans track");
  console.log(`✓ Dossier ciblé : ${receivable.clientName} · ${receivable.invoiceRef} (${(Number(receivable.amount) / 1_000_000).toFixed(1)} M FCFA)`);

  // 3) Créer le template "Circuit Mincom" (ou réutiliser s'il existe).
  let template = await prisma.paymentCircuitTemplate.findFirst({
    where: { tenantId: tenant.id, name: "Circuit Mincom" },
  });

  if (template) {
    console.log("✓ Template existant :", template.name);
  } else {
    template = await prisma.paymentCircuitTemplate.create({
      data: {
        tenantId: tenant.id,
        name: "Circuit Mincom",
        clientName: receivable.clientName,
        description:
          "Circuit administratif de paiement Ministère de la Communication. Compter ~45 j entre dépôt facture et virement.",
        createdById: daf.id,
        steps: {
          create: [
            {
              order: 1,
              label: "Comptable MINCOM",
              description: "Dépôt de la facture certifiée + bordereau. Vérification montant et imputation budgétaire.",
              contactName: "Mme TCHINDA Esther",
              contactRole: "Comptable principal",
              contactPhone: "+237 6 99 12 34 56",
              contactEmail: "comptabilite@mincom.cm",
              estimatedDays: 10,
            },
            {
              order: 2,
              label: "Contrôleur Financier",
              description: "Visa technique du dossier de paiement (régularité juridique + dispo budget).",
              contactName: "M. NGOH Désiré",
              contactRole: "Contrôleur Financier auprès du MINCOM",
              contactPhone: "+237 6 77 88 99 11",
              contactEmail: null,
              estimatedDays: 12,
            },
            {
              order: 3,
              label: "Payeur Spécialisé",
              description: "Édition de l'ordonnance de paiement + transmission ACCT.",
              contactName: "M. ATANGANA Roger",
              contactRole: "Payeur Spécialisé Yaoundé",
              contactPhone: "+237 6 55 44 33 22",
              contactEmail: null,
              estimatedDays: 8,
            },
            {
              order: 4,
              label: "ACCT (virement)",
              description: "Émission du virement vers BatimCAM SA (compte SGCB / BICEC).",
              contactName: "Agence Comptable Centrale du Trésor",
              contactRole: "Agence Comptable",
              contactPhone: "+237 2 22 23 40 00",
              contactEmail: null,
              estimatedDays: 15,
            },
          ],
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    console.log(`✓ Template créé : ${template.name} (${template.steps.length} étapes)`);
  }

  // 4) Appliquer le circuit au dossier — assigné au comptable.
  const tmplWithSteps = await prisma.paymentCircuitTemplate.findUnique({
    where: { id: template.id },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  const track = await prisma.paymentTrack.create({
    data: {
      receivableId: receivable.id,
      templateId: tmplWithSteps.id,
      assignedToId: accountant?.id ?? null,
      createdById: daf.id,
      steps: {
        create: tmplWithSteps.steps.map((s, idx) => ({
          templateStepId: s.id,
          order: s.order,
          label: s.label,
          status: idx === 0 ? "IN_PROGRESS" : "PENDING",
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  console.log(`✓ Track créé : ${track.id} (assigné à ${accountant ? accountant.firstName + " " + accountant.lastName : "personne"})`);

  // 5) Notifier le comptable (responsable suivi) et le SG (en copie info).
  const notifPayloads = [];
  if (accountant) {
    notifPayloads.push({
      userId: accountant.id,
      type: "payment_track_assigned",
      title: `Suivi paiement assigné · ${tmplWithSteps.name}`,
      body: `${receivable.clientName} · ${receivable.invoiceRef} · 4 étapes à suivre. Démarrer par contacter Mme TCHINDA Esther (Comptable MINCOM).`,
      link: "/direction-financiere/recouvrement",
    });
  }
  if (sg) {
    notifPayloads.push({
      userId: sg.id,
      type: "payment_track_info",
      title: `Nouveau dossier de paiement à suivre · ${receivable.clientName}`,
      body: `Circuit ${tmplWithSteps.name} appliqué à ${receivable.invoiceRef}. Suivi confié au comptable. SG en copie info (gouvernance corporate).`,
      link: "/direction-financiere/recouvrement",
    });
  }
  if (notifPayloads.length > 0) {
    await prisma.notification.createMany({ data: notifPayloads });
    console.log(`✓ ${notifPayloads.length} notification(s) envoyée(s) :`);
    for (const n of notifPayloads) {
      const u = n.userId === accountant?.id ? accountant : sg;
      console.log(`  → ${u.firstName} ${u.lastName} (${u.role})`);
    }
  }

  // 6) AuditLog
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: daf.id,
      action: "payment_circuit.applied",
      entityType: "Receivable",
      entityId: receivable.id,
      metadata: {
        trackId: track.id,
        templateId: tmplWithSteps.id,
        templateName: tmplWithSteps.name,
        assignedToId: accountant?.id ?? null,
        notifiedSgId: sg?.id ?? null,
        seedSource: "demo-script",
      },
    },
  });
  console.log("✓ AuditLog créé");

  console.log("\n🎉 Demo prête. Connecte-toi en tant que Marie NGONO (DAF) et va sur Recouvrement.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
