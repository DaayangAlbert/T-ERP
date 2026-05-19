import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { DocumentsListPage } from "@/components/ged/documents/DocumentsListPage";

export const metadata = {
  title: "Bibliothèque documentaire — T-ERP",
};

export default function Page({ params }: { params: { tenantSlug: string } }) {
  const session = getCurrentSession();
  if (!session) redirect("/login");

  const allowed =
    session.role === Role.ARCHIVIST ||
    session.role === Role.TENANT_ADMIN ||
    session.role === Role.SUPER_ADMIN;
  if (!allowed) redirect(`/${params.tenantSlug}/gestion-documentaire`);

  return <DocumentsListPage />;
}
