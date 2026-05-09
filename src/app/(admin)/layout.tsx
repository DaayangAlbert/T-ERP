import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, firstName: true, lastName: true, email: true },
  });
  if (!user || user.role !== Role.SUPER_ADMIN) redirect("/");

  return (
    <div className="min-h-screen text-white" style={{ background: "#0F172A" }}>
      <header
        className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-6"
        style={{ background: "#0B1322", borderColor: "#1E293B" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded text-[11px] font-bold"
            style={{ background: "#22D3EE", color: "#0F172A" }}
          >
            SA
          </span>
          <span className="text-sm font-bold tracking-tight">T-ERP · Console SaaS</span>
        </div>

        <nav className="ml-6 hidden items-center gap-1 sm:flex">
          <NavTab href="/tenants">Tenants</NavTab>
          <NavTab href="/plans" disabled>
            Plans
          </NavTab>
          <NavTab href="/support" disabled>
            Support
          </NavTab>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/?tenant="
            className="text-[12px] text-cyan-300 hover:text-cyan-100"
            title="Quitter la console et retourner au portail"
          >
            ← Portail public
          </Link>
          <div className="flex items-center gap-2 border-l border-white/10 pl-3 text-[12px]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400 text-[10px] font-semibold text-[#0F172A]">
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </span>
            <span>
              {user.firstName} {user.lastName}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
    </div>
  );
}

function NavTab({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="rounded-md px-3 py-1.5 text-[13px] text-white/40 cursor-not-allowed">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[13px] text-white/80 hover:bg-white/8 hover:text-white"
    >
      {children}
    </Link>
  );
}
