# NAVIGATION PUBLIQUE PERSISTANTE + PROMOTION CANDIDAT → EMPLOYÉ

**Périmètre :** deux mécanismes critiques de l'écosystème T-ERP qui n'avaient
pas encore été traités explicitement.

1. **NAV-1** — Tout utilisateur connecté (employé ou candidat) peut revenir
   à la zone publique sans perdre sa session.
2. **PROMO-1** — Quand un candidat est embauché, son compte est **promu en
   compte employé** avec ses données préservées et ses nouvelles habilitations
   créées automatiquement.

---

## 🟪 PROMPT NAV-1 — NAVIGATION PUBLIQUE PERSISTANTE

### Préambule fonctionnel

Aujourd'hui, T-ERP a 3 zones publiques :
- **Landing T-ERP** (terp.cm) — marketing produit, accessible à tous
- **Portail recrutement** ({tenant}.cm/recrutement) — emploi par tenant
- **Détail offre** ({tenant}.cm/recrutement/[slug]) — fiche poste publique

Et 14 espaces privés (13 profils internes + 1 espace candidat).

Aujourd'hui, **la navigation entre privé et public déconnecte l'utilisateur**.
Si Albert (DG) clique sur la landing pour la consulter, il doit se reconnecter
en revenant. C'est cassant.

**Objectif** : permettre à tout utilisateur connecté de naviguer librement
vers les zones publiques **sans perdre sa session JWT**.

### Cas d'usage métier

```
Albert (DG BatimCAM)
├── Veut voir comment sa landing terp.cm apparaît aux prospects
├── Veut voir son portail recrutement batimcam.cm/recrutement
└── Doit pouvoir revenir à son espace DG en 1 clic

Sandrine (RH BatimCAM)
├── Vient de publier une offre "Conducteur Sénior"
├── Veut vérifier qu'elle apparaît bien sur batimcam.cm/recrutement
└── Veut tester l'expérience candidat pour la rendre meilleure

François (ouvrier BatimCAM)
├── Voit un poste "Chef de Chantier Bonabéri" qui pourrait intéresser son cousin
├── Partage le lien WhatsApp depuis son espace mobile
└── Ne doit pas se déconnecter pour cela

Jean (candidat BatimCAM)
├── Consulte ses 3 candidatures en cours
├── Veut découvrir d'autres entreprises BTP via la landing T-ERP
└── Revient à son espace candidat pour faire sa prochaine candidature

Étienne (IT BatimCAM)
├── Vient de changer le logo et les couleurs du tenant
├── Veut vérifier que le branding apparaît bien sur le portail recrutement
└── Revient pour ajuster
```

### Spécifications techniques

```
Phase de développement de la navigation publique persistante.

CONTEXTE
========
- 3 zones publiques :
  · screen-landing (terp.cm) — landing marketing T-ERP
  · screen-portal-batimcam ({tenant}/recrutement) — emploi tenant
  · screen-job-detail ({tenant}/recrutement/[slug]) — fiche offre
- 14 espaces privés (13 profils internes + espace candidat)
- JWT actuel : duration 8h, refresh token 7j
- Middleware actuel : redirige vers /login si pas de JWT pour les routes /app/*

OBJECTIF
========
Tout utilisateur connecté peut naviguer vers les zones publiques sans
perdre sa session. Au retour, accès direct à son espace.

ARCHITECTURE DE SESSION
========================

**Type 1 — Session "employee"** :
- JWT avec { sub: userId, tenantId, role, type: "employee" }
- Tous les endpoints /api/{profile}/* exigent ce type
- Persiste pendant la navigation publique

**Type 2 — Session "candidate"** :
- JWT avec { sub: candidateId, tenantId, type: "candidate" }
- Endpoints /api/cand/* exigent ce type
- Persiste pendant la navigation publique

**Type 3 — Session "guest"** (aucune session)
- Pas de JWT ou JWT expiré
- Accès uniquement aux zones publiques

LOGIQUE DE ROUTAGE
===================

Pour les zones publiques :
```
GET /                                    # Landing T-ERP
├── Toujours accessible (employee, candidate, guest)
├── Si employee : affiche bandeau "Retour à mon espace [profil]"
├── Si candidate : affiche bandeau "Retour à mon espace candidat"
└── Si guest : pas de bandeau, juste Connexion + Démo

GET /{tenant}/recrutement                # Portail recrutement
├── Si employee de CE tenant : bandeau "Retour à mon espace [profil]"
├── Si employee d'un AUTRE tenant : bandeau "Retour à mon espace [tenant]"
├── Si candidate de CE tenant : bandeau "Espace candidat"
├── Si candidate d'un AUTRE tenant : bandeau neutre
└── Si guest : bandeau Connexion + Candidature spontanée

GET /{tenant}/recrutement/[slug]         # Détail offre
└── Idem portail
```

NAVIGATION INVERSE (privé → public)
=====================================

Sidebar de chaque profil interne (DG, DAF, RH, etc.) :
- Nouvelle section "Espace public" en bas de sidebar
- 2 entrées :
  · "Landing T-ERP" → /
  · "Portail recrutement {tenant}" → /{tenant}/recrutement

Sidebar candidat :
- Section déjà présente "Public" avec "Toutes les offres"
- Ajouter : "Landing T-ERP" → /

Ouverture en **nouvel onglet** par défaut (target="_blank") :
- Préserve l'espace privé en background
- Sécurité rel="noopener" pour pas exposer l'opener

Alternative : navigation in-place avec bouton "← Retour" sticky en haut
de la zone publique. À choisir selon UX :
- Mobile : in-place (un seul onglet possible sur smartphone)
- Desktop : nouvel onglet (multi-tâches naturel)

BANDEAU "RETOUR À MON ESPACE"
==============================

Sur les écrans publics, si user connecté, ajouter en haut juste sous
la nav publique :

```html
<div class="auth-banner" style="background:#FAF5FF;border-bottom:1px solid var(--line);
     padding:10px 24px;font-size:13px">
  <div style="max-width:1280px;margin:0 auto;display:flex;align-items:center;
       gap:12px;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="av av-1" style="width:32px;height:32px;font-size:11px">AD</div>
      <span>Connecté en tant que <strong>Albert DAAYANG</strong> · DG BatimCAM</span>
    </div>
    <button onclick="go('screen-dg-dashboard')" class="btn btn-primary btn-sm">
      ← Retour à mon espace DG
    </button>
  </div>
</div>
```

Couleur de fond et label adaptés au type :
- Employee → fond #FAF5FF violet pâle + libellé profil
- Candidate → fond #F0FDF4 vert pâle + "Mon espace candidat"
- Guest → pas de bandeau

LOGIQUE TECHNIQUE
==================

1. **Middleware Next.js** (`src/middleware.ts`) :
```typescript
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = path === '/' ||
                   path.match(/\/[^/]+\/recrutement(\/|$)/);

  if (isPublic) {
    // Sur zone publique, on lit le JWT mais on ne bloque jamais
    const session = await getOptionalSession(request);
    // Propager dans header pour le client
    if (session) {
      request.headers.set('x-session-type', session.type);
      request.headers.set('x-session-user', JSON.stringify({
        id: session.sub,
        name: session.name,
        role: session.role,
        tenantId: session.tenantId,
        tenantName: session.tenantName
      }));
    }
    return NextResponse.next();
  }

  // Routes privées (espaces internes) : auth obligatoire
  const session = await getRequiredSession(request);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
```

2. **Hook côté client** (`useSession()`) :
```typescript
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(setSession);
  }, []);
  return session;
}
```

3. **Composant AuthBanner** (`src/components/public/AuthBanner.tsx`) :
```tsx
export function AuthBanner() {
  const session = useSession();
  if (!session) return null;

  const homeRoute = session.type === 'employee'
    ? getHomeRouteForRole(session.role)  // /dg, /daf, /rh...
    : '/cand/dashboard';

  const label = session.type === 'employee'
    ? `${session.name} · ${labelForRole(session.role)} ${session.tenantName}`
    : `${session.name} · Espace candidat`;

  return (
    <div className="auth-banner">
      <span>Connecté en tant que <strong>{session.name}</strong></span>
      <Link href={homeRoute} className="btn btn-primary btn-sm">
        ← Retour à mon espace
      </Link>
    </div>
  );
}
```

4. **API Session** (`src/app/api/session/route.ts`) :
```typescript
export async function GET(request: Request) {
  const session = await getOptionalSession(request);
  if (!session) return Response.json(null);
  return Response.json({
    type: session.type,
    name: session.name,
    role: session.role,
    tenantId: session.tenantId,
    tenantName: await getTenantName(session.tenantId)
  });
}
```

CAS PARTICULIERS
=================

**Cas A — Employee BatimCAM visite portail Constructions Mvog-Mbi** :
- François NDONGO (BatimCAM) visite mvog-mbi.cm/recrutement
- Le bandeau dit "Connecté en tant que François NDONGO · Chef équipe BatimCAM"
- Bouton "← Retour à mon espace BatimCAM"
- Mais si François veut postuler chez Mvog-Mbi, le formulaire de candidature
  lui propose : "Vous êtes déjà connecté en tant que François NDONGO chez
  BatimCAM. Voulez-vous postuler avec un nouveau compte candidat Mvog-Mbi ?"
- Sécurité : François a le droit de postuler ailleurs sans que BatimCAM le sache
- Si oui → ouverture du formulaire de création compte candidat Mvog-Mbi
  avec données pré-remplies (nom, email) mais SANS sauvegarde du fait que
  c'est lié à son compte employé BatimCAM
- Aucun lien établi côté BDD entre Employee BatimCAM et Candidate Mvog-Mbi

**Cas B — Candidate qui consulte la landing** :
- Jean NGONGO (candidat BatimCAM) clique "Landing T-ERP" dans sa sidebar
- Bandeau : "Connecté en tant que Jean NGONGO · Espace candidat BatimCAM"
- Voit les 13 profils métier, les tarifs, etc. (info marketing)
- Retour direct à son espace candidat

**Cas C — Employee qui se déconnecte depuis la zone publique** :
- Si l'utilisateur explicite "Se déconnecter" depuis le bandeau, on supprime
  le JWT et le bandeau disparaît
- Page reste affichée sans rechargement
- Bouton "Se connecter" réapparaît dans le header public

SÉCURITÉ
=========

- Token CSRF sur toutes les actions (candidature, formulaire démo)
- Rate limit sur formulaires publics (5 / IP / heure)
- Validation Captcha si suspect (multiple submissions same IP)
- Logs d'accès aux URLs publiques avec session_type pour analytics

ANALYTICS
==========

Tracker dans une table `PublicNavigationLog` :
- Quels employees visitent leur propre portail recrutement (= signal RH)
- Quels candidates retournent à la landing (= intérêt produit)
- Quels guests deviennent leads (formulaire démo)

```prisma
model PublicNavigationLog {
  id            String   @id @default(cuid())
  visitedAt     DateTime @default(now())
  path          String   // "/", "/batimcam/recrutement", etc.
  sessionType   String?  // "employee", "candidate", "guest"
  userId        String?
  tenantId      String?
  userAgent     String?
  referer       String?
  @@index([visitedAt, path])
  @@index([sessionType, visitedAt])
}
```

LIVRABLES
==========
- Middleware Next.js distinguant routes publiques / privées
- Endpoint /api/session retournant session optionnelle
- Hook useSession() pour composants
- Composant AuthBanner sur les 3 écrans publics
- Sidebar de chaque profil enrichie avec section "Espace public"
- Sidebar candidat enrichie avec "Landing T-ERP"
- Sécurité : rel="noopener" + CSRF + rate limit
- Analytics : PublicNavigationLog
- Tests E2E :
  · Albert se connecte → clique Landing → bandeau visible → retour OK
  · Jean candidat → clique Landing → bandeau vert → retour à son espace
  · François visite mvog-mbi.cm/recrutement → bandeau BatimCAM →
    propose nouveau compte candidat Mvog-Mbi
  · Guest formulaire démo → soumission → email envoyé sales@terp.cm
- Audit responsive 7/7 OK (bandeau s'adapte mobile)
- Commit "feat(nav): navigation publique persistante + AuthBanner + analytics"
```

---

## 🟪 PROMPT PROMO-1 — PROMOTION CANDIDAT → EMPLOYÉ

### Préambule fonctionnel

Jean NGONGO a postulé chez BatimCAM en avril 2026 pour le poste de Conducteur
de Travaux Sénior. Après le pipeline (Reçue → Présélection → Entretien →
Test pratique → Offre), il est embauché. À ce moment :

- Son **compte candidat** doit être **archivé proprement** (préservation
  historique RH pour conformité légale Cameroun)
- Un **compte employé** doit être **créé automatiquement** avec :
  · Reprise des données personnelles (nom, email, photo, téléphone)
  · Reprise des données pro (expériences, formations, compétences, langues)
  · Création des **nouvelles habilitations** selon le rôle attribué (ici
    CONDUCTOR_OF_WORKS)
  · Création des **objets métiers vides** (PaySlip vide pour mois d'embauche,
    LeaveBalance 30j, TimeReport...)
  · Génération du **matricule** (BTC-2026-NNN selon numérotation)
  · Demande de **données complémentaires** (CNI, RIB, CNPS, adresse, urgence)
  · **Notification de bienvenue** (email + WhatsApp)
- Au prochain login, Jean utilise ses **anciens identifiants candidat** mais
  arrive dans son **espace employé** Conducteur de Travaux

### Workflow métier détaillé

```
JOUR -7 : Sandrine RH transitionne l'application en status OFFER
├── Jean reçoit notification "Offre d'embauche acceptée"
├── Email avec PDF de promesse d'embauche
└── Jean signe (signature électronique ou physique)

JOUR -3 : Sandrine déclenche le workflow "Convert to Employee"
├── Sandrine choisit le rôle final : CONDUCTOR_OF_WORKS
├── Sandrine choisit le chantier d'affectation : Pont Mfoundi
├── Sandrine choisit le manager hiérarchique : Paul ETOUNDI (DTrav)
├── Sandrine choisit la date d'embauche : J0 (3 jours plus tard)
└── Sandrine choisit le contrat : CDI catégorie 14 · 1 050 K FCFA

JOUR -3 → J0 : Préparation système (asynchrone)
├── Jean reçoit email "Préparez votre arrivée chez BatimCAM"
├── Formulaire à compléter en ligne :
│   · CNI (numéro + scan)
│   · RIB (Afriland First Bank avec scan attestation)
│   · CNPS (numéro CNPS existant ou demande nouvelle affiliation)
│   · Adresse de résidence (avec quittance)
│   · Personne à contacter en cas d'urgence
│   · Photo professionnelle haute résolution
│   · Diplômes/certifications scannés
└── Sandrine vérifie chaque jour la complétude

JOUR 0 (date d'embauche)
├── Trigger automatique : conversion candidate → employee
├── 1. Archivage du Candidate :
│   · candidate.status = HIRED
│   · candidate.hiredAt = now()
│   · candidate.hiredAsUserId = newUser.id (lien vers nouvel employé)
│   · CandidateApplication → status HIRED
│   · Toutes autres CandidateApplication actives de Jean → status WITHDRAWN
│     (avec note "Embauché par BatimCAM le 09/05/2026")
├── 2. Création User employé :
│   · email, name copié du candidate (sauf si email pro fourni)
│   · matricule auto-généré (BTC-2026-NNN avec compteur)
│   · role = CONDUCTOR_OF_WORKS
│   · assignedSiteIds = [siteIdPontMfoundi]
│   · managerId = paulEtoundiId (DTrav)
│   · status = ACTIVE
│   · passwordHash copié depuis candidate (Jean continue avec son MDP)
├── 3. Liaison historique :
│   · ProfilePromotionLog créé pour traçabilité
│   · user.candidateOriginId = jeanCandidateId
├── 4. Reprise des données qualitatives :
│   · CandidateExperience → UserExperience (table à créer)
│   · CandidateFormation → UserFormation
│   · skills → user.skills
│   · languages → user.languages
│   · photoUrl → user.avatarUrl
├── 5. Création objets métiers vides :
│   · LeaveBalance pour l'année courante (30 j paid leave, prorata si embauche
│     en cours d'année)
│   · LeaveBalance pour l'année suivante (30 j si embauche avant juillet)
│   · UserSession vide (sera créée au premier login)
│   · Pas de PaySlip (sera créé en fin de mois par RH)
├── 6. Création des comptes externes (côté intégrations) :
│   · CNPS : déclaration nouvelle affiliation (DIPE)
│   · DGI : NIU vérifié ou créé
│   · Banque : RIB déclaré
├── 7. Notifications :
│   · Email Jean : "Bienvenue dans l'équipe BatimCAM" avec lien premier login
│   · WhatsApp Jean : message court avec instructions
│   · Email Paul ETOUNDI (manager) : "Jean NGONGO rejoint votre équipe le 09/05"
│   · Email Sandrine (RH) : récapitulatif création
│   · Notification dashboard DG (informative)
└── 8. AuditLog :
    · Action "CANDIDATE_PROMOTED_TO_EMPLOYEE"
    · Détails : candidateId, newUserId, role, siteId, manager
    · Acteur : Sandrine (validateur RH)

JOUR 0 (Jean se connecte pour la 1ère fois)
├── Login avec email + ancien MDP candidat → succès
├── Détection automatique : type=employee (plus candidate)
├── Wizard d'accueil 3 étapes :
│   · Étape 1 : "Bienvenue chez BatimCAM ! Vérifiez vos infos personnelles"
│   · Étape 2 : "Configuration MFA obligatoire" (CONDUCTOR_OF_WORKS = sensible)
│   · Étape 3 : "Découvrez votre espace conducteur" (tour guidé 5 écrans)
└── Arrivée sur dashboard CONDUCTOR_OF_WORKS

JOUR 0+ : Vie normale d'employé
├── Jean voit son chantier Pont Mfoundi
├── Première paie en fin de mois (prorata si embauche en cours)
├── 30 jours de congés acquis disponibles
└── Accès complet à son profil avec historique candidat conservé en lecture
```

### Spécifications techniques

```
Phase de développement du workflow Promotion Candidat → Employé.

CONTEXTE
========
- Models existants : Candidate, CandidateApplication, Interview, JobMatch
- Models à compléter : User (étendu pour réception données candidat)
- Endpoint déclencheur : POST /api/rh/applications/:id/promote-to-employee
- Profil acteur : RH (Sandrine ONANA), validation finale DG (Albert)

ARCHITECTURE
============

**Nouveaux models Prisma** :

```prisma
model ProfilePromotionLog {
  id            String   @id @default(cuid())
  tenantId      String
  // Liens
  candidateId   String
  candidate     Candidate @relation(fields: [candidateId], references: [id])
  applicationId String
  application   CandidateApplication @relation(fields: [applicationId], references: [id])
  newUserId     String   @unique
  newUser       User     @relation("PromotedFrom", fields: [newUserId], references: [id])
  // Métadonnées
  promotedRole  Role
  promotedSiteIds String[]
  promotedManagerId String?
  promotedSalary BigInt
  promotedContractType String
  hireDate      DateTime
  // Auditeur
  promotedBy    String   // userId Sandrine RH
  promotedByName String
  validatedBy   String?  // userId Albert DG (validation finale)
  promotedAt    DateTime @default(now())
  notes         String?  @db.Text
}

model UserExperience {
  // Reprise du model CandidateExperience pour les employés
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  position      String
  company       String
  location      String?
  startDate     DateTime
  endDate       DateTime?
  isCurrent     Boolean  @default(false)
  description   String?  @db.Text
  importedFromCandidate Boolean @default(false)
  order         Int      @default(0)
}

model UserFormation {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  diploma       String
  institution   String
  year          Int
  importedFromCandidate Boolean @default(false)
  order         Int      @default(0)
}

// Extension User
model User {
  // ... champs existants
  candidateOriginId String?  // ID Candidate avant promotion
  candidateOrigin   Candidate? @relation("PromotedTo", fields: [candidateOriginId], references: [id])
  promotionLog      ProfilePromotionLog? @relation("PromotedFrom")
  experiences       UserExperience[]
  formations        UserFormation[]
  skills            String[]
  languages         Json     // [{ name, level }]
  matricule         String?  @unique
}

// Extension Candidate
model Candidate {
  // ... champs existants
  hiredAt           DateTime?
  hiredAsUserId     String?  @unique
  hiredAsUser       User?    @relation("PromotedTo")
  promotionLog      ProfilePromotionLog?
  status            CandidateStatus  // ACTIVE, INACTIVE, BLOCKED, HIRED
}
```

**Endpoint POST /api/rh/applications/:id/promote-to-employee** :

```typescript
export async function POST(request: Request, { params }) {
  const session = await getRequiredSession(request, { role: 'HR_MANAGER' });
  const body = await request.json();
  // Validation Zod
  const data = promoteToEmployeeSchema.parse(body);

  return await prisma.$transaction(async (tx) => {
    const application = await tx.candidateApplication.findUniqueOrThrow({
      where: { id: params.id },
      include: { candidate: { include: { experiences, formations } } }
    });

    // Vérifications
    if (application.status !== 'OFFER') {
      throw new ConflictError('Application doit être en status OFFER');
    }
    if (application.tenantId !== session.tenantId) {
      throw new ForbiddenError();
    }

    // 1. Génération matricule
    const matricule = await generateMatricule(session.tenantId, 'BTC');

    // 2. Créer User
    const newUser = await tx.user.create({
      data: {
        tenantId: session.tenantId,
        email: data.workEmail || application.candidate.email,
        passwordHash: application.candidate.passwordHash,
        firstName: application.candidate.firstName,
        lastName: application.candidate.lastName,
        phoneMobile: application.candidate.phoneMobile,
        avatarUrl: application.candidate.photoUrl,
        matricule,
        role: data.role,
        assignedSiteIds: data.assignedSiteIds,
        managerId: data.managerId,
        hireDate: data.hireDate,
        contractType: data.contractType,
        position: application.jobOffer?.title || data.position,
        baseSalary: data.baseSalary,
        status: 'ACTIVE',
        candidateOriginId: application.candidateId,
        skills: application.candidate.skills,
        languages: application.candidate.languages,
        // Reprise des champs candidat
        cniNumber: application.candidate.cniNumber,
        address: application.candidate.location,
        dateOfBirth: application.candidate.dateOfBirth,
      }
    });

    // 3. Reprise des expériences et formations
    await tx.userExperience.createMany({
      data: application.candidate.experiences.map(e => ({
        userId: newUser.id,
        position: e.position,
        company: e.company,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: e.isCurrent,
        description: e.description,
        importedFromCandidate: true,
        order: e.order,
      }))
    });

    await tx.userFormation.createMany({
      data: application.candidate.formations.map(f => ({
        userId: newUser.id,
        diploma: f.diploma,
        institution: f.institution,
        year: f.year,
        importedFromCandidate: true,
        order: f.order,
      }))
    });

    // 4. Création LeaveBalance prorata
    const year = data.hireDate.getFullYear();
    const monthsLeft = 12 - data.hireDate.getMonth();
    const proratedDays = Math.round((30 / 12) * monthsLeft * 10) / 10;
    await tx.leaveBalance.create({
      data: {
        userId: newUser.id,
        year,
        paidLeaveAcquired: proratedDays,
        paidLeaveRemaining: proratedDays,
      }
    });

    // 5. Archivage candidate + autres applications
    await tx.candidate.update({
      where: { id: application.candidateId },
      data: {
        status: 'HIRED',
        hiredAt: new Date(),
        hiredAsUserId: newUser.id,
      }
    });

    await tx.candidateApplication.update({
      where: { id: application.id },
      data: {
        status: 'HIRED',
        hiredAt: new Date(),
      }
    });

    // Retirer toutes les autres candidatures actives
    await tx.candidateApplication.updateMany({
      where: {
        candidateId: application.candidateId,
        status: { in: ['RECEIVED', 'PRESELECTION', 'INTERVIEW', 'PRACTICAL_TEST', 'OFFER'] },
        id: { not: application.id },
      },
      data: {
        status: 'WITHDRAWN',
        rejectionReason: `Embauché par BatimCAM le ${data.hireDate.toISOString()}`,
      }
    });

    // 6. Log de promotion
    const promotionLog = await tx.profilePromotionLog.create({
      data: {
        tenantId: session.tenantId,
        candidateId: application.candidateId,
        applicationId: application.id,
        newUserId: newUser.id,
        promotedRole: data.role,
        promotedSiteIds: data.assignedSiteIds,
        promotedManagerId: data.managerId,
        promotedSalary: data.baseSalary,
        promotedContractType: data.contractType,
        hireDate: data.hireDate,
        promotedBy: session.userId,
        promotedByName: session.userName,
        validatedBy: data.dgValidationRequired ? null : session.userId,
        notes: data.notes,
      }
    });

    // 7. Notifications asynchrones (queue)
    await enqueueNotification({
      type: 'EMPLOYEE_WELCOME',
      userId: newUser.id,
      channels: ['email', 'whatsapp'],
      template: 'employee_welcome',
      data: {
        firstName: newUser.firstName,
        tenantName: 'BatimCAM',
        hireDate: data.hireDate,
        firstLoginUrl: `/login?welcome=${newUser.id}`,
        managerName: 'Paul ETOUNDI',
        siteName: 'Pont Mfoundi',
      }
    });

    await enqueueNotification({
      type: 'MANAGER_NEW_REPORT',
      userId: data.managerId,
      channels: ['email'],
      template: 'new_team_member',
      data: { newEmployeeName: newUser.firstName + ' ' + newUser.lastName, hireDate: data.hireDate }
    });

    // 8. AuditLog
    await tx.auditLog.create({
      data: {
        tenantId: session.tenantId,
        action: 'CANDIDATE_PROMOTED_TO_EMPLOYEE',
        actorId: session.userId,
        targetType: 'User',
        targetId: newUser.id,
        details: {
          candidateId: application.candidateId,
          applicationId: application.id,
          role: data.role,
          siteIds: data.assignedSiteIds,
          managerId: data.managerId,
        },
      }
    });

    // 9. Webhooks externes (intégrations)
    await enqueueWebhook('cnps.new_affiliation', { userId: newUser.id });
    await enqueueWebhook('dgi.niu_verification', { userId: newUser.id });

    return { promotionLog, newUser };
  });
}
```

**UI Wizard côté RH** (`src/components/rh/applications/PromoteToEmployeeWizard.tsx`) :

Wizard 5 étapes avec validation à chaque étape :

```
Étape 1 — Récap candidat
├── Photo + nom + email + téléphone
├── Liste de ses 3 candidatures actives (la principale en focus)
├── Compétences et expériences résumées
└── Bouton "Suivant"

Étape 2 — Rôle et affectation
├── Choix Role (parmi 14 disponibles SAUF SUPER_ADMIN et IT_ADMIN)
│   ⚠️ Si role critique (DG, IT_ADMIN) → workflow DG required
├── Choix assignedSiteIds (multi-select si DTrav, single si CC/CondTrav/Magasinier)
├── Choix Manager hiérarchique (auto-rempli selon role + site)
└── Validation Zod

Étape 3 — Conditions contractuelles
├── Date d'embauche (calendrier)
├── Type contrat (CDI / CDD durée / Stage / Alternance)
├── Catégorie professionnelle (grille BTP avec barème)
├── Salaire base (suggestion auto selon fourchette de l'offre)
├── Prime ancienneté (calcul auto si ancienne expérience candidat)
└── Indemnité transport (forfait)

Étape 4 — Données complémentaires à demander
├── Liste des champs manquants (CNI, RIB, CNPS, adresse, etc.)
├── Génération email "Préparez votre arrivée" avec formulaire à compléter
├── Validation upload diplômes/certificats
└── Période grace 7 jours avant J0

Étape 5 — Récapitulatif + validation
├── Récap complet (candidat → employé avec délai et notifications prévues)
├── Si role critique : "Demande envoyée au DG pour validation"
├── Si role normal : "Création immédiate sans validation supplémentaire"
└── Bouton "Confirmer l'embauche" gradient violet
```

**Workflow validation DG** (si role critique) :

Si role parmi { DG, IT_ADMIN, ARCHIVIST, CFO } :
- L'embauche n'est pas exécutée immédiatement
- Création d'une `HiringValidationRequest` envoyée au DG (Albert)
- Albert reçoit notification dashboard + email
- Albert valide ou refuse avec justification
- Si validé → exécution du workflow + notifications

```prisma
model HiringValidationRequest {
  id              String   @id @default(cuid())
  tenantId        String
  applicationId   String
  application     CandidateApplication @relation(fields: [applicationId], references: [id])
  proposedRole    Role
  proposedSalary  BigInt
  proposedPayload Json     // tous les champs du wizard
  requestedBy     String   // userId Sandrine RH
  requestedAt     DateTime @default(now())
  status          ValidationStatus
  validatedBy     String?
  validatedAt     DateTime?
  rejectionReason String?
}
enum ValidationStatus { PENDING APPROVED REJECTED EXPIRED }
```

**Templates WhatsApp Business approuvés (3 nouveaux)** :

```
EMPLOYEE_WELCOME :
"Bienvenue chez {tenant}, {firstName} ! 🎉
Votre date de prise de fonction : {hireDate}
Manager : {managerName} · Chantier : {siteName}
Premier login : {firstLoginUrl}"

EMPLOYEE_HIRE_REMINDER :
"Bonjour {firstName}, demain c'est votre premier jour chez {tenant}.
Rendez-vous {time} à {address}. Apportez {documents}."

CANDIDATE_HIRED_OTHERS :
"Bonjour {firstName}, votre candidature {jobTitle} chez {tenant} est
maintenant clôturée car vous avez accepté un autre poste. Bonne continuation !"
```

**Email transactionnels** :

```
employee_welcome.html
Sujet : "Bienvenue chez BatimCAM, Jean !"

Bonjour Jean,

Félicitations pour votre embauche en tant que Conducteur de Travaux Sénior !
Voici les informations importantes pour votre arrivée le 9 mai 2026 :

- Chantier : Pont Mfoundi
- Manager : Paul ETOUNDI (DTrav)
- Email pro : jean.ngongo@batimcam.cm

Lors de votre premier login, vous serez guidé à travers un wizard d'accueil
pour finaliser votre profil et configurer votre authentification à 2 facteurs.

Cliquez ici pour activer votre compte : {firstLoginUrl}

À bientôt,
Sandrine ONANA · DRH BatimCAM
```

**Wizard premier login (côté employé Jean)** :

`src/app/(app)/welcome/page.tsx` (page spécifique premier login après promotion) :

```
Étape 1 — Welcome ! Confirmation infos personnelles
├── Photo (reprise du candidat)
├── Nom prénom (reprise)
├── Email pro (nouveau)
├── Téléphone (reprise)
├── Adresse (formulaire si manquant)
├── CNI (formulaire si manquant)
└── Si tout est rempli, action "Confirmer et continuer"

Étape 2 — Configuration MFA (obligatoire selon rôle)
├── Si role parmi { DG, DAF, DT, RH, IT, GED } → MFA OTP obligatoire
├── Si role parmi { CC, MAG, CondTrav, EMP } → MFA optionnel
├── Génération QR code Google Authenticator
└── Test du code 6 digits

Étape 3 — Tour guidé de votre espace (5 écrans)
├── "Voici votre dashboard"
├── "Vous gérez le chantier Pont Mfoundi"
├── "Voici votre équipe : 14 ouvriers via François NDONGO"
├── "Pointage automatique chaque matin par Jean KAMGA"
└── "Bonne prise de poste !"
```

CAS PARTICULIERS
=================

**Cas A — Candidat avec compétences validées vs à valider** :
Lors de la reprise des données candidat, certains champs sont
"trust on candidate" et d'autres nécessitent justification :
- Skills (chips) → repris tel quel
- Experience (texte libre) → repris tel quel
- Diplômes → repris MAIS Sandrine doit vérifier avec scans diplômes
- Certifications sécurité → repris MAIS doivent être validées par responsable HSE

**Cas B — Candidat sur plusieurs chantiers** :
Si Jean est embauché comme Conducteur de Travaux avec **2 chantiers** :
- Pont Mfoundi (principal)
- AEP Mbalmayo (secondaire)
- assignedSiteIds = [pontMfoundiId, mbalmayoId]
- Vue agrégée des deux chantiers dans son dashboard

**Cas C — Promotion en cas de stage → CDI** :
Stage 6 mois terminés, Sandrine veut transformer en CDI :
- Pas un cas candidate → employee mais EXTENSION de contrat
- Workflow simplifié : juste changement contractType + salary + role éventuel
- Pas de wizard complet, juste modal "Étendre le stage en CDI"

**Cas D — Données déjà existantes côté employé** :
Si l'email candidat existe déjà en tant qu'employé d'un autre tenant :
- Sandrine est alertée "Cet email existe déjà chez {autre_tenant}"
- Sandrine doit confirmer ou changer l'email
- Aucune fusion automatique entre tenants

CONTRAINTES LÉGALES CAMEROUN
==============================

- Conservation des données candidat 5 ans même après embauche (RGPD-like 2010/012)
- Archivage des données candidat dans la GED avec DUA 5 ans
- Notification CNPS dans les 8 jours après embauche
- Notification DGI dans le mois pour NIU
- Mention obligatoire dans le contrat : période d'essai 3 mois renouvelable
  une fois (convention BTP Cameroun)

LIVRABLES
==========
- 4 nouveaux/étendus models Prisma
- Endpoint POST /api/rh/applications/:id/promote-to-employee
- Service `promoteCandidateToEmployee()` transactionnel
- Wizard UI 5 étapes côté RH
- Workflow validation DG si role critique
- Page wizard premier login côté employé
- 3 templates WhatsApp + 3 templates email
- AuditLog complet
- Webhooks CNPS + DGI
- Tests E2E :
  · Jean promu Conducteur Travaux → premier login → wizard accueil →
    arrive sur dashboard CONDUCTOR_OF_WORKS
  · Tentative promotion vers role DG par Sandrine → workflow Albert →
    Albert valide → exécution
  · Promotion → ses autres candidatures actives passent en WITHDRAWN
  · Promotion → LeaveBalance 30 j prorata créée
  · Promotion → notification CNPS déclenchée
- Audit responsive 7/7 OK sur wizard RH
- Commit "feat(rh): promotion candidat → employé + workflow embauche complet"
```

---

## ✅ FIN — Navigation + Promotion complets

Tu viens de couvrir deux mécanismes essentiels :

**NAV-1** : navigation publique persistante (3 zones publiques + sidebar
enrichies + bandeau auth)

**PROMO-1** : promotion candidat → employé (workflow complet 5 étapes avec
reprise des données, création habilitations, notifications multicanal,
wizard premier login)

ARCHITECTURE GLOBALE FINALE
============================

```
USAGE LIBRE PUBLIQUE                    USAGE CONNECTÉ
├── Landing terp.cm                     ├── Espace candidat (5 fonctions)
├── Portail recrutement tenant          │   └── Promu en employé via PROMO-1
└── Détail offre                        └── 13 profils internes
        ↓                                   └── Accessible aux ex-candidats
   Navigation libre                          via leurs anciens identifiants
   préservant la session
```

ESTIMATION EFFORT
==================
- **NAV-1** Navigation publique : 2-3 jours (middleware + AuthBanner + sidebar
  updates + analytics)
- **PROMO-1** Promotion candidat : 4-5 jours (models + endpoint transactionnel
  + wizard 5 étapes + wizard premier login + templates notifications)
- **TOTAL : 6-8 jours**

INTERACTIONS AVEC AUTRES PROFILS
=================================
- **RH (Sandrine)** : déclenche la promotion via wizard
- **DG (Albert)** : valide les rôles critiques
- **IT (Étienne)** : ne crée plus de compte manuellement, le workflow s'en charge
- **Manager du nouveau** : reçoit notification "Nouveau membre dans votre équipe"
- **Comptable** : voit le nouveau salarié à payer en fin de mois
- **GED** : reçoit les documents candidats archivés (DUA 5 ans)
- **Tous profils** : peuvent désormais visiter la zone publique sans se déconnecter
