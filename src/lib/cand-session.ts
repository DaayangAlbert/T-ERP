import { redirect } from "next/navigation";
import { isCandidateSession, type TerpJwtPayload } from "@/lib/auth";
import { getCurrentSession } from "@/lib/session";

export function getCandidateSession(): TerpJwtPayload | null {
  const session = getCurrentSession();
  if (!session) return null;
  return isCandidateSession(session) ? session : null;
}

export function requireCandidateSession(): TerpJwtPayload {
  const session = getCandidateSession();
  if (!session) redirect("/cand/login");
  return session;
}

export function assertCandidateOwnsResource(
  session: TerpJwtPayload,
  ownerUserId: string,
): void {
  if (session.sub !== ownerUserId) {
    const err = new Error("FORBIDDEN_CANDIDATE_ACCESS");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}
