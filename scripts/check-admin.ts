import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const p = new PrismaClient();

(async () => {
  const admins = await p.platformAdmin.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      status: true,
      mfaEnabled: true,
      mfaSecret: true,
      passwordHash: true,
    },
  });
  console.log("Total PlatformAdmin:", admins.length);
  for (const a of admins) {
    const ok = await bcrypt.compare("Admin2026!", a.passwordHash);
    console.log(
      `  - ${a.email} · ${a.status} · MFA=${a.mfaEnabled} · secret=${a.mfaSecret ?? "null"} · pwd_match=${ok}`,
    );
  }
  await p.$disconnect();
})();
