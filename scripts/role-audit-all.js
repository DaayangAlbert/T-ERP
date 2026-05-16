// Audit complet : toutes les colonnes Role dans la DB.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  console.log("=== User.role ===");
  for (const r of await prisma.user.groupBy({ by: ["role"], _count: { _all: true } })) {
    console.log(`${r.role.padEnd(20)} ${r._count._all}`);
  }
  console.log("\n=== CustomRole.basedOn ===");
  for (const r of await prisma.customRole.groupBy({ by: ["basedOn"], _count: { _all: true } })) {
    console.log(`${r.basedOn.padEnd(20)} ${r._count._all}`);
  }
  console.log("\n=== Delegation.fromRole / toRole ===");
  for (const r of await prisma.delegation.groupBy({ by: ["fromRole"], _count: { _all: true } })) {
    console.log(`from ${r.fromRole.padEnd(20)} ${r._count._all}`);
  }
  for (const r of await prisma.delegation.groupBy({ by: ["toRole"], _count: { _all: true } })) {
    console.log(`to   ${r.toRole.padEnd(20)} ${r._count._all}`);
  }
  console.log("\n=== ValidationStep.validatorRoles (array) ===");
  const steps = await prisma.validationStep.findMany({ select: { validatorRoles: true } });
  const counts = new Map();
  for (const s of steps) for (const r of s.validatorRoles) counts.set(r, (counts.get(r) ?? 0) + 1);
  for (const [k, v] of [...counts.entries()].sort()) console.log(`${k.padEnd(20)} ${v}`);
  await prisma.$disconnect();
})();
