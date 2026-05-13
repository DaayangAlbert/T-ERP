import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isCandidateSession } from "@/lib/auth";
import { getCurrentSession } from "@/lib/session";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  if (isCandidateSession(session)) redirect("/cand/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      tenant: {
        select: { id: true, slug: true, name: true, primaryColor: true, logoUrl: true },
      },
    },
  });

  if (!user) redirect("/");

  return (
    <AuthenticatedShell
      user={{
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }}
      tenant={user.tenant}
    >
      {children}
    </AuthenticatedShell>
  );
}
