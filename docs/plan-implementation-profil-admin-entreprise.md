# T-ERP - Plan d implementation incremental du profil administrateur d entreprise

Document associe : [Specification cible du profil administrateur d entreprise](spec-profil-admin-entreprise.md)

## 1. Objectif du plan

Decouper l implementation en sprints courts, mesurables et sans regression.
Chaque sprint se termine par des criteres d acceptance testables.

## 2. Hypotheses de depart

- socle API users/me/profile deja operationnel
- page frontend profile deja en production interne
- suites de tests backend pytest et frontend vitest disponibles

## 3. Strategie de livraison

- livrer d abord la separation visible des parcours
- verrouiller les regles d autorisation backend
- industrialiser les tests smoke et non regression
- terminer par l harmonisation UX + docs + telemetry

## 4. Decoupage sprint par sprint

## Sprint 1 - Fondations fonctionnelles admin profile

Objectif : etablir le mode company_admin sur la page profil avec separation claire des blocs.

Scope :

- detection user_type company_admin
- bloc Profil personnel admin
- bloc Informations de pilotage admin
- bloc Preferences de notifications
- lien vers profil entreprise
- microcopy de distinction parcours

Definition of done :

- le mode admin s affiche uniquement pour company_admin
- les 3 blocs sont visibles et comprenables
- le parcours employe reste identique

Criteres d acceptance :

- AC1 : company_admin voit le titre Profil utilisateur admin
- AC2 : company_admin voit un bloc Informations de pilotage admin
- AC3 : company_admin dispose d un lien Ouvrir le profil entreprise
- AC4 : employee ne voit pas ce mode admin

Artefacts attendus :

- code frontend profile
- smoke tests frontend de rendu

## Sprint 2 - Gouvernance des champs et securite API

Objectif : appliquer strictement les champs autorises/interdits pour company_admin en self-service.

Scope :

- validation backend de champs interdits
- message d erreur explicite en 400
- filtrage defensif frontend du payload admin

Definition of done :

- backend devient la source de verite des restrictions
- frontend ne soumet plus les champs interdits en mode admin

Criteres d acceptance :

- AC1 : PATCH admin avec champs autorises retourne 200
- AC2 : PATCH admin avec champs interdits retourne 400
- AC3 : message d erreur contient la liste de champs interdits
- AC4 : aucun impact sur PATCH employe

Artefacts attendus :

- service backend users
- tests pytest cibles admin

## Sprint 3 - Fichiers, notifications et robustesse UX

Objectif : fiabiliser les interactions critiques du profil admin.

Scope :

- upload/download assets self-service admin
- gestion et affichage des erreurs API
- retours utilisateurs de succes/erreur

Definition of done :

- les interactions principales sont robustes et testees

Criteres d acceptance :

- AC1 : upload identity_document admin retourne 201
- AC2 : fichier uploade est telechargeable
- AC3 : erreur API est visible en UI
- AC4 : notifications toggles persistantes apres save

Artefacts attendus :

- smoke tests frontend upload + erreur
- tests backend upload admin

## Sprint 4 - Contractualisation produit et alignement transverse

Objectif : stabiliser la comprehension produit et aligner doc, wording et parcours.

Scope :

- clarifier le contrat fonctionnel (profil admin vs profil entreprise)
- harmoniser labels frontend/docs
- check-list QA de non ambiguite

Definition of done :

- docs officielles coherentement alignees
- vocabulaire unifie dans produit et documentation

Criteres d acceptance :

- AC1 : docs indiquent explicitement les deux parcours
- AC2 : labels ecran et docs utilisent les memes termes
- AC3 : revue produit valide l absence d ambiguite

Artefacts attendus :

- documents fonctionnels mis a jour
- note de recette QA

## Sprint 5 - Stabilisation, observabilite et passage en routine

Objectif : securiser la maintenance dans le temps.

Scope :

- extension des cas de non regression
- instrumentation minimale des erreurs profil
- nettoyage technique et hardening

Definition of done :

- execution test pack stable
- erreurs profil tracables et actionnables

Criteres d acceptance :

- AC1 : tests smoke admin passent a 100%
- AC2 : test pack non regression existant passe
- AC3 : monitoring des erreurs profil disponible

Artefacts attendus :

- tableau de bord erreurs profil
- checklist runbook support

## 5. Backlog detaille par lot technique

Frontend :

- composant ProfilePage : variantes conditionnelles admin
- adaptation microcopy i18n
- tests vitest profile admin smoke

Backend :

- service users update_my_profile_settings : restrictions company_admin
- tests pytest ciblant GET/PATCH/upload admin

Documentation :

- specification cible
- plan incremental
- maj cahier des charges et module personnel

## 6. Matrice de risques

R1 - Regression employee profile

- Probabilite : moyenne
- Impact : eleve
- Mitigation : tests smoke employee + revue code conditionnelle

R2 - Incoherence entre front et backend sur champs interdits

- Probabilite : moyenne
- Impact : moyen
- Mitigation : backend source de verite + tests API rejects

R3 - Ambiguite fonctionnelle persistante

- Probabilite : moyenne
- Impact : moyen
- Mitigation : nomenclature harmonisee, revue UX produit

## 7. Gouvernance de recette

Checklist de validation avant cloture sprint :

- tests backend cibles passent
- tests frontend smoke passent
- regression rapide employee profile passe
- revues produit et QA signees

## 8. KPIs de succes

- taux de reussite des tests profile admin
- nombre d incidents profile admin post release
- temps moyen de resolution incident profil
- taux de comprehension utilisateur en test de parcours

## 9. Plan de communication equipe

- demo sprint courte sur parcours admin
- publication des changements docs
- partage d une FAQ interne Profil utilisateur admin vs Profil entreprise

## 10. Definition finale de pret pour industrialisation

Le chantier est considere industrialisable quand :

- separation des parcours stable en production interne
- regles champs admin verrouillees backend
- tests smoke passes de facon repetable
- documentation et vocabulaire alignes sur tout le repo
