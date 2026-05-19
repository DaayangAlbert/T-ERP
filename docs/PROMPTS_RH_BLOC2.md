# RH · BLOC 2 — Modules transverses (vues RH)

**3 fonctions · 3 prompts à enchaîner**

⚠️ Responsive obligatoire vérifié par script Playwright à chaque commit.
Format commit : "✅ Audit responsive : 7/7 tailles OK"

---

## 🟪 PROMPT 2.1 — Validations RH (vue transverse)

```
Module : Mes validations · vue RH.

CONTEXTE
========
La RH valide en N1 RH plusieurs types :
- Demandes de congés (avant qu'elles passent au DAF si > 30 jours)
- Embauches en CDI (avant validation N2 DAF puis N3 DG si poste cadre)
- Modifications contrat (avenants, mobilité, augmentations)
- Saisies paie variables (avant transmission N2 DAF)

PROTOTYPE HTML — ENRICHISSEMENT screen-validations
===================================================
L'écran screen-validations existe (générique). Quand l'utilisateur est RH, ajouter :

1. Bandeau spécifique RH en haut :
   "Validations RH N1 · 9 demandes en attente · cumul 38,2 M FCFA équivalent annuel"

2. Onglets RH spécifiques :
   - Mes N1 RH (existant, focus RH)
   - Tout le circuit RH (transverse)
   - Délégations RH

3. Onglet "Mes N1 RH" :
   Listview filtrée sur les demandes de type leave/hiring/contract/payroll en attente RH.
   Pour chaque demande :
   - Réf, employé concerné, type, motif, montant impact
   - Workflow visuel : Initiateur → N1 RH (moi) → N2 DAF → N3 DG
   - Boutons valider / rejeter / demander complément

4. Onglet "Tout le circuit RH" :
   Vue de toutes les demandes RH en cours dans le circuit (passées par moi ou pas).
   Permet de voir où ça coince (DAF lent ? DG absent ?).

5. Onglet "Délégations RH" :
   - Mes délégations actives (à qui j'ai délégué pendant mes congés)
   - Bouton "Créer délégation"

API
===
- GET /api/rh/validations/pending (mes N1 RH en attente)
- POST /api/rh/validations/:id/approve
- POST /api/rh/validations/:id/reject (motif obligatoire)
- POST /api/rh/validations/:id/request-info
- GET /api/rh/validations/circuit (tout RH dans circuit)
- GET /api/rh/validations/delegations
- POST /api/rh/validations/delegations

COMPOSANTS src/components/rh/validations/
==========================================
- RhValidationsBanner.tsx
- RhValidationsTable.tsx ⚠️ RESPONSIVE (cards mobile avec workflow vertical)
- RhCircuitView.tsx
- RhDelegationsManager.tsx

⚠️ RESPONSIVE
==============
- Mêmes règles que pour validations DAF :
  Tableau → cards mobile avec workflow vertical sur petit écran
  Bouton "Valider" pleine largeur sticky bottom sur mobile

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /validations

LIVRABLES
=========
- Prototype enrichi (sections RH conditionnelles)
- Code complet
- Test : valider une demande de congé > 30 jours, vérifier qu'elle passe en N2 DAF
- Audit responsive 7/7 OK
- Commit "feat(rh): validations N1 RH + circuit + délégations — fn 2.1
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 2.2 — Rapports RH

```
Module : Rapports consolidés · vue RH.

CONTEXTE
========
La RH produit des rapports spécifiques :
- Rapport mensuel d'activité RH (pour le DG)
- Bilan social annuel (obligation légale)
- Rapport égalité H/F (obligation légale)
- Tableau de bord RH hebdomadaire (interne)
- Statistiques recrutement trimestriel
- Indicateurs sociaux (turnover, absentéisme, climat)

PROTOTYPE HTML — ENRICHISSEMENT screen-reports
===============================================
Ajouter pour le profil RH une section "Rapports RH" en haut avec 6 cards templates :
- Rapport mensuel RH
- Bilan social annuel
- Rapport égalité H/F
- TDB RH hebdomadaire
- Stats recrutement T2
- Indicateurs sociaux

Section "Rapports planifiés RH" :
- TDB hebdomadaire envoyé chaque lundi 8h au DG
- Rapport mensuel le 5 du mois au DG + DAF
- Bilan social envoyé fin février aux représentants du personnel

PRISMA
======
Étendre l'enum ReportType existant :
   ReportType {
     ...
     RH_MONTHLY, RH_SOCIAL_ANNUAL, RH_GENDER_EQUALITY, RH_WEEKLY_DASHBOARD,
     RH_RECRUITMENT_QUARTERLY, RH_SOCIAL_INDICATORS
   }

API
===
Réutilise l'API rapports existante. Ajoute :
- GET /api/rh/reports/templates
- POST /api/rh/reports/:type/generate?period=

COMPOSANTS src/components/rh/reports/
======================================
- RhReportTemplateCard.tsx
- RhReportPdfGenerator.tsx (template React-PDF avec données RH)

⚠️ RESPONSIVE
==============
Cards en grille 3 col → 2 col → 1 col selon breakpoint.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rapports

LIVRABLES
=========
- Prototype enrichi avec section Rapports RH
- Code (6 templates RH avec génération PDF)
- Audit responsive 7/7 OK
- Commit "feat(rh): rapports RH + bilan social + égalité H/F — fn 2.2
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 2.3 — Mon espace RH (profil + paie + messagerie)

```
Module : Mon profil + Ma paie + Messagerie · vue RH.

CONTEXTE
========
Sandrine ONANA a son propre espace personnel comme tout employé, mais avec quelques
spécificités RH :
- Accès rapide à ses propres dossiers (paie, congés, formations)
- Préférences alertes RH personnalisées
- Groupes messagerie RH spécifiques

PROTOTYPE HTML — ENRICHISSEMENTS
=================================

screen-profile (Mon profil) — pour la RH ajouter :
- Section "Préférences alertes RH" :
  · Alertes visites médicales J-30
  · Alertes recyclages CACES J-60
  · Alertes CDD échéant J-45
  · Canal préféré (email, push, in-app, SMS)
- Section "Mes délégations" (lien vers /validations/delegations)

screen-pay (Ma paie) — pas de spécificité RH particulière (rémunération standard cadre)

screen-msg (Messagerie) — pour la RH ajouter :
- Section "Groupes RH" épinglés :
  · Cellule paie (RH + comptable + DAF)
  · Cellule recrutement (RH + DG + DT pour postes cadres)
  · Représentants du personnel (RH + délégués)
- Contacts externes :
  · Médecine du travail
  · Inspection du travail
  · CNPS référent
  · Cabinet expert paie (si prestation externe)

PRISMA
======
Réutilise les models UserPreferences et Conversation existants.
Ajout enum spécifique :
   AlertType { ..., RH_MEDICAL_VISIT_DUE, RH_TRAINING_RECYCLE_DUE, RH_CDD_ENDING }

API
===
- GET/PATCH /api/users/me/preferences (existant, ajouter section rhAlerts)
- POST /api/conversations (créer groupe RH)

⚠️ RESPONSIVE
==============
Standard. Sections en cards verticales sur mobile.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /profil
  pnpm exec tsx scripts/audit-responsive.ts /paie
  pnpm exec tsx scripts/audit-responsive.ts /messagerie

LIVRABLES
=========
- Prototype enrichi (sections RH conditionnelles)
- Code complet
- Test : créer groupe "Cellule paie" avec 4 participants → messages échangés OK
- Audit responsive 7/7 OK sur les 3 routes
- Commit "feat(rh): mon espace personnel RH — profil + messagerie — fn 2.3
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ PROFIL RH TERMINÉ

Tu viens de couvrir l'**ensemble du profil RH** :
- Bloc 1 : 8 fonctions Espace RH (dashboard, personnel, saisie paie, recrutement,
  congés, formations, visites médicales, disciplinaire)
- Bloc 2 : 3 modules transverses (validations N1 RH, rapports RH, espace personnel)

**Total profil RH : 11 fonctions livrées.**

PROCHAINE ÉTAPE
================
Quand tu es prêt, demande le profil suivant :
"Profil RH terminé. On attaque le profil <X>."

Profils restants : Comptable, Magasinier, Directeur travaux, Conducteur travaux,
Chef chantier (PWA mobile), Logisticien, Directeur technique, GED, Employé bureau,
Ouvrier mobile, Informaticien d'entreprise.

Mon ordre recommandé :
1. Comptable (saisie écritures réelles)
2. Chef chantier (PWA mobile hors-ligne — gros effet wow démo)
3. Magasinier (cycle stocks complet)
4. Conducteur travaux (planning + équipes)
5. Directeur travaux (pilotage projet)
6. Autres profils dans l'ordre que tu veux
