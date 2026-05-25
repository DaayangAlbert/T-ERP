import { requireAdminSession } from "@/lib/admin-session";
import { PlatformUsersClient } from "@/components/admin/users/PlatformUsersClient";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  requireAdminSession();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-white">Utilisateurs</h1>
        <p className="text-xs text-white/60">
          Tous les utilisateurs de la plateforme, toutes sociétés confondues, y compris les chercheurs d&apos;emploi.
        </p>
      </header>
      <PlatformUsersClient />
    </div>
  );
}
