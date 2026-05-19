import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const tenants = await p.tenant.findMany({ select: { id: true, slug: true } });
  for (const t of tenants) {
    const n = await p.site.count({ where: { tenantId: t.id } });
    console.log(`  ${t.slug} (${t.id.slice(-8)}): ${n} sites`);
  }
  await p.$disconnect();
})();
