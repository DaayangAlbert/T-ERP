import { cookies } from "next/headers";
import { signAdminJwt, type AdminJwtPayload } from "@/lib/admin-auth";

export const ADMIN_COOKIE = "terp_admin_access";

const ACCESS_TTL = process.env.ADMIN_JWT_TTL ?? "30m";

function parseTtlToSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 1800;
  const n = parseInt(m[1], 10);
  const mul = { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as "s" | "m" | "h" | "d"];
  return n * mul;
}

export function setAdminCookie(
  identity: Pick<AdminJwtPayload, "sub" | "email" | "role">,
) {
  const access = signAdminJwt(identity);
  cookies().set(ADMIN_COOKIE, access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: parseTtlToSeconds(ACCESS_TTL),
  });
}

export function clearAdminCookie() {
  cookies().delete(ADMIN_COOKIE);
}

export function getAdminCookie(): string | null {
  return cookies().get(ADMIN_COOKIE)?.value ?? null;
}
