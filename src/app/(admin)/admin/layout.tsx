import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-session";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const admin = await prisma.platformAdmin.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });
  if (!admin || admin.status !== "ACTIVE") redirect("/admin/login");

  const fullName = `${admin.firstName} ${admin.lastName}`.trim();
  const initials = `${admin.firstName.charAt(0)}${admin.lastName.charAt(0)}`.toUpperCase();

  return (
    <div
      data-admin-screen
      className="admin-app min-h-screen text-white"
      style={{ background: "#0F172A" }}
    >
      <AdminHeader adminEmail={admin.email} adminRole={admin.role} initials={initials} />
      <div className="flex">
        <AdminSidebar adminName={fullName} />
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
