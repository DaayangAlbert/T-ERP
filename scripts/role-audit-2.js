const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  console.log("=== RolePromotionRequest ===");
  const promos = await prisma.rolePromotionRequest.findMany({
    select: { fromRole: true, toRole: true, validatorRoles: true },
  });
  console.log("count:", promos.length);
  for (const p of promos) console.log(p);
  console.log("\n=== ValidationStep ===");
  const steps = await prisma.validationStep.findMany({ select: { validatorRoles: true } });
  const counts = new Map();
  for (const s of steps) for (const r of s.validatorRoles) counts.set(r, (counts.get(r) ?? 0) + 1);
  for (const [k, v] of [...counts.entries()].sort()) console.log(`${k.padEnd(20)} ${v}`);
  await prisma.$disconnect();
})();
