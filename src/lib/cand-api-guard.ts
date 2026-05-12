import { NextResponse } from "next/server";
import { isCandidateSession, type TerpJwtPayload } from "@/lib/auth";
import { getCurrentSession } from "@/lib/session";

export type GuardResult =
  | { ok: true; session: TerpJwtPayload }
  | { ok: false; response: NextResponse };

export function guardCandidateApi(): GuardResult {
  const session = getCurrentSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  if (!isCandidateSession(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Interdit" }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
