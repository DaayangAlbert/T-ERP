/**
 * Stats DB pour comparer local vs prod.
 *
 * Usage :
 *   npx tsx scripts/db-stats.ts            # local (lit .env)
 *   npx tsx scripts/db-stats.ts            # prod (lit .env qui symlinke .env.production)
 *
 * Affiche :
 *  - Nombre de tenants par status
 *  - Nombre de users par rôle
 *  - Nombre de PlatformAdmins
 *  - Plans actifs + abonnements
 *  - Top 5 tenants par nombre d'users
 *  - 5 dernières créations (audit fraîcheur)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // === TENANTS ===
  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true, name: true, status: true, isDemoTenant: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const tenantsByStatus: Record<string, number> = {};
  for (const t of tenants) tenantsByStatus[t.status] = (tenantsByStatus[t.status] ?? 0) + 1;

  // === USERS (tenant users) ===
  const userTotal = await prisma.user.count();
  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  // === PLATFORM ADMINS ===
  const platformAdmins = await prisma.platformAdmin.findMany({
    select: { email: true, firstName: true, lastName: true, role: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  // === PLANS + SUBSCRIPTIONS ===
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    select: { code: true, name: true, monthlyPriceXAF: true },
    orderBy: { orderIndex: "asc" },
  });
  const subscriptions = await prisma.subscription.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // === TOP 5 TENANTS par users ===
  const topUsersAgg = await prisma.user.groupBy({
    by: ["tenantId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });
  const topTenantIds = topUsersAgg.map((u) => u.tenantId).filter((id): id is string => id !== null);
  const topTenantNames = await prisma.tenant.findMany({
    where: { id: { in: topTenantIds } },
    select: { id: true, name: true, slug: true },
  });

  // === DERNIERS USERS ===
  const recentUsers = await prisma.user.findMany({
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      tenant: { select: { slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // === OUTPUT ===
  const reportLines: string[] = [];
  reportLines.push("═══════════════════════════════════════════════════════");
  reportLines.push("  STATS DB T-ERP — " + new Date().toISOString());
  reportLines.push("═══════════════════════════════════════════════════════");
  reportLines.push("");
  reportLines.push(`TENANTS : ${tenants.length} total`);
  for (const [status, count] of Object.entries(tenantsByStatus)) {
    reportLines.push(`  - ${status} : ${count}`);
  }
  reportLines.push(`  Liste détaillée :`);
  for (const t of tenants) {
    reportLines.push(`    · ${t.slug.padEnd(20)} ${t.name.padEnd(45)} [${t.status}${t.isDemoTenant ? " · DEMO" : ""}]`);
  }
  reportLines.push("");
  reportLines.push(`USERS (tous tenants) : ${userTotal} total`);
  reportLines.push(`  Par rôle :`);
  for (const u of usersByRole) {
    reportLines.push(`    · ${u.role.padEnd(20)} : ${u._count.id}`);
  }
  reportLines.push(`  Top 5 tenants par users :`);
  for (const u of topUsersAgg) {
    const t = topTenantNames.find((t) => t.id === u.tenantId);
    reportLines.push(`    · ${(t?.slug ?? "no-tenant").padEnd(20)} ${(t?.name ?? "?").padEnd(45)} : ${u._count.id}`);
  }
  reportLines.push("");
  reportLines.push(`PLATFORM ADMINS : ${platformAdmins.length} total`);
  for (const a of platformAdmins) {
    reportLines.push(`  · ${a.email.padEnd(35)} ${a.firstName} ${a.lastName} [${a.role} · ${a.status}]`);
  }
  reportLines.push("");
  reportLines.push(`PLANS ACTIFS : ${plans.length}`);
  for (const p of plans) {
    reportLines.push(`  · ${p.code.padEnd(15)} ${p.name.padEnd(15)} ${Number(p.monthlyPriceXAF).toLocaleString()} XAF/mois`);
  }
  reportLines.push(`SUBSCRIPTIONS :`);
  for (const s of subscriptions) {
    reportLines.push(`  · ${s.status} : ${s._count.id}`);
  }
  reportLines.push("");
  reportLines.push(`5 DERNIERS USERS CRÉÉS :`);
  for (const u of recentUsers) {
    const date = u.createdAt.toISOString().slice(0, 16);
    reportLines.push(`  · ${date}  ${u.email.padEnd(35)} ${u.role.padEnd(15)} @ ${u.tenant?.slug ?? "no-tenant"}`);
  }
  reportLines.push("");
  reportLines.push("═══════════════════════════════════════════════════════");

  console.log(reportLines.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
