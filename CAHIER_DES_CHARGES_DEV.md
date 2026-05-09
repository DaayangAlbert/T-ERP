# CAHIER DES CHARGES — T-ERP

**Version 3.0 — Cahier d'implémentation développeurs**
**Cible : MVP démontrable en 7 jours · Déployable en ligne**
**Auteur : Albert DAAYANG · Mai 2026**

---

## 📌 LIVRABLE DE RÉFÉRENCE

**`terp_prototype.html`** — prototype HTML interactif de 763 Ko contenant **41 écrans pixel-perfect** que les développeurs doivent reproduire fidèlement en React/Next.js. Ce fichier est la **source de vérité visuelle** : il prime sur toute description textuelle ce cahier en cas d'ambiguïté.

Comment l'utiliser :
- Ouvrir le fichier dans un navigateur — il fonctionne en local, sans serveur
- Naviguer entre les écrans via la sidebar et la modale "Changer profil"
- Pour reproduire un écran : ouvrir l'inspecteur (F12), copier la structure HTML, traduire en JSX en s'appuyant sur `tailwind.config.ts` pour la palette
- Le prototype contient **toutes les classes CSS nécessaires** (sidebar responsive, KPI, listview, donut, sparkline, animations) — les développeurs n'ont qu'à les transposer

Le prototype couvre :
- 12 profils internes (DG, DAF, SG, RH, Dir. tech, Dir. trav, Cond. trav, Chef chantier, Magasinier, Logisticien, GED, Informaticien)
- 4 profils spéciaux (portail public, candidat, super-admin SaaS, employé bureau, ouvrier mobile)
- 19 modules transverses (Pilotage, Validations, Rapports, Chantiers, Planning, Finances, Comptabilité, Saisie écriture, RH, RH&Paie, Recrutement, Achats, Stocks, Configuration, Sécurité, Mon profil, Ma paie, Bulletin officiel CNPS, États de salaire, GED, Messagerie)
- 4 écrans système (Pointage PWA hors-ligne, 404, hors-ligne, login)
- Charte complète : palette violet/magenta, typo Inter + IBM Plex Mono, responsive 4 breakpoints, animations

---

## 1. CONTEXTE ET OBJECTIF

T-ERP est une plateforme SaaS multi-tenant de gestion intégrée pour les entreprises du BTP au Cameroun. Le présent cahier est la spécification d'implémentation pour le MVP — il complète le cahier fonctionnel v2 et définit ce qui doit être codé, comment, et avec quelles technologies.

**Objectif MVP (7 jours) :** plateforme déployée en ligne, démontrable à des prospects, couvrant le portail public emploi, l'authentification multi-tenant, et 4 modules opérationnels en lecture (pilotage DG, chantiers, paie, messagerie). Les modules de saisie complète (paie, comptabilité) sont reportés en phase 2.

**Hors scope MVP :** calcul réel de la paie CNPS/IRPP, écritures comptables SYSCOHADA, signature électronique, mode hors-ligne PWA, BIM. Ces modules seront construits en phases 2 à 4 avec les premiers clients pilotes.

---

## 2. STACK TECHNIQUE RETENUE

Choix optimisé pour la **rapidité de développement**, le **coût d'hébergement** raisonnable au Cameroun, et la **maintenabilité long terme** par une équipe locale.

### 2.1 Backend

- **Framework :** Node.js 20 LTS + Express 4.x (API REST)
- **Base de données :** PostgreSQL 15 (multi-tenant par schema)
- **ORM :** Prisma 5 (schéma déclaratif, migrations auto, type-safety)
- **Authentification :** JWT (jsonwebtoken) + bcrypt
- **Validation :** Zod (schémas partagés front/back)
- **Stockage fichiers :** local (MVP) puis S3-compatible (Backblaze B2 ou Cloudflare R2 en prod)

**Pourquoi Node + Prisma plutôt que Django/Laravel :** TypeScript de bout en bout (front et back partagent les types), démarrage en 1h, écosystème npm massif, facile à recruter au Cameroun.

### 2.2 Frontend

- **Framework :** Next.js 14 (App Router) + TypeScript
- **UI :** Tailwind CSS 3 + composants custom basés sur le prototype HTML existant
- **State management :** Zustand (léger, pas de boilerplate Redux)
- **Requêtes API :** TanStack Query (React Query) v5
- **Formulaires :** React Hook Form + Zod
- **Graphiques :** Recharts (déjà compatible avec les SVG du prototype)

**Pourquoi Next.js :** SSR pour le portail emploi (SEO important pour les offres), App Router pour la structure modulaire, déploiement Vercel en 2 clics, communauté énorme.

### 2.3 Infrastructure

- **Hébergement application :** Railway.app ou Render.com (déploiement Git-based, gratuit/low-cost pour démarrer)
- **Base de données :** Neon.tech (PostgreSQL serverless, free tier généreux)
- **CDN/DNS :** Cloudflare (gratuit, performances bonnes en Afrique)
- **Email transactionnel :** Resend.com (3000 emails/mois gratuits, simple)
- **Monitoring :** Sentry (free tier) pour les erreurs, Better Stack pour uptime
- **Domaine :** terp.cm (à acheter, ~12 000 FCFA/an chez ANIC ou similaire)

**Coût mensuel MVP :** ~0 FCFA (tous les services en free tier au début), passage à environ 25 000 FCFA/mois (~40 USD) à 50 utilisateurs actifs.

### 2.4 Outils de développement

- **Éditeur :** VS Code + extensions Prisma, Tailwind IntelliSense, ESLint
- **Versionning :** Git + GitHub (repo privé)
- **CI/CD :** GitHub Actions (tests + déploiement auto sur push main)
- **Gestionnaire de paquets :** pnpm (rapide, économe en disque)
- **Format/Lint :** Prettier + ESLint (config par défaut Next.js)

---

## 3. ARCHITECTURE MULTI-TENANT

### 3.1 Modèle retenu : un schéma PostgreSQL par tenant

Chaque entreprise cliente (BatimCAM SA, Groupe NJOYA, etc.) a son propre schéma PostgreSQL dans une base unique. Avantages : isolation forte des données, sauvegardes individuelles possibles, performances stables, conformité plus simple. Inconvénient : migrations à propager sur N schémas (script automatisé géré par Prisma).

### 3.2 Identification du tenant

Trois mécanismes possibles, on retient le **sous-domaine** :
- `batimcam.terp.cm` → tenant BatimCAM
- `njoya.terp.cm` → tenant Groupe NJOYA
- `app.terp.cm` → portail public, page d'accueil

Le middleware Next.js extrait le sous-domaine de la requête, charge le tenant correspondant, et tous les appels API passent l'identifiant tenant dans un header `X-Tenant-Id`.

### 3.3 Schéma global (table `public`)

Une table partagée hors tenant pour gérer les inscriptions :
- `tenants` (id, slug, nom, plan, statut, date création)
- `tenant_admins` (les informaticiens d'entreprise avec droits admin)
- `subscriptions` (plan tarifaire, paiements)

---

## 4. MODÈLE DE DONNÉES MVP

Schéma simplifié pour le MVP. Les détails complets sont dans `prisma/schema.prisma` du projet.

### 4.1 Tables tenant principales

```
companies          (sociétés du tenant — multi-entité)
users              (employés et utilisateurs)
roles              (DG, DAF, RH, Chef chantier, etc.)
user_roles         (affectation N-N)
sites              (chantiers)
clients            (maîtres d'ouvrage)
employees          (employés détaillés avec matricule, CNPS, contribuable)
contracts          (CDI, CDD, journalier)
payslips           (bulletins de paie)
payslip_lines      (lignes A001-A072)
job_offers         (offres d'emploi publiées au portail)
candidates         (candidats au portail public)
applications       (candidatures à des offres)
messages           (messagerie interne)
conversations      (fils de messages)
documents          (GED métadonnées, fichier réel sur stockage)
notifications      (notifications utilisateur)
audit_logs         (audit trail toutes actions)
```

### 4.2 Tables différées en phase 2

```
journals, accounts, journal_entries, entry_lines  (comptabilité SYSCOHADA)
purchase_orders, purchase_order_lines             (achats)
inventory_items, stock_movements                  (stocks)
attendance, time_entries                          (pointage)
validations, validation_steps                     (workflows)
```

---

## 5. API REST — ENDPOINTS MVP

Format : `JSON` partout, authentification JWT en header `Authorization: Bearer <token>`.

### 5.1 Authentification (publique)

```
POST   /api/auth/register/candidate   Inscription candidat
POST   /api/auth/register/company     Inscription informaticien d'entreprise
POST   /api/auth/login                Connexion
POST   /api/auth/refresh              Rafraîchir le token
POST   /api/auth/logout               Déconnexion
GET    /api/auth/me                   Profil utilisateur courant
```

### 5.2 Tenant et profil

```
GET    /api/tenant                    Infos tenant courant
GET    /api/users/me                  Mon profil détaillé
PUT    /api/users/me                  Modifier mon profil
GET    /api/users/me/payslips         Mes bulletins
GET    /api/users/me/payslips/:id     Bulletin détaillé
```

### 5.3 Pilotage

```
GET    /api/dashboard/dg              KPIs et graphes du DG
GET    /api/dashboard/daf             KPIs DAF
GET    /api/dashboard/<role>          Dashboard par rôle
```

### 5.4 Chantiers

```
GET    /api/sites                     Liste paginée des chantiers
GET    /api/sites/:id                 Détail d'un chantier
POST   /api/sites                     Créer (droits requis)
PUT    /api/sites/:id                 Modifier
DELETE /api/sites/:id                 Archiver
```

### 5.5 Portail emploi (publique)

```
GET    /api/public/jobs               Liste offres publiées (multi-tenant agrégé)
GET    /api/public/jobs/:id           Détail offre
POST   /api/public/jobs/:id/apply     Postuler (avec auth candidat)
```

### 5.6 Messagerie

```
GET    /api/conversations             Mes conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
POST   /api/conversations             Créer une conversation
```

---

## 6. PROFILS ET PERMISSIONS

15 rôles définis, hérités du prototype. Au MVP, on implémente la matrice de permissions simplifiée :

| Rôle | Lecture | Écriture | Validation | Admin |
|------|---------|----------|------------|-------|
| DG | tout | tout | N3 | non |
| DAF | finance, paie, achats | finance, paie | N2 | non |
| Dir. technique | chantiers, RH, achats | chantiers | N2 chantier | non |
| Dir. travaux | son projet | son projet | non | non |
| Cond. travaux | ses chantiers | ses chantiers | non | non |
| Chef chantier | son chantier | pointage, BS | non | non |
| RH | personnel | personnel, paie | N1 RH | non |
| Comptable | comptabilité | écritures | non | non |
| Magasinier | stocks | stocks, BS, BR | non | non |
| Logisticien | logistique, achats | achats | non | non |
| GED | documents | documents | non | non |
| Employé | son espace | son profil | non | non |
| Ouvrier | son espace mobile | pointage perso | non | non |
| Candidat | offres publiques | sa candidature | non | non |
| Informaticien (admin tenant) | tout | tout | non | tenant |

Le **super-admin SaaS** (Anthropic-style) gère la plateforme entière (tenants, plans, support).

---

## 7. INTERFACES UTILISATEUR — IMPLÉMENTATION

Le **prototype HTML existant (terp_prototype.html, 41 écrans)** sert de référence pixel-perfect. Les développeurs front recodent chaque écran en composants React/Next.js en respectant strictement la charte (palette violet/magenta, typographie Inter + IBM Plex Mono, espacements, responsive 4 breakpoints).

### 7.1 Priorités MVP (semaine 1)

1. Layout global (sidebar + header + breadcrumbs + responsive)
2. Page portail public emploi
3. Modale auth (login + inscription candidat + inscription entreprise)
4. Tableau de bord DG (4 KPIs + 2 graphes + alertes)
5. Liste des chantiers
6. Mon profil (lecture + édition coordonnées)
7. Ma paie (historique bulletins en lecture)
8. Bulletin officiel format CNPS (PDF download via React-PDF)
9. Messagerie (style WhatsApp, vue desktop + mobile)
10. Modale changement de profil démo (12 boutons)

### 7.2 Reportés en phase 2 (semaines 2-4)

- Saisie écriture comptable, états de salaire générés
- Module recrutement avec pipeline kanban
- Validations workflow N1/N2/N3
- GED documentaire avec arborescence et upload
- Configuration tenant
- Pointage chantier PWA hors-ligne (IndexedDB + sync)

---

## 8. SPÉCIFICITÉS BTP CAMEROUN

### 8.1 Paie

Conforme **Code Général des Impôts** et **Code de Sécurité Sociale** camerounais. Les barèmes (IRPP, CNPS, CFC, FNE, RAV, TC, CAC, CFS) sont **paramétrables en base** (table `payroll_rates`) pour absorber les arrêtés annuels sans redéploiement.

Codes paie utilisés : A001 à A072 (cf. bulletin modèle existant). Le calcul réel sera codé en phase 2 avec un expert-comptable agréé OHADA. Au MVP, les bulletins existent en base avec montants pré-calculés.

### 8.2 Comptabilité

Plan comptable **SYSCOHADA révisé**. Comptes sur 6 chiffres (601100, 411001, 521101, etc.). Journaux : AC (achats), VT (ventes), BQ (banque), CA (caisse), OD (opérations diverses), SAL (salaires). Reportée en phase 2.

### 8.3 Multi-banques camerounaises

Intégrations bancaires prévues mais reportées : UBA Cameroun, BICEC, Afriland First Bank, Ecobank, SGBC. Au MVP, les ordres de virement sont générés en fichier texte standard.

### 8.4 Mobile money

Phase 3 : intégration MTN MoMo et Orange Money pour les paiements aux journaliers et petites avances. API publiques disponibles.

---

## 9. PLANNING DE DÉVELOPPEMENT MVP — 7 JOURS

| Jour | Livrable |
|------|----------|
| **J1** | Setup projet (Next.js + Prisma + DB), schéma de base, auth JWT, déploiement initial Railway |
| **J2** | Layout global (sidebar + header), portail public emploi, listing offres |
| **J3** | Modale auth (login + 2 flux d'inscription), tableau de bord DG complet |
| **J4** | Liste chantiers + détail, Mon profil (lecture/édition), Ma paie historique |
| **J5** | Bulletin officiel PDF (React-PDF avec template), messagerie temps quasi-réel |
| **J6** | Multi-tenant fonctionnel (sous-domaines), modale changement profil démo, finitions responsive |
| **J7** | Tests, corrections, déploiement production, configuration domaine terp.cm, démo prête |

---

## 10. CRITÈRES D'ACCEPTATION MVP

- L'application est accessible publiquement à `https://app.terp.cm`
- Le portail emploi affiche au moins 6 offres réelles
- Un visiteur peut s'inscrire en candidat ou en informaticien d'entreprise
- Un informaticien crée son tenant (sous-domaine attribué automatiquement)
- 12 profils démo sont accessibles via la modale (même tenant)
- Le tableau de bord DG charge en moins de 2 secondes
- Le bulletin de paie se télécharge en PDF conforme au modèle ENSAH SARL
- La messagerie échange des messages entre 2 sessions ouvertes
- L'application est utilisable sur mobile (375px) et desktop (1920px)
- Aucune erreur dans la console navigateur sur les écrans MVP
- Score Lighthouse Performance > 80 sur le portail public

---

## 11. PHASES POST-MVP

### Phase 2 — Semaines 2-4 — Modules métier

Saisie comptable SYSCOHADA, calcul paie réel CNPS/IRPP avec validation expert-comptable, module recrutement complet, GED documentaire, workflows de validation N1/N2/N3, configuration tenant.

### Phase 3 — Mois 2 — Production chantier

PWA mobile chef de chantier (pointage, photos, bons de sortie) avec mode hors-ligne IndexedDB, intégrations bancaires, mobile money, signature électronique eIDAS.

### Phase 4 — Mois 3+ — Avancé

États réglementaires DIPE/DSF générés, BIM intégré, IA pour OCR factures et tri CV, intégrations API DGI/CNPS quand elles deviendront disponibles.

---

## 12. ÉQUIPE MINIMALE POUR MVP

- **1 développeur full-stack senior** (TypeScript, Next.js, PostgreSQL) — 7 jours plein temps
- **Optionnel J5-J7 :** 1 développeur front junior pour finitions UI

Pour un freelance solo expérimenté, c'est tendu mais faisable. Pour un duo senior + junior, confortable.

---

## 13. RISQUES ET MITIGATION

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Sous-estimation du temps | élevée | élevé | Réduire le scope MVP (4 modules au lieu de 5) |
| Bug bloquant déploiement | moyenne | élevé | Déployer dès J1 et redéployer chaque jour |
| Performance multi-tenant | faible | moyen | Indexer correctement, monitoring Sentry |
| Conformité paie/compta non validée | certaine | moyen | Reporter explicitement en phase 2 avec expert |
| Adoption clients | moyenne | élevé | Démo aux 3 prospects identifiés dès J8 |

---

## 14. SÉCURITÉ MVP

- HTTPS obligatoire (Cloudflare ou Railway natif)
- Mots de passe hashés bcrypt (cost factor 12)
- JWT avec expiration 1h + refresh token 7 jours
- Validation Zod systématique sur tous les inputs
- Rate limiting (express-rate-limit) sur auth
- CORS strict (whitelist des sous-domaines tenant)
- Audit log toutes actions sensibles (modification paie, création utilisateur)
- Pas de données sensibles en clair dans les logs
- Sauvegardes automatiques quotidiennes Neon (incluses)

Conformité avancée (chiffrement at-rest, isolation réseau) traitée en phase 2.

---

## 15. ANNEXES

- **Annexe A** : `terp_prototype.html` — **prototype HTML interactif 41 écrans** (livré séparément, ouvrir dans navigateur). Source de vérité visuelle absolue.
- **Annexe B** : Modèle bulletin de paie ENSAH SARL (image fournie, reproduit dans le prototype écran `screen-payslip`)
- **Annexe C** : Charte graphique extraite du prototype — palette violet (`#A855F7`, `#7E22CE`, `#2A1B3D`), fonts Inter + IBM Plex Mono, espacements 4px grid
- **Annexe D** : Liste des 41 écrans du prototype avec priorité MVP/v2/v3 (cf. section 7.1 et 7.2)

---

*Fin du cahier des charges v3 — version implémentation*
