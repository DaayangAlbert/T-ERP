/**
 * Réinitialise la table platformAdmin : supprime tous les super-admins
 * existants et crée un nouveau avec les credentials fournis.
 *
 * Usage :
 *   npx tsx scripts/reset-super-admins.ts <email> <password> [firstName] [lastName]
 *
 * Exemple :
 *   npx tsx scripts/reset-super-admins.ts daa.ensah@gmail.com 'MotDePasseFort!' Albert DAAYANG
 *
 * Le nouveau super-admin a tous les droits (CTO) et son statut est ACTIVE.
 * MFA désactivé par défaut.
 *
 * Les références FK aux anciens admins (GlobalAuditLog.platformAdminId,
 * PlatformIncident.assignedTo) sont mises à null pour préserver l'historique
 * sans contraindre la suppression.
 */
import bcrypt from "bcrypt";
import {
  PrismaClient,
  PlatformAdminRole,
  PlatformAdminStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, firstNameArg, lastNameArg] = process.argv;
  if (!email || !password) {
    console.error(
      "Usage : npx tsx scripts/reset-super-admins.ts <email> <password> [firstName] [lastName]",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("⚠️  Mot de passe trop court (min 8 caractères).");
    process.exit(1);
  }
  const firstName = firstNameArg ?? "Super";
  const lastName = lastNameArg ?? "Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Nullifier les FK pour ne pas bloquer la suppression
    const auditUpdate = await tx.globalAuditLog.updateMany({
      where: { platformAdminId: { not: null } },
      data: { platformAdminId: null },
    });
    const incidentUpdate = await tx.platformIncident.updateMany({
      where: { assignedTo: { not: null } },
      data: { assignedTo: null },
    });

    // 2. Supprimer tous les platformAdmin existants
    const deleted = await tx.platformAdmin.deleteMany({});

    // 3. Créer le nouveau super-admin
    const created = await tx.platformAdmin.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: PlatformAdminRole.CTO,
        mfaEnabled: false,
        mfaSecret: "DEMO",
        whitelistedIps: ["0.0.0.0/0"],
        canCreateTenants: true,
        canSuspendTenants: true,
        canDeleteTenants: true,
        canManageBilling: true,
        canManagePlatformConfig: true,
        canViewAllTenantsData: true,
        canManageGlobalIntegrations: true,
        canViewGlobalAudit: true,
        status: PlatformAdminStatus.ACTIVE,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return {
      deletedAdmins: deleted.count,
      detachedAuditLogs: auditUpdate.count,
      detachedIncidents: incidentUpdate.count,
      newAdmin: created,
    };
  });

  console.log(`✓ ${result.deletedAdmins} super-admin(s) supprimé(s)`);
  console.log(
    `  (${result.detachedAuditLogs} audit logs et ${result.detachedIncidents} incidents conservés mais détachés)`,
  );
  console.log(
    `✓ Nouveau super-admin : ${result.newAdmin.firstName} ${result.newAdmin.lastName} <${result.newAdmin.email}> (role ${result.newAdmin.role})`,
  );
  console.log(`  Login : ${result.newAdmin.email} sur /admin (login via la modale de la landing)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(99);
  })
  .finally(() => prisma.$disconnect());
