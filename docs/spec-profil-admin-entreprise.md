# T-ERP - Specification cible detaillee du profil administrateur d entreprise

Document parent :

- [Cahier des charges fonctionnel](cahier-des-charges-fonctionnel.md)
- [Module Personnel de l entreprise](module-personnel-entreprise.md)
- [Routes API Flask detaillees](routes-api-flask-detaillees.md)

## 1. Objet

Ce document definit la cible fonctionnelle du profil administrateur d entreprise.
Il sert de reference commune pour produit, design, frontend, backend et QA.

Le profil administrateur d entreprise doit distinguer clairement :

- le profil utilisateur admin : identite de la personne et preferences du compte
- le profil entreprise : informations juridiques et parametres societaires

## 2. Principes directeurs

- separation explicite des parcours pour eviter toute ambiguite
- ergonomie orientee pilotage et responsabilites manageriales
- respect du RBAC par permissions et type utilisateur
- zero regression sur le parcours employe self-service
- auditabilite des modifications sensibles

## 3. Perimetre

Inclus dans ce document :

- ecrans et blocs fonctionnels du profil admin
- dictionnaire de champs
- regles de validation et autorisation
- regles UX de parcours et libelles
- exigences de test et d acceptance

Hors perimetre :

- refonte complete du module companies
- ajout de nouvelles permissions metier de phase 2
- workflow legal avance avec signatures electroniques

## 4. Utilisateurs cibles

Acteur principal :

- company_admin (admin principal ou admin delegue)

Acteurs secondaires :

- super_admin (lecture transverse selon les endpoints admin plateforme)
- roles de direction pouvant consulter certaines informations via autres ecrans

## 5. Architecture des parcours

## 5.1 Parcours A - Profil utilisateur admin

Objectif : permettre a l administrateur de gerer son compte personnel.

Donnees attendues :

- identite personnelle
- contact
- langue preferee
- piece identite et CV
- preferences de notifications

Sortie attendue :

- profil admin complet, coherent et a jour

## 5.2 Parcours B - Profil entreprise

Objectif : gerer le dossier societaire et les parametres globaux.

Donnees attendues :

- raison sociale, statut onboarding, statut abonnement
- documents legaux
- parametres entreprise

Sortie attendue :

- dossier entreprise accessible depuis companies et clairement separe du profil utilisateur

## 6. Ecrans cibles (profil admin)

## 6.1 Ecran principal Profil Admin

Titre : Profil utilisateur admin
Sous-titre : gestion du compte administrateur et preferences.

Blocs obligatoires :

- Bloc 1 : Profil personnel admin
- Bloc 2 : Informations de pilotage admin
- Bloc 3 : Preferences de notifications

Actions principales :

- enregistrer les modifications
- televerser document profil
- ouvrir le profil entreprise

## 6.2 Bloc 1 - Profil personnel admin

Champs modifiables :

- first_name
- last_name
- phone
- gender
- birth_date
- address_line
- preferred_language
- profile_photo_url (via upload)
- identity_document_type
- identity_document_number
- identity_issue_date
- identity_document_url (via upload)
- taxpayer_number
- cv_url (via upload)

Regles :

- first_name et last_name non vides
- preferred_language dans fr/en
- dates au format ISO
- valeurs vides normalisees a null pour champs optionnels

## 6.3 Bloc 2 - Informations de pilotage admin

Bloc principalement en lecture, servant de tableau de contexte.

Champs affiches :

- entreprise associee (legal_name)
- account_status entreprise
- subscription_status entreprise
- setup_status entreprise
- operational_profile_code admin
- nombre de permissions
- indicateur admin principal
- nombre de profils collaborateurs incomplets
- nombre d alertes actives

Actions :

- lien vers page companies pour gerer le profil entreprise

## 6.4 Bloc 3 - Preferences de notifications

Champs modifiables :

- chat_notifications_enabled
- payslip_notifications_enabled

Actions :

- marquer les notifications paie comme vues
- consulter dernieres alertes

## 7. Regles d autorisation (RBAC)

Regles minimales :

- endpoint users/me/profile accessible utilisateur authentifie
- pour company_admin, contraintes de champs appliquees en backend
- aucune elevation de privilege par ce parcours

Champs interdits en edition self-service pour company_admin :

- cnps_number
- bank_account_number
- bank_name
- payment_method

Comportement attendu :

- si ces champs sont soumis : HTTP 400 avec message explicite

## 8. Regles API

Endpoint principal :

- GET users/me/profile
- PATCH users/me/profile
- POST users/me/profile/uploads/{asset_kind}
- GET users/me/profile/assets/{asset_kind}
- GET users/me/notifications
- POST users/me/notifications/mark-seen

Contraintes :

- payload PATCH nettoye et valide par schema
- upload soumis a whitelist d extensions
- upload rate-limite

## 9. Regles UX et microcopy

Exigences :

- utiliser le libelle Profil utilisateur admin pour le parcours personnel
- utiliser le libelle Profil entreprise pour le parcours societaire
- ne jamais afficher le parcours personnel comme dossier legal entreprise
- lien contextuel visible entre les deux parcours

## 10. Televersement de fichiers

Types pris en charge :

- profile_photo : images
- identity_document : image ou pdf
- cv : pdf/doc/docx

Exigences :

- retour utilisateur en cas de succes et echec
- affichage du nom de fichier courant
- telechargement possible du dernier fichier enregistre

## 11. Audit et trace

A minima :

- journaliser les mises a jour de profil utilisateur
- journaliser les actions de notifications mark-seen
- conserver la source actor_user_id

## 12. Exigences de test

## 12.1 Backend

Cas attendus :

- company_admin : GET profile OK
- company_admin : PATCH champs autorises OK
- company_admin : PATCH champs interdits KO 400
- company_admin : upload asset self-service OK

## 12.2 Frontend

Cas smoke attendus :

- rendu du mode admin (3 blocs)
- sauvegarde profil admin
- upload document admin
- affichage erreur API en cas de rejet

## 13. Criteres d acceptance produit

- separation des parcours comprise en moins de 5 secondes par un utilisateur test
- impossible pour company_admin de modifier ses champs paie self-service
- aucun impact regressif sur le profil employe self-service
- couverture de tests backend et frontend executee en CI locale

## 14. Risques et mitigations

Risque : confusion persistante entre profil admin et profil entreprise
Mitigation : libelles explicites + lien direct + wording harmonise docs et ecrans

Risque : regression employe
Mitigation : garder logique employee intacte et couvrir par smoke tests existants

Risque : incoherence RBAC
Mitigation : validation backend source de verite, frontend en defense additionnelle
