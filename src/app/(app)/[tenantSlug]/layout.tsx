import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isCandidateSession } from "@/lib/auth";
import { getCurrentSession } from "@/lib/session";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";

// Le layout lit cookies + Prisma — doit être dynamique. Sinon Next.js peut
// rendre statiquement et appeler getCurrentSession() sans contexte requête,
// ce qui renvoie null et redirige vers "/" (faux négatif d'auth).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantSlug: string };
}) {
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

  // Le slug dans l'URL doit correspondre au tenant de l'utilisateur connecté.
  // Si mismatch : SUPER_ADMIN n'a pas de tenant → 404, autres → redirect vers leur slug.
  if (!user.tenant) {
    if (user.role === "SUPER_ADMIN") redirect("/admin");
    notFound();
  }
  if (user.tenant.slug !== params.tenantSlug) {
    redirect(`/${user.tenant.slug}/dashboard`);
  }

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
