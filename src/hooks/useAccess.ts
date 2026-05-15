"use client";

import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getAccess,
  getAccessibleModules,
  type Access,
} from "@/lib/rbac/access-matrix";
import { type Module } from "@/lib/rbac/modules";

/**
 * Hook React — niveau d'accès du user courant à un module donné.
 *
 * Exemples :
 *   const { level, canEdit, canValidate } = useAccess("DAF");
 *   if (!canEdit) hideEditButtons();
 *   if (level === "READ") showReadOnlyBanner();
 */
export function useAccess(module: Module): Access {
  const { user } = useAuth();
  return getAccess(user?.role as Role | undefined, module);
}

/**
 * Liste des modules accessibles au user courant (level ≥ READ).
 * Utile pour générer dynamiquement la sidebar.
 */
export function useAccessibleModules(): Module[] {
  const { user } = useAuth();
  return getAccessibleModules(user?.role as Role | undefined);
}
