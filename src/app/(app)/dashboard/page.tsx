import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import LogoutButton from "./LogoutButton";

export default async function DashboardPlaceholder() {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      firstName: true,
      lastName: true,
      role: true,
      email: true,
      tenant: { select: { name: true, slug: true } },
    },
  });

  if (!user) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 inline-block rounded-full border border-primary-300 bg-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-700">
        ✓ Authentification J1 OK
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Bonjour {user.firstName} {user.lastName}
      </h1>
      <p className="mt-2 text-base text-ink-2">
        Connecté en tant que <span className="font-mono text-ink">{user.role}</span>
        {user.tenant && <> chez <span className="font-semibold">{user.tenant.name}</span> ({user.tenant.slug})</>}
        {!user.tenant && <> · candidat externe</>}.
      </p>
      <p className="mt-4 max-w-md text-sm text-ink-3">
        Le tableau de bord complet (KPIs, graphes, validations) est livré en J2.
      </p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
