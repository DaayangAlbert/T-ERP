# COMPTABLE · BLOC 2 — Modules transverses

**3 fonctions · 3 prompts à enchaîner**

⚠️ Responsive vérifié par script Playwright à chaque commit.
RBAC double rôle systématiquement appliqué via getAccessibleSiteIds().

---

## 🟪 PROMPT 2.1 — Mes validations (vue Comptable)

```
Module : Mes validations · vue Comptable.

CONTEXTE
========
Le Comptable valide en N1 comptable plusieurs types :
- Bons de commande < 5 M FCFA (validation rapide opérationnelle)
- Notes de frais des employés
- Demandes d'avances
- Réceptions de factures (validation comptabilisation avant transmission DAF)

Le Comptable Chantier valide uniquement sur ses chantiers.
Le Comptable Direction valide les opérations siège + frais généraux + tout ce qui
n'a pas de chantier rattaché.

PROTOTYPE HTML — ENRICHISSEMENT screen-validations
===================================================
Quand l'utilisateur est ACCOUNTANT, ajouter :

1. Bandeau spécifique Comptable :
   - Direction : "Validations N1 comptables · vue globale"
   - Chantier : "Validations N1 comptables · 2 chantiers"

2. Onglets Comptable :
   - Mes N1 comptables (existant)
   - Tout le circuit comptable (transverse)
   - Délégations comptables

3. Onglet "Mes N1 comptables" :
   Listview filtrée sur les demandes de type po/expense-report/advance/invoice.
   Pour chaque demande :
   - Réf, type, demandeur, montant, chantier (si applicable, filtré RBAC)
   - Workflow visuel : Initiateur → N1 Comptable (moi) → N2 DAF → N3 DG
   - Boutons valider / rejeter / demander complément

API
===
- GET /api/comptable/validations/pending (filtré RBAC)
- POST /api/comptable/validations/:id/approve
- POST /api/comptable/validations/:id/reject
- GET /api/comptable/validations/circuit
- GET /api/comptable/validations/delegations
- POST /api/comptable/validations/delegations

COMPOSANTS src/components/comptable/validations/
==================================================
- CptValidationsBanner.tsx (adapte texte selon RBAC)
- CptValidationsTable.tsx ⚠️ RESPONSIVE
- CptDelegationsManager.tsx

⚠️ RESPONSIVE
==============
Tableau → cards mobile avec workflow vertical.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /validations

LIVRABLES
=========
- Prototype enrichi (sections Comptable conditionnelles + filtrage RBAC)
- Code complet
- Test Jacques : voit uniquement validations sur Pont Mfoundi + Bastos R+8
- Test Sylvie : voit toutes les validations comptables transverses
- Audit responsive 7/7 OK
- Commit "feat(comptable): validations N1 + circuit + délégations + RBAC — fn 2.1
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 2.2 — Rapports comptables

```
Module : Rapports comptables.

CONTEXTE
========
Le Comptable produit des rapports comptables spécifiques :
- États comptables périodiques (grand livre, balance, journaux)
- Reporting comptable mensuel pour le DAF
- Préparation états de synthèse pour DSF annuelle
- Rapports analytiques par chantier (filtrés RBAC)
- Rapports fournisseurs et clients (balance âgée, lettrage)

PROTOTYPE HTML — ENRICHISSEMENT screen-reports
================================================
Pour l'ACCOUNTANT, ajouter une section "Rapports comptables" en haut avec
templates selon le rôle :

Comptable Direction (10 templates) :
1. Grand livre complet
2. Balance générale
3. Balance auxiliaire fournisseurs
4. Balance auxiliaire clients
5. Journal centralisateur
6. État de synthèse mensuel (P&L + bilan provisoire)
7. Liasse DSF préparatoire (annuel)
8. Balance âgée fournisseurs
9. Balance âgée clients (cohérent avec DAF recouvrement)
10. Reporting analytique consolidé 23 chantiers

Comptable Chantier (5 templates) :
1. Grand livre chantier(s)
2. Balance analytique chantier(s)
3. État des dépenses chantier(s)
4. Suivi situations émises chantier(s)
5. Reporting comptable chantier mensuel

PRISMA
======
Étendre l'enum ReportType :
   ReportType {
     ...
     CPT_GENERAL_LEDGER, CPT_BALANCE_GENERAL, CPT_BALANCE_AUX_SUPPLIERS,
     CPT_BALANCE_AUX_CUSTOMERS, CPT_JOURNAL_CENTRALIZER, CPT_MONTHLY_SYNTHESIS,
     CPT_DSF_PREP, CPT_AGED_BALANCE_SUPPLIERS, CPT_AGED_BALANCE_CUSTOMERS,
     CPT_ANALYTICAL_CONSOLIDATED, CPT_SITE_LEDGER, CPT_SITE_BALANCE,
     CPT_SITE_EXPENSES, CPT_SITE_BILLINGS, CPT_SITE_MONTHLY
   }

API
===
- GET /api/comptable/reports/templates (filtré RBAC)
- POST /api/comptable/reports/:type/generate?period=&siteId=
- GET /api/comptable/reports/scheduled (rapports planifiés automatiques)

COMPOSANTS src/components/comptable/reports/
==============================================
- CptReportTemplateCard.tsx (affiche templates selon RBAC)
- CptReportPdfGenerator.tsx (templates React-PDF)
- CptReportExcelGenerator.tsx (templates xlsx pour DSF)

⚠️ RESPONSIVE
==============
Cards en grille 3 col → 2 col → 1 col.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rapports

LIVRABLES
=========
- Prototype enrichi (section Rapports comptables conditionnelle RBAC)
- Code complet
- Test Sylvie : voit les 10 templates Direction
- Test Jacques : voit uniquement les 5 templates Chantier
- Test génération : Sylvie génère grand livre 401 PIWA mai → PDF correct
- Audit responsive 7/7 OK
- Commit "feat(comptable): rapports comptables + RBAC + templates — fn 2.2
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 2.3 — Mon espace Comptable (profil + paie + messagerie)

```
Module : Mon profil + Ma paie + Messagerie · vue Comptable.

PROTOTYPE HTML — ENRICHISSEMENTS
=================================

screen-profile (Mon profil) — pour le Comptable ajouter :

1. Section "Mes chantiers assignés" (Comptable Chantier uniquement) :
   - Liste des chantiers où j'interviens (lecture seule)
   - Pour modifier : "Contacter le DAF"

2. Section "Préférences alertes comptables" :
   - Alerte écriture en brouillard > 48h (par défaut activé)
   - Alerte facture échéant J-3 (par défaut activé)
   - Alerte rapprochement bancaire mensuel à faire (Direction uniquement)
   - Canal préféré (email, push, in-app)

3. Section "Mes habilitations" :
   - Plafond validation BC : 5 M FCFA
   - Comptes accessibles en saisie (selon rôle Direction/Chantier)
   - Journaux accessibles

screen-pay (Ma paie) — standard cadre 11 ou ETAM selon profil.

screen-msg (Messagerie) — pour le Comptable ajouter :
- Section "Groupes comptables" épinglés :
  · Cellule comptable Direction (DAF + Comptable Direction + assistante)
  · Cellule paie (RH + Comptable Direction + DAF)
  · Cellule chantier <X> (Comptable Chantier + Dir. travaux + Chef chantier)
- Contacts externes :
  · Cabinet expert-comptable
  · Cabinet CAC
  · Avocat fiscaliste

PRISMA
======
   model UserPreferences {
     ...
     cptAlerts   Json?  // { draftEntriesAlert, invoiceDueAlert, ... }
   }

API
===
- GET/PATCH /api/users/me/preferences
- GET /api/comptable/profile/assigned-sites
- GET /api/comptable/profile/permissions

⚠️ RESPONSIVE
==============
Sections en cards verticales sur mobile.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /profil

LIVRABLES
=========
- Prototype enrichi (sections Comptable conditionnelles)
- Code complet
- Test Jacques : section "Mes chantiers assignés" visible avec ses 2 chantiers
- Test Sylvie : section absente (vue Direction)
- Audit responsive 7/7 OK
- Commit "feat(comptable): mon espace personnel + préférences + chantiers — fn 2.3
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ PROFIL COMPTABLE TERMINÉ

Tu viens de couvrir l'**ensemble du profil Comptable** avec architecture RBAC double rôle :
- Bloc 0 : Préambule + RBAC + Workflow promotion + Gestion utilisateurs (4 écrans config)
- Bloc 1 : 8 fonctions Espace Comptabilité (tableau de bord, écritures, factures
  fournisseurs, factures clients, trésorerie, actifs, fiscalité Direction uniquement,
  grand livre)
- Bloc 2 : 3 modules transverses (validations, rapports, mon espace)

**Total profil Comptable : 11 fonctions + 4 écrans admin = 15 écrans livrés**

POINTS FORTS DE CETTE ARCHITECTURE
====================================
- Un seul rôle ACCOUNTANT dans le système, distinction via assignedSiteIds
- Isolation des données automatique au niveau middleware (sécurité by design)
- Workflow de promotion auditée bout-en-bout (création → demande → validation → audit)
- Audit log de toutes les actions sensibles conservé 7 ans
- Tests RBAC obligatoires pour chaque fonction (vérification au niveau API)

PROCHAINE ÉTAPE
================
Quand tu es prêt :
"Profil Comptable terminé. On attaque le profil <X>."

Profils restants après Comptable :
- Directeur de Travaux (Paul ETOUNDI) — terrain mobile-first
- Conducteur de Travaux (Samuel MBARGA) — pilotage quotidien chantier
- Chef de Chantier (Jean KAMGA) — PWA mobile hors-ligne
- Magasinier (Lucas TIENTCHEU) — mouvements stocks, inventaires
- Logisticien — flotte, achats, fournisseurs
- GED — gestion documentaire
- Informaticien — admin technique
- Employé bureau · Ouvrier — comptes basiques

Mon ordre recommandé : Directeur Travaux → Chef Chantier (PWA effet wow) →
Magasinier → autres.
