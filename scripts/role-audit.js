// Audit rôles dans la base avant migration enum.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
    orderBy: { role: "asc" },
  });
  for (const r of rows) {
    console.log(`${r.role.padEnd(20)} ${r._count._all}`);
  }
  await prisma.$disconnect();
})();
