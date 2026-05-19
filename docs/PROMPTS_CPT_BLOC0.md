# COMPTABLE · DÉVELOPPEMENT — Bloc 0 (Préambule + RBAC)

**Profils cibles :**
- Comptable Direction (Sylvie ATANGANA · vue globale BatimCAM)
- Comptable Chantier (Jacques MBARGA · Pont Mfoundi + Bastos R+8 ; Christine NGAH · Bonabéri + AEP Mbalmayo)

**Architecture RBAC choisie :** un seul rôle `ACCOUNTANT` avec un array `assignedSiteIds`.
- Si `assignedSiteIds` est vide → vue Direction (accès tous chantiers)
- Si `assignedSiteIds` est peuplé → vue Chantier (accès limité)

**Méthode :** 1 prompt = 1 fonction. Audit responsive obligatoire à chaque commit.

---

## ⚠️ PROTOCOLE RESPONSIVE — IDENTIQUE AUX PROFILS PRÉCÉDENTS

Avant chaque commit :
```bash
pnpm exec tsx scripts/audit-responsive.ts /comptable/<route>
```
Format commit obligatoire : "✅ Audit responsive : 7/7 tailles OK"

---

## 🟪 PROMPT 0 — PRÉAMBULE COMPTABLE + RBAC

```
Phase de développement du profil Comptable avec architecture RBAC double rôle.

CONTEXTE
========
- Les profils DG, DAF, DT, RH ont été développés.
- Le rôle Comptable existe en deux variantes selon assignedSiteIds :
  · Comptable Direction (vue globale, array vide)
  · Comptable Chantier (vue limitée aux chantiers assignés)
- Le prototype contient déjà 4 écrans Configuration utilisateurs :
  screen-config-users, screen-config-promotions, screen-config-user-detail,
  screen-config-audit
- Le prototype contiendra 8 écrans Espace Comptabilité (à créer dans les prompts suivants).

CONVENTIONS
============
- Écrans prototype : id="screen-cpt-<fonction>" pour l'espace, screen-config-* pour admin
- Pages Next.js : src/app/(app)/comptable/<fonction>/page.tsx
- Composants : src/components/comptable/<NomFonction>.tsx
- API routes : src/app/api/comptable/<fonction>/route.ts
- Hooks : src/hooks/useCpt<Fonction>.ts
- Toutes les pages Comptable ont l'attribut data-rh-screen sur leur container racine

TÂCHES PRÉPARATOIRES — RBAC + GESTION UTILISATEURS
====================================================

1. ARCHITECTURE RBAC (CRITIQUE)
   Modifier le schema Prisma :

   model User {
     ...
     role             Role
     assignedSiteIds  String[]   @default([])
     // assignedSiteIds est utilisé pour :
     // - ACCOUNTANT : périmètre comptable (vide = Direction)
     // - DIRECTOR_OF_WORKS : chantiers pilotés
     // - SITE_MANAGER : chantier de rattachement (1 seul)
     // - FOREMAN : chantier
     // - ouvrier, journalier : chantier d'affectation
   }

   enum Role {
     SUPER_ADMIN
     DG  // Directeur Général
     DAF
     TECHNICAL_DIRECTOR  // DT
     HR
     DIRECTOR_OF_WORKS  // Directeur travaux
     SITE_MANAGER       // Conducteur travaux
     FOREMAN            // Chef chantier
     ACCOUNTANT         // Comptable (Direction OU Chantier selon assignedSiteIds)
     LOGISTICS
     WAREHOUSE_KEEPER
     EMPLOYEE
     WORKER
     IT_ADMIN           // Informaticien d'entreprise
     SECRETARY_GENERAL  // Secrétaire général
   }

2. MIDDLEWARE DE FILTRAGE PAR CHANTIERS
   Créer src/lib/rbac/site-filter.ts :

   export async function getAccessibleSiteIds(userId: string): Promise<string[] | null> {
     const user = await prisma.user.findUnique({ where: { id: userId } });
     if (!user) throw new Error('User not found');

     // Cadres dirigeants : accès à tout
     if ([Role.SUPER_ADMIN, Role.DG, Role.DAF, Role.TECHNICAL_DIRECTOR, Role.HR].includes(user.role)) {
       return null; // null = pas de filtre (accès global)
     }

     // Comptable Direction (array vide) : accès à tout
     if (user.role === Role.ACCOUNTANT && user.assignedSiteIds.length === 0) {
       return null;
     }

     // Tous les autres rôles : filtrés par leur array assignedSiteIds
     return user.assignedSiteIds;
   }

   // À utiliser dans toutes les API du Comptable :
   const accessibleSites = await getAccessibleSiteIds(session.user.id);
   const where = accessibleSites === null
     ? { tenantId } // Pas de filtre supplémentaire
     : { tenantId, siteId: { in: accessibleSites } };

3. WORKFLOW DE PROMOTION
   Créer le model RolePromotionRequest :

   model RolePromotionRequest {
     id              String   @id @default(cuid())
     tenantId        String
     targetUserId    String
     targetUser      User     @relation("PromotionTarget", fields: [targetUserId], references: [id])
     fromRole        Role
     toRole          Role
     requestedSiteIds String[] @default([])
     justification   String   @db.Text
     requestedById   String
     requestedBy     User     @relation("PromotionRequester", fields: [requestedById], references: [id])
     requestedAt     DateTime @default(now())
     validatorRoles  Role[]   // qui doit valider (ex: [DAF] pour Comptable, [DAF, TECHNICAL_DIRECTOR] pour Dir. travaux)
     validations     Json     // [{ validatorId, validatorRole, validatedAt, decision, comment }]
     status          PromotionStatus
     resolvedAt      DateTime?
   }
   enum PromotionStatus { PENDING APPROVED REJECTED CANCELLED }

   API routes :
   - POST /api/admin/promotions/request (RH crée la demande)
   - GET /api/admin/promotions/pending?validatorRole=DAF
   - POST /api/admin/promotions/:id/validate (validation par DAF/DT/DG)
   - POST /api/admin/promotions/:id/reject

4. AUDIT LOG OBLIGATOIRE
   Créer le model AuditLog si pas déjà fait :

   model AuditLog {
     id          String   @id @default(cuid())
     tenantId    String
     actorId     String
     actor       User     @relation(fields: [actorId], references: [id])
     action      AuditAction
     targetType  String   // "User", "Site", "Validation", ...
     targetId    String
     before      Json?
     after       Json?
     criticality AuditCriticality
     ipAddress   String?
     userAgent   String?
     createdAt   DateTime @default(now())
   }
   enum AuditAction { USER_CREATED USER_UPDATED USER_DEACTIVATED ROLE_CHANGED SITES_ASSIGNED SITES_UNASSIGNED LOGIN LOGIN_FAILED PROMOTION_REQUESTED PROMOTION_APPROVED PROMOTION_REJECTED ENTRY_CREATED ENTRY_VALIDATED ... }
   enum AuditCriticality { LOW NORMAL HIGH CRITICAL }

   Toute action sensible doit créer une entrée AuditLog.

5. ÉCRANS CONFIGURATION (déjà dans le prototype)
   Reproduire en React :
   - screen-config-users → /admin/users
   - screen-config-promotions → /admin/promotions
   - screen-config-user-detail → /admin/users/[id]
   - screen-config-audit → /admin/audit

   Permissions par écran :
   - /admin/users : visible par DG, DAF (lecture), RH (création employés)
   - /admin/promotions : visible par DAF + DT (selon validatorRoles de la demande)
   - /admin/audit : visible uniquement par DG + IT_ADMIN

LIVRABLES BLOC 0
=================
- Schema Prisma migré avec User.assignedSiteIds, RolePromotionRequest, AuditLog
- Middleware site-filter.ts fonctionnel
- 4 écrans config implémentés et accessibles selon permissions
- Workflow promotion testé bout-en-bout :
  RH crée Jacques MBARGA → demande promotion ACCOUNTANT + chantiers Pont Mfoundi + Bastos
  → notif DAF → DAF valide → Jacques reconnecte → voit ses 2 chantiers uniquement
- Test isolation : Jacques se connecte, tente d'accéder à /comptable/ecritures?siteId=
  voirie-bonaberi (qui n'est pas dans son périmètre) → 403 Forbidden
- Audit responsive 7/7 OK sur les 4 écrans config
- Commit "feat(admin): RBAC + workflow promotion + audit log + gestion utilisateurs"

Une fois validé, attends mon prompt 1.1.
```

---

## ✅ FIN BLOC 0

Bloc suivant : **Bloc 1 — Espace Comptabilité (8 fonctions)**

Quand le bloc 0 est validé, demande :
"Bloc 0 Comptable terminé. Tu peux me livrer le Bloc 1."
