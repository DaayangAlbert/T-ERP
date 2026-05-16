# Prompts — décliner "Mon espace" à tous les modules T-ERP

## Contexte

T-ERP est un ERP BTP Cameroun multi-tenant (Next.js + Prisma + RBAC matriciel).
Chaque profil métier (DG, DAF, RH, DT, SG, DTrav, CdT, CC, CPT, LOG, MAG, GED, IT, OUV, EMP) doit disposer d'une page **"Mon espace"** sur le modèle des espaces déjà livrés (DT, DAF, DTRAV, CPT).

Cette page est l'écran personnel du titulaire du rôle : préférences, habilitations, mandats, agenda, messagerie, statut. Elle complète l'espace fonctionnel (tableau de bord du rôle) qui reste centré sur le métier.

**État actuel** (au 2026-05-16) :

| Module | Mon espace | Route |
|---|---|---|
| OUV | ✅ | `/ouv/profil` |
| EMP | ✅ | `/employe/profil` |
| DT | ✅ | `/direction-technique/profil` |
| DTRAV | ✅ | `/directeur-travaux/profil` |
| CPT | ✅ | `/comptable/profil` |
| DAF | ✅ | `/direction-financiere/profil` |
| **DG** | ❌ | `/direction-generale/profil` |
| **RH** | ❌ | `/ressources-humaines/profil` |
| **SG** | ❌ | `/secretaire-general/profil` |
| **CDT** | ❌ | `/conducteur-travaux/profil` |
| **CC** | ❌ | `/chef-chantier/profil` |
| **LOG** | ❌ | `/logistique/profil` |
| **MAG** | ❌ | `/magasin/profil` |
| **GED** | ❌ | `/gestion-documentaire/profil` |
| **IT** | ❌ | `/informatique/profil` |

## Pattern de référence

Lire avant tout :
- `src/app/(app)/[tenantSlug]/direction-technique/profil/page.tsx` (référence canonique, DT)
- `src/app/(app)/[tenantSlug]/direction-financiere/profil/page.tsx` (variante DAF avec composants extraits)

La page est un **Client Component** (`"use client"`) qui orchestre des sections en cartes Tailwind sur fond `bg-white border border-line rounded-xl`.

## Sections obligatoires (ordre)

Toutes les pages "Mon espace" comportent ces 6 sections dans cet ordre :

### 1. Header
```tsx
<header className="border-b border-line pb-3">
  <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
    Mon espace {LIBELLÉ_MODULE}
  </h1>
  <p className="mt-1 text-[12.5px] text-ink-3">
    {user ? `${user.firstName} ${user.lastName} · ` : ""}{SOUS_TITRE_METIER}
  </p>
</header>
```

### 2. Préférences alertes (carte gauche, lg:grid-cols-2)
Sliders + canal de notification (in-app / email / SMS / push).
Seuils spécifiques au métier (cf. tableau "Sections par module" plus bas).
Bouton **Enregistrer** appelle un endpoint `PATCH /api/<module>/profile` ou `/api/<module>/profile/alerts`.

### 3. Habilitations / Signature (carte droite, lg:grid-cols-2)
- Limites de signature seul / cosignée
- Liste des chantiers/équipes/dossiers dont l'user est Person In Charge
- Lien "Gérer mes délégations →" vers `/<module-route>/validations?tab=delegations`

### 4. Mandats actifs (full-width)
Si le module supporte des mandats (DAF, DG, SG, RH) : composant `ProxiesCard` adapté.
Sinon, omettre.

### 5. Agenda (full-width)
Événements métier à venir (J+0 à J+90) : échéances réglementaires, audits, jalons, comités.
Source : `GET /api/<module>/agenda` ou agrégation côté front.

### 6. Messagerie (full-width, grid sm:grid-cols-2)
Deux colonnes :
- **Groupes épinglés** : 3-5 entrées (ex. "Comité financier", "Cellule recouvrement")
- **Contacts externes** : 3-5 entrées (ex. "Inspecteur fiscal", "Auditeur CNPS")

### 7. Statut & avantages (full-width, optionnel selon cadre)
Pour les cadres (DG, DAF, RH, DT, SG, DTrav) : bonus performance, voiture de fonction, mutuelle.
Pour les opérationnels (CC, CDT, LOG, MAG) : prime de production, indemnités terrain.
Pour le IT (TENANT_ADMIN) : pas d'encart statut, à la place "Outils admin" (logs, SLA support, contrats SaaS).

## Sections par module

Pour chaque module à livrer, voici les contenus métier spécifiques à injecter :

### DG — Directeur Général
- **Alertes** : seuil trésorerie consolidée groupe, écart marge consolidée, dégradation note bancaire, alerte cash burn.
- **Signature** : autorisations CA / Président → tout au-delà de 50 M FCFA cosigné Président CA.
- **Mandats** : peut déléguer ponctuellement au DAF (ex: vacances).
- **Agenda** : CA, AG, RDV banque, RDV ministériel, audits, comités stratégiques.
- **Groupes** : Comité direction, CA, comité stratégique groupe, comité audit.
- **Contacts** : Président CA, commissaire aux comptes, conseillers stratégiques, ministres référents (BTP, Travaux publics).
- **Bonus** : intéressement % résultat net, voiture de fonction premium, chauffeur, plan retraite cadre.

### RH — Responsable RH
- **Alertes** : effectif vs budget, absentéisme, AT déclarés, contrats expirant J-30, formations CEPCI expirantes.
- **Signature** : contrats CDI / CDD, sanctions disciplinaires, licenciements (cosigné DG au-delà de cadre 8).
- **Mandats** : pas nécessaire (rôle exécutif).
- **Agenda** : visites médicales planifiées, audits inspection travail, commissions paritaires, AG délégués.
- **Groupes** : Comité paritaire CSE, cellule disciplinaire, médecine du travail, formation continue.
- **Contacts** : Inspection du travail, CNPS, médecin du travail, OFPPT (formation), avocat droit social.
- **Bonus** : zéro grève (prime), prime turnover < seuil, intéressement résultat.

### SG — Secrétaire Général
- **Alertes** : échéances renouvellement marchés J-30 / J-60 / J-90, garanties bancaires arrivant à terme, dossiers contentieux à provisionner.
- **Signature** : courriers institutionnels DG-adjoint, mémos confidentiels, conventions cadre.
- **Mandats** : sur courriers officiels (canManageOfficialCorrespondence), gouvernance corporate.
- **Agenda** : CA et AG (convocations), audits réglementaires, dépôts juridiques (greffe), AG actionnaires.
- **Groupes** : Cellule juridique, comité de gouvernance, cellule conformité, contentieux.
- **Contacts** : Notaire, avocat fiscaliste, avocat contentieux, huissier, greffe tribunal commerce.
- **Bonus** : zéro retard publication des comptes, zéro pénalité juridique, prime stabilité corporate.

### CDT — Conducteur Travaux
- **Alertes** : retard jalon J-5, écart consommation MO/matières > seuil, alerte météo (saison pluies), retard livraison fournisseur.
- **Signature** : bons de travaux internes, ordres de service sous-traitants, PV de réception travaux.
- **Agenda** : visites chantier programmées, rendez-vous MOA, contrôles bureau, échéances livraison.
- **Groupes** : Équipe conduite (CdT + chefs de chantier), bureau études, MOA, cellule sécurité chantier.
- **Contacts** : Maîtres d'ouvrage, contrôleurs bureau, bureau d'études, fournisseurs principaux.
- **Bonus** : respect des délais MOA, économie sur budget chantier, zéro AT grave.

### CC — Chef Chantier
- **Alertes** : effectif présent < seuil, absences > seuil, retard livraison matière, alerte HSE (causerie manquée), alerte météo.
- **Signature** : pointage journalier (NON cosigné — autonomie chantier), bons de matière < seuil.
- **Agenda** : causeries HSE planifiées, visites HSE, réceptions matériaux, jalons techniques.
- **Groupes** : Équipe chantier, conducteurs, sécurité, magasin chantier.
- **Contacts** : Chef équipe ouvriers, conducteur travaux, magasinier, HSE référent.
- **Bonus** : zéro AT grave, productivité (m² coulés / m³ excavés vs cible), respect planning.

### LOG — Logisticien
- **Alertes** : BC en attente DAF > seuil jours, dépassement budget chantier, retard livraison, stock magasin critique.
- **Signature** : BC < 5 M FCFA (autonome), au-delà cosigné DAF.
- **Mandats** : possibilité de déléguer suppléant pendant congés.
- **Agenda** : audits fournisseurs, renouvellements contrats cadre, livraisons critiques.
- **Groupes** : Cellule achats, cellule magasin (LOG + MAG), cellule appro chantiers.
- **Contacts** : Top 20 fournisseurs (ciment, fer, carburant), transporteurs, douanes.
- **Bonus** : économies achats vs budget, taux de service fournisseurs (livraisons à temps).

### MAG — Magasinier
- **Alertes** : stocks sous seuil minimum, écart inventaire > seuil, mouvements suspects, retours magasins multiples.
- **Signature** : bons de sortie chantier (autonome), inventaires partiels validés.
- **Agenda** : inventaires programmés (mensuel, annuel), audits stocks, jours de réception magasin.
- **Groupes** : Cellule magasin (warehouse + adjoints), réception matériaux, sécurité magasin.
- **Contacts** : Logisticien, conducteurs travaux, gardiens, fournisseurs principaux.
- **Bonus** : écart inventaire < seuil, taux de service interne (% sorties servies J+1).

### GED — Archiviste / Référent documentaire
- **Alertes** : documents non classifiés à traiter, fin de durée de rétention, demandes d'accès en attente, anomalies audit.
- **Signature** : PV de destruction (autonome), validations workflows documentaires.
- **Agenda** : audits documentaires, dates de purge programmées, dépôts archives légales.
- **Groupes** : Comité documentaire (GED + SG + IT), cellule conformité documentaire.
- **Contacts** : Inspection du travail (consultation), greffe tribunal, archivistes externes.
- **Bonus** : zéro perte de document légal, taux de classification (% docs classifiés vs total).

### IT — Tenant Admin / Informaticien d'entreprise
- **Alertes** : SLA support dépassé, alerte sécurité (login échec en masse), intégration en erreur, expiration licence.
- **Signature** : approbations RBAC promotions, modifications config tenant.
- **Agenda** : maintenance planifiée, audits sécurité, fenêtres déploiement, contrôles sauvegarde.
- **Groupes** : Cellule IT (IT + support N1 + dev), comité sécurité, cellule conformité RGPD.
- **Contacts** : Éditeur T-ERP (support N2/N3), opérateurs réseau, prestataires hébergement, RSSI groupe.
- **À la place du bonus** : section "Outils admin" → logs système, SLA support actuel, contrats SaaS en cours.

## Routes API attendues

Pour chaque module, créer si absent :

### Lecture (`GET /api/<module>/profile`)
Retourne :
```ts
{
  alertsConfig: { /* seuils spécifiques module */ },
  signaturePower: { soloLimit: string, coSignLimit: string, coSigners: string[] },
  personInCharge: Array<{ id, code, name }>, // chantiers/dossiers/zones
}
```

### Mise à jour (`PATCH /api/<module>/profile`)
Payload :
```ts
{ alertsConfig: { /* ... */ } }
```

### Agenda (`GET /api/<module>/agenda`)
Retourne :
```ts
{ events: Array<{ id, date: ISOString, type, title, details, critical: boolean }> }
```

**RBAC** : utiliser `guardModule(MODULES.X)` (lecture) et `guardModuleMutation(MODULES.X)` (PATCH) — déjà disponibles dans `src/lib/rbac/guard.ts`.

## Multi-tenant — IMPORTANT

- Tous les utilisateurs avec `role = X` sur n'importe quel tenant doivent accéder à leur Mon espace.
- L'accès est piloté par la **matrice** (`src/lib/rbac/access-matrix.ts`) : si `Role.X` a `FULL` sur `MODULES.X`, accès natif.
- Aucun check d'email/nom hardcodé. Les contenus métier (groupes, contacts) sont génériques (pas spécifiques à un tenant).
- Les **données personnelles** (signatures, mandats, agenda) sont stockées par `userId` (jamais par tenantSlug).

## Sidebar

Pour chaque module, ajouter en dernière position du `FULL[module].items` dans `src/lib/rbac/sidebar-sections.ts` :

```ts
{ label: "Mon espace {LIBELLÉ}", href: "/<module-route>/profil", icon: User },
```

## Critères d'acceptance

Avant de marquer une page Mon espace livrée :

1. `pnpm exec tsc --noEmit` passe sans erreur.
2. La page se charge sans 500 / 404 / hydration error.
3. Un utilisateur du rôle cible (ex: Marie NGONO, DAF) accède en édition (pas de bandeau READ).
4. Un utilisateur en drill-down READ (ex: DG sur DAF) accède en lecture seule (bandeau visible, boutons grisés).
5. Un utilisateur d'un rôle hors matrice (ex: WORKER tentant `/direction-financiere/profil`) reçoit un redirect vers `/dashboard`.
6. Le bouton "Enregistrer" persiste réellement (re-charger la page conserve la valeur).
7. Le lien "Gérer mes délégations →" fonctionne et atterrit sur l'onglet délégations du module.

## Briefing par module — template à coller dans un prompt agent

Pour générer un Mon espace d'un module donné, utiliser ce template (remplir les `{{...}}`) :

```
Tu travailles sur T-ERP. Crée la page "Mon espace {{LIBELLÉ_MODULE}}" à
src/app/(app)/[tenantSlug]/{{module-route}}/profil/page.tsx.

Suis le pattern de src/app/(app)/[tenantSlug]/direction-financiere/profil/page.tsx
(référence canonique).

Le profil cible :
- Rôle Prisma : Role.{{ROLE_PRISMA}}
- Module RBAC : MODULES.{{MODULE_KEY}}
- Persona : {{PERSONA_NAME}} ({{PERSONA_AGE}} ans, {{PERSONA_BG}})

Sections à inclure :
1. Header (titre + sous-titre métier)
2. Préférences alertes — seuils suivants :
   {{LISTE_SEUILS}}
   Canaux : in-app, email, SMS, push.
3. Habilitations signature — limites soloLimit / coSignLimit / coSigners.
4. {{SECTION_MANDATS_OU_OMETTRE}}
5. Agenda — événements de type {{TYPES_AGENDA}}.
6. Messagerie — groupes : {{LISTE_GROUPES}} ; contacts : {{LISTE_CONTACTS}}.
7. Statut & avantages — {{BONUS_DESCRIPTIF}}.

API à utiliser :
- GET /api/{{module-api}}/profile (créer si absent, suivre src/app/api/dt/profile/route.ts)
- PATCH /api/{{module-api}}/profile (guardModuleMutation(MODULES.{{MODULE_KEY}}))
- GET /api/{{module-api}}/agenda (optionnel — si absent, agenda en données locales)

Sidebar : ajouter l'entrée "Mon espace {{LIBELLÉ_COURT}}" en dernière position
du FULL[MODULES.{{MODULE_KEY}}].items dans src/lib/rbac/sidebar-sections.ts.

Critères d'acceptance : cf docs/PROMPTS_MON_ESPACE.md section "Critères d'acceptance".
```

## Estimation

- DG, RH, SG : 0,5 j chacun (cadres, sections riches, agenda chargé) → 1,5 j
- CDT, CC, LOG, MAG : 0,3 j chacun (opérationnels, agenda et bonus plus simples) → 1,2 j
- GED, IT : 0,4 j chacun (variantes pour le IT sans bonus) → 0,8 j

**Total estimé** : ~3,5 jours pour boucler les 9 modules restants.
