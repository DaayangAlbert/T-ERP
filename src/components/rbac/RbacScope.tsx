"use client";

import { ReadOnlyBanner } from "@/components/rbac/ReadOnlyBanner";
import { type Module } from "@/lib/rbac/modules";

interface Props {
  module: Module;
  children: React.ReactNode;
}

/**
 * Wrapper client posé en début d'espace métier. Affiche automatiquement le
 * bandeau "Lecture seule" si l'utilisateur a un access READ sur ce module
 * (typiquement DG drill-down dans DAF/RH/DT…).
 *
 * Le verrou RBAC dur (redirection si NONE) reste dans le `layout.tsx`
 * server-component avec `canAccess()`. Ce wrapper n'ajoute que le signal UI.
 *
 * Usage dans un layout server :
 *   <RbacScope module={MODULES.DAF}>{children}</RbacScope>
 */
export function RbacScope({ module, children }: Props) {
  return (
    <>
      <ReadOnlyBanner module={module} />
      {children}
    </>
  );
}
