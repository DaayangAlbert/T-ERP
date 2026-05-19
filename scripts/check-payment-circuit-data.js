// Vérifie que toutes les données du workflow circuit de paiement
// sont bien persistées et cohérentes entre les profils.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "batimcam" } });
  console.log(`\n═══ Tenant : ${tenant.name} ═══\n`);

  // 1) Templates
  console.log("📁 TEMPLATES de circuits :");
  const templates = await prisma.paymentCircuitTemplate.findMany({
    where: { tenantId: tenant.id },
    include: {
      steps: { orderBy: { order: "asc" } },
      createdBy: { select: { firstName: true, lastName: true, role: true } },
      _count: { select: { tracks: true } },
    },
  });
  for (const t of templates) {
    console.log(`  ✓ "${t.name}" — ${t.clientName}`);
    console.log(`    Créé par : ${t.createdBy.firstName} ${t.createdBy.lastName} (${t.createdBy.role})`);
    console.log(`    ${t.steps.length} étapes, ${t._count.tracks} dossier(s) en cours${t.archivedAt ? ", ARCHIVÉ" : ""}`);
    for (const s of t.steps) {
      console.log(`      ${s.order}. ${s.label}`);
      if (s.contactName) {
        console.log(`         → ${s.contactName} (${s.contactRole}) · ${s.contactPhone ?? "—"}`);
      }
      if (s.estimatedDays) console.log(`         ETA : ${s.estimatedDays} j`);
    }
  }

  // 2) Tracks
  console.log("\n🛤️  TRACKS (instances) :");
  const tracks = await prisma.paymentTrack.findMany({
    where: { receivable: { tenantId: tenant.id } },
    include: {
      template: { select: { name: true } },
      receivable: { select: { invoiceRef: true, clientName: true, amount: true } },
      assignedTo: { select: { firstName: true, lastName: true, role: true, email: true } },
      createdBy: { select: { firstName: true, lastName: true, role: true } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          validatedBy: { select: { firstName: true, lastName: true } },
          blockedBy: { select: { firstName: true, lastName: true } },
          documents: true,
        },
      },
    },
  });

  for (const t of tracks) {
    console.log(`\n  🗂️  Track ${t.id}`);
    console.log(`     Dossier : ${t.receivable.clientName} · ${t.receivable.invoiceRef}`);
    console.log(`     Template : ${t.template.name}`);
    console.log(`     Créé par : ${t.createdBy.firstName} ${t.createdBy.lastName} (${t.createdBy.role})`);
    console.log(`     Assigné à : ${t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName} (${t.assignedTo.role}, ${t.assignedTo.email})` : "—"}`);
    console.log(`     Démarré : ${t.startedAt.toISOString()}, terminé : ${t.completedAt?.toISOString() ?? "non"}`);
    console.log(`     Étapes :`);
    for (const s of t.steps) {
      const statusLabels = { PENDING: "⏳", IN_PROGRESS: "▶️", VALIDATED: "✅", BLOCKED: "🚫" };
      console.log(`       ${statusLabels[s.status]} #${s.order} ${s.label} [${s.status}]`);
      if (s.validatedAt) {
        console.log(`          Validée le ${s.validatedAt.toISOString()} par ${s.validatedBy?.firstName} ${s.validatedBy?.lastName}`);
      }
      if (s.status === "BLOCKED") {
        console.log(`          🚫 Bloquée depuis ${s.blockedSince?.toISOString()}`);
        console.log(`          Par : ${s.blockedBy?.firstName} ${s.blockedBy?.lastName}`);
        console.log(`          Motif : ${s.blockedReason}`);
        if (s.documents.length > 0) {
          console.log(`          Documents demandés (${s.documents.length}) :`);
          for (const d of s.documents) {
            console.log(`            ${d.provided ? "✓" : "□"} ${d.label}${d.providedAt ? ` (fourni le ${d.providedAt.toISOString()})` : ""}`);
          }
        }
      }
    }
  }

  // 3) Notifications liées au workflow paiement
  console.log("\n\n🔔 NOTIFICATIONS (payment_track_*) :");
  const notifs = await prisma.notification.findMany({
    where: {
      type: { startsWith: "payment_" },
      user: { tenantId: tenant.id },
    },
    include: { user: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
  for (const n of notifs) {
    console.log(`  ${n.read ? "[lue] " : "[NON LUE] "}${n.user.firstName} ${n.user.lastName} (${n.user.role})`);
    console.log(`    ${n.type} · ${n.title}`);
    console.log(`    ${n.body}`);
    console.log(`    Créée : ${n.createdAt.toISOString()}\n`);
  }

  // 4) AuditLog
  console.log("📋 AUDIT LOG (actions payment_circuit + payment_step) :");
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: tenant.id,
      action: { in: ["payment_circuit.applied", "payment_step.validated", "payment_step.blocked", "payment_step.unblocked"] },
    },
    include: { user: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  for (const l of logs) {
    console.log(`  ${l.createdAt.toISOString()} · ${l.action}`);
    console.log(`    Par : ${l.user.firstName} ${l.user.lastName} (${l.user.role})`);
    console.log(`    Metadata : ${JSON.stringify(l.metadata)}`);
  }

  // 5) Test de visibilité par profil — simule l'appel /api/me/payment-tracks pour chaque user assigné
  console.log("\n\n👥 VISIBILITÉ par profil (assignés actuels) :");
  const assignedUsers = await prisma.user.findMany({
    where: { paymentTracksAssigned: { some: { receivable: { tenantId: tenant.id } } } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  for (const u of assignedUsers) {
    const myTracks = await prisma.paymentTrack.findMany({
      where: { assignedToId: u.id, completedAt: null },
      include: { receivable: { select: { invoiceRef: true, clientName: true } } },
    });
    console.log(`  ${u.firstName} ${u.lastName} (${u.role}) — ${myTracks.length} track(s) actif(s) :`);
    for (const t of myTracks) {
      console.log(`    • ${t.receivable.clientName} · ${t.receivable.invoiceRef}`);
    }
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
