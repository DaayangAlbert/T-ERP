import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const us = await p.user.findMany({
    where: {
      tenantId: { not: null },
      OR: [{ phone: { not: null } }, { phoneMobile: { not: null } }],
    },
    select: { email: true, phone: true, phoneMobile: true },
    take: 8,
  });
  console.log(`Total ${us.length} users with phone :`);
  for (const u of us) {
    console.log(`  ${u.email} · phone=${u.phone ?? "null"} · phoneMobile=${u.phoneMobile ?? "null"}`);
  }
  await p.$disconnect();
})();
