import { verifyJwt, type TerpJwtPayload } from "@/lib/auth";
import { getAccessCookie } from "@/lib/cookies";

export function getCurrentSession(): TerpJwtPayload | null {
  const token = getAccessCookie();
  if (!token) return null;
  try {
    return verifyJwt(token);
  } catch {
    return null;
  }
}
