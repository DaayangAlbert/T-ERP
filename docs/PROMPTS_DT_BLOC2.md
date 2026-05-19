# DT · BLOC 2 — Modules transverses (vues DT)

**3 fonctions · 3 prompts à enchaîner**

⚠️ Responsive vérifié par script Playwright à chaque commit.
Format commit : "✅ Audit responsive : 7/7 tailles OK"

---

## 🟪 PROMPT 2.1 — Validations transverses (vue DT)

```
Module : Mes validations · vue DT.

CONTEXTE
========
Le DT a son écran de validations N2 technique (déjà fait fn 1.4).
Mais il a aussi besoin d'une vue transverse de tout le circuit technique :
- Suivre où en sont SES dossiers déjà validés (passés en N3 DG ?)
- Voir les dossiers techniques en circuit DAF/DG qui pourraient nécessiter son éclairage
- Gérer ses délégations (vacances, déplacements)

PROTOTYPE HTML — ENRICHISSEMENT screen-validations
===================================================
Quand l'utilisateur est DT, ajouter :

1. Bandeau spécifique DT en haut :
   "Validations techniques · 5 N2 en attente · 38 validés ce mois · délai moyen 3,2 h"

2. Onglets DT spécifiques :
   - Mes N2 techniques (existant, fn 1.4)
   - Tout le circuit technique (transverse, NOUVEAU)
   - Délégations DT (NOUVEAU)

3. Onglet "Tout le circuit technique" :
   Vue de tous les dossiers techniques en cours dans le circuit (que je sois passé
   par eux ou pas).
   Filtres : par type (avenant, marché, sous-traitance, méthode, matériel)
   Pour chaque dossier :
   - Réf, type, chantier, initiateur, montant, étape actuelle, dans circuit depuis
   - Si bloqué > 3 jours sur une étape, surlignage rouge
   - Action "Relancer le validateur courant" disponible

4. Onglet "Délégations DT" :
   - Mes délégations actives (à qui j'ai délégué le pouvoir de valider N2 technique)
   - Bouton "Créer délégation" (pour vacances, missions terrain prolongées)
   - Historique délégations passées

API
===
- GET /api/dt/validations/circuit (toutes validations techniques en cours)
- POST /api/dt/validations/:id/remind (relancer validateur courant)
- GET /api/dt/validations/delegations
- POST /api/dt/validations/delegations
- DELETE /api/dt/validations/delegations/:id

COMPOSANTS src/components/dt/validations/
==========================================
- DtCircuitView.tsx ⚠️ RESPONSIVE (cards mobile)
- DtDelegationsManager.tsx
- DtRemindButton.tsx (avec modale confirmation)

⚠️ RESPONSIVE
==============
Standard : cards mobile pour les listes, formulaires plein écran pour les modales.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /validations

LIVRABLES
=========
- Prototype enrichi (sections DT conditionnelles)
- Code complet
- Test : créer délégation à Paul ETOUNDI pour 5 jours → ses N2 lui arrivent
- Audit responsive 7/7 OK
- Commit "feat(dt): validations transverses + délégations — fn 2.1
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 2.2 — Rapports techniques

```
Module : Rapports consolidés · vue DT.

CONTEXTE
========
Le DT produit des rapports techniques spécifiques :
- Reporting hebdomadaire technique (pour le DG, lundi matin)
- Reporting mensuel production (avec tableau comparatif chantiers)
- Bilan technique trimestriel (pour le COMEX et le CA)
- Rapport sinistralité HSE (mensuel pour CHSCT)
- Rapport études et taux de transformation (trimestriel)
- Bilan certifications ISO (annuel)
- Reporting MOA par chantier (mensuel pour les maîtres d'ouvrage)

PROTOTYPE HTML — ENRICHISSEMENT screen-reports
===============================================
Pour le DT, ajouter une section "Rapports techniques" en haut avec 7 cards templates :

1. Reporting hebdomadaire technique
2. Reporting mensuel production
3. Bilan technique trimestriel
4. Rapport sinistralité HSE
5. Rapport études et offres
6. Bilan certifications ISO
7. Reporting MOA par chantier (génération multiple)

Section "Rapports planifiés DT" :
- Reporting hebdo envoyé chaque lundi 7h au DG
- Reporting MOA envoyé fin de mois aux 23 maîtres d'ouvrage
- Bilan trimestriel envoyé 5 jours avant le COMEX trimestriel

PRISMA
======
Étendre l'enum ReportType :
   ReportType {
     ...
     DT_WEEKLY_TECHNICAL, DT_MONTHLY_PRODUCTION, DT_QUARTERLY_TECHNICAL,
     DT_HSE_MONTHLY, DT_TENDERS_QUARTERLY, DT_ISO_ANNUAL, DT_MOA_MONTHLY
   }

API
===
Réutilise l'API rapports existante. Ajouts :
- GET /api/dt/reports/templates
- POST /api/dt/reports/:type/generate?period=&siteId=
- POST /api/dt/reports/moa-batch (génère et envoie aux 23 MOA)

COMPOSANTS src/components/dt/reports/
======================================
- DtReportTemplateCard.tsx
- DtReportPdfGenerator.tsx (templates React-PDF)
- MoaBatchSendModal.tsx (sélection MOA, prévisualisation, envoi en lot)

⚠️ RESPONSIVE
==============
Cards en grille 3 col → 2 col → 1 col selon breakpoint.
Modale envoi MOA : plein écran mobile, listing checkable.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /rapports

LIVRABLES
=========
- Prototype enrichi avec section Rapports techniques DT
- Code (7 templates DT avec génération PDF)
- Test : générer reporting MOA pour Pont Mfoundi → PDF avec données du chantier OK
- Test : batch envoi MOA fin mai → 23 PDFs envoyés par email aux MOA
- Audit responsive 7/7 OK
- Commit "feat(dt): rapports techniques + MOA + bilans — fn 2.2
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## 🟪 PROMPT 2.3 — Mon espace DT (profil + paie + messagerie)

```
Module : Mon profil + Ma paie + Messagerie · vue DT.

CONTEXTE
========
Daniel ESSOMBA a son propre espace personnel comme tout cadre, mais avec spécificités DT :
- Préférences alertes techniques personnalisées (seuils dérive coût, retards)
- Mes habilitations techniques (signature N2 jusqu'à quel montant ?)
- Groupes messagerie techniques (réunion technique hebdo, comité chantiers)
- Mon agenda lié aux jalons MOA des 23 chantiers

PROTOTYPE HTML — ENRICHISSEMENTS
=================================

screen-profile (Mon profil) — pour le DT ajouter :

1. Section "Préférences alertes techniques" :
   - Seuil dérive coût (par défaut 10%) : alerte si chantier dépasse
   - Seuil retard livraison (par défaut 14 jours) : alerte si dérive planning
   - Seuil marge basse (par défaut 15%) : alerte si marge réelle inférieure
   - Seuil charge équipe (par défaut 110%) : alerte si surcharge
   - Canal préféré (email, push, in-app)

2. Section "Mes habilitations techniques" :
   - Signature seul N2 technique : jusqu'à 50 M FCFA
   - Signature cosignée DG : 50 à 200 M FCFA
   - Au-delà 200 M : signature DG + président CA
   - Liste des chantiers où je suis Person In Charge technique

3. Section "Mes délégations" (lien vers /validations/delegations)

4. Section "Mon agenda technique" :
   - Jalons MOA des 23 chantiers (réceptions, livraisons, réunions)
   - Prochains audits planifiés
   - Réunions techniques hebdo (tous les lundis 14h)
   - Comité chantiers (1er vendredi du mois)

screen-pay (Ma paie) — pour le DT, profil cadre 12 :
- Section "Bonus performance technique" :
  · Bonus marge globale annuelle (formule : 0,5% x marge brute si > seuil)
  · Bonus zéro accident grave (prime trimestrielle si pas d'AT mortel)
  · Bonus délais MOA (prime annuelle si > 80% chantiers livrés à l'heure)
- Avantages cadre 12 (voiture de fonction, téléphone, mutuelle, plan d'épargne)

screen-msg (Messagerie) — pour le DT ajouter :
- Section "Groupes techniques DT" épinglés :
  · Comité chantiers (DT + 4 dir. travaux + DG)
  · Cellule QHSE (DT + RH + responsable HSE + médecin du travail)
  · Cellule études (DT + bureau d'études + commercial)
  · Réunion technique hebdo (DT + dir. travaux + conducteurs travaux)

- Contacts externes DT :
  · Bureau de contrôle technique (BCT)
  · Géomètre référent
  · Laboratoire essais matériaux
  · Inspection du travail (référent BTP)
  · Maîtres d'ouvrage des 23 chantiers (par groupe)

PRISMA
======
   model UserSignaturePower {
     id          String   @id @default(cuid())
     userId      String   @unique
     scope       SignatureScope
     soloLimit   BigInt
     coSignLimit BigInt
     coSigners   String[]
   }
   enum SignatureScope { TECHNICAL FINANCIAL ADMINISTRATIVE COMMERCIAL HR }

   // Étendre UserPreferences :
   model UserPreferences {
     ...
     dtAlerts    Json?  // { costDeviationThreshold, delayThreshold, marginThreshold, ... }
   }

API
===
- GET/PATCH /api/users/me/preferences (existant, ajouter section dtAlerts)
- GET /api/dt/profile/signature-power
- POST /api/conversations (créer groupe technique)
- GET /api/dt/agenda/upcoming (jalons MOA + audits + réunions)

⚠️ RESPONSIVE
==============
Sections en cards verticales sur mobile.
Agenda technique : vue liste sur mobile, calendrier mensuel sur desktop.

VALIDATION RESPONSIVE OBLIGATOIRE
==================================
  pnpm exec tsx scripts/audit-responsive.ts /profil
  pnpm exec tsx scripts/audit-responsive.ts /paie
  pnpm exec tsx scripts/audit-responsive.ts /messagerie

LIVRABLES
=========
- Prototype enrichi (sections DT conditionnelles)
- Code complet
- Test : créer groupe "Comité chantiers" avec 6 participants → messages OK
- Test : modifier seuil dérive coût à 8% → alertes redéclenchées
- Audit responsive 7/7 OK sur les 3 routes
- Commit "feat(dt): mon espace personnel DT — profil + agenda + messagerie — fn 2.3
   ✅ Audit responsive : 7/7 tailles OK"
```

---

## ✅ PROFIL DT TERMINÉ

Tu viens de couvrir l'**ensemble du profil Directeur Technique** :
- Bloc 1 partie 1 : 4 fonctions Espace DT (dashboard, portefeuille, études, validations)
- Bloc 1 partie 2 : 4 fonctions Espace DT (méthodes, plan de charge, sous-traitance, QHSE)
- Bloc 2 : 3 modules transverses (validations, rapports, espace personnel)

**Total profil DT : 11 fonctions livrées.**

PROCHAINE ÉTAPE
================
Quand tu es prêt, demande le profil suivant :
"Profil DT terminé. On attaque le Directeur de Travaux."

Le Directeur de Travaux (Paul ETOUNDI) sera un profil **terrain mobile-first**
focalisé sur SES chantiers (1 à 3 chantiers en parallèle), avec une attention
particulière au responsive mobile puisqu'il consulte l'ERP en mobilité depuis
le terrain (parfois en mauvaise connexion 3G).
