# Cahier des charges — Profil « Chargé des achats »

**Projet :** T-ERP (ERP BTP multi-tenant — Cameroun / OHADA)
**Rôle visé :** `PURCHASING_OFFICER` — Chargé des achats / Responsable Approvisionnements
**Version :** 1.0 · **Date :** 2026-05-24
**Statut :** À valider par la Direction avant implémentation

---

## 1. Contexte et objectif

L'entreprise réalise des marchés BTP avec un **volume d'achats important** (matériaux : ciment, acier, agrégats ; carburant ; location d'engins ; sous-traitance ; consommables). Aujourd'hui, les achats sont **initiés de façon dispersée** (chantiers, DT, DAF) et validés par le DAF puis le DG. Il manque un **acteur dédié** qui pilote tout le cycle « du besoin au paiement » (*procure-to-pay*) avec une vraie **maîtrise des coûts, des délais et des fournisseurs**.

**Objectif du profil :** centraliser et professionnaliser la fonction achats — consolider les besoins, mettre en concurrence les fournisseurs, émettre les bons de commande, suivre les livraisons et le rapprochement des factures, animer le panel fournisseurs — **sans jamais détenir le pouvoir de payer** (séparation des tâches / contrôle interne).

**Principe directeur :** *celui qui engage la dépense n'est pas celui qui la valide financièrement ni celui qui la paie.*

---

## 2. Positionnement (vs rôles existants)

| Rôle | Responsabilité achats |
|---|---|
| **Chargé des achats** (nouveau) | Pilote le cycle achat : sourcing, BC, suivi livraison, rapprochement, panel fournisseurs. **Engage** la commande dans la limite d'un seuil. |
| Chef de chantier / Conducteur | **Exprime le besoin** (demande de matériel / d'achat). |
| Directeur de travaux (DTrav) | **Valide N1** les achats chantier (besoin justifié). |
| DAF | **Valide N2** (engagement financier, budget, trésorerie). |
| DG | **Valide N3** au-delà d'un seuil (gros engagements). |
| Magasinier | **Réceptionne** physiquement (bon de réception). |
| Comptable | **Comptabilise** la facture fournisseur (rapprochement 3 voies). |
| Trésorerie / DAF | **Paie** le fournisseur. |
| Propriétaire / PCA | **Consulte** (lecture) et reçoit les indicateurs. |

---

## 3. Périmètre fonctionnel

L'espace **Achats** (`/achats`) du Chargé des achats couvre :

1. **Demandes d'achat** — réception et consolidation des besoins (chantiers + siège).
2. **Sourcing & mise en concurrence** — demandes de prix, comparatif d'offres.
3. **Bons de commande (BC)** — émission, envoi fournisseur, suivi du statut.
4. **Contrats-cadres** — négociation de conditions annuelles, suivi de l'enveloppe consommée.
5. **Réceptions** — suivi des livraisons (en lien avec le magasin).
6. **Factures fournisseurs** — rapprochement 3 voies (BC ↔ réception ↔ facture) **avant** comptabilisation.
7. **Panel fournisseurs** — fiche, notation, agréments, blocage.
8. **Pilotage** — tableau de bord achats (dépenses, délais, économies, litiges).

---

## 4. Habilitations détaillées (cœur du document)

### 4.1 Matrice d'accès aux modules (RBAC)

> Niveaux : **FULL** (lecture + écriture + actions) · **WRITE** (créer/modifier sans valider) · **READ** (lecture seule) · **NONE**.

| Module | Niveau | Justification |
|---|---|---|
| **ACHATS** (son espace) | **FULL** | Module propriétaire. |
| MAG (Magasin / Stocks) | **READ** | Voir stocks et réceptions, sans mouvementer. |
| CPT (Comptabilité) | **READ** | Voir l'état des factures fournisseurs, sans écriture. |
| DAF (Finance) | **READ** restreint | Voir budgets/engagements achats uniquement. |
| LOG (Logistique) | **READ** | Coordination location d'engins. |
| DTRAV / CDT / CC | **READ** | Comprendre les besoins chantier. |
| EMP (espace perso) | **OWN** | Son profil. |
| DG / RH / SG / IT / OUV | **NONE** | Hors périmètre. |

### 4.2 Habilitations par objet métier

| Objet | Créer | Modifier | Supprimer | Valider | Interdits |
|---|---|---|---|---|---|
| **Fournisseur** | ✅ | ✅ (fiche, conditions) | ❌ (désactiver seulement) | — | Modifier les coordonnées bancaires sans double contrôle |
| **Demande d'achat** | ✅ (siège) · reçoit celles des chantiers | ✅ (consolider, qualifier) | ✅ (refuser avec motif) | N0 (recevabilité) | Inventer un besoin pour un chantier sans demande |
| **Demande de prix / comparatif** | ✅ | ✅ | ✅ | — | — |
| **Bon de commande (BC)** | ✅ | ✅ tant que brouillon (`DRAFT`) | ❌ (annuler avec motif) | **Émet** ≤ seuil ; **soumet** au-delà | **Auto-valider** au-dessus de son seuil ; modifier un BC déjà approuvé |
| **Contrat-cadre** | ✅ (proposer) | ✅ (brouillon) | ❌ | ❌ — **validé par DAF/DG** | Signer/activer seul un contrat-cadre |
| **Réception** | — | — | — | **Constate** l'écart BC/livraison | Saisir la réception physique (rôle magasinier) |
| **Facture fournisseur** | — | rapprochement 3 voies | ❌ | **Propose** « bon à payer » | **Comptabiliser** ; **Payer** ; modifier le montant facturé |
| **Évaluation fournisseur** | ✅ | ✅ | ❌ | — | — |
| **Blocage fournisseur** | ✅ (proposer) | — | — | ❌ — **confirmé par DAF** | Bloquer/débloquer seul un fournisseur stratégique |

### 4.3 Seuils d'engagement (paramétrables par tenant)

| Montant du BC (FCFA, HT) | Circuit de validation |
|---|---|
| ≤ **2 000 000** | Émis directement par le Chargé des achats (`APPROVED`) |
| 2 000 001 – **10 000 000** | Chargé des achats → **DAF (N2)** |
| 10 000 001 – **50 000 000** | Chargé des achats → DAF → **DG (N3)** |
| > **50 000 000** | + visa **Propriétaire / PCA** (escalade gouvernance) |

*Les seuils sont des valeurs par défaut ; ils doivent être configurables (table de paramétrage par tenant).* Pour les **achats chantier**, une **validation N1 du DTrav** précède la validation financière (besoin justifié).

### 4.4 Séparation des tâches (contrôle interne — non négociable)

- Le Chargé des achats **engage** (BC) mais **ne paie pas** et **ne comptabilise pas**.
- Il **propose** le « bon à payer » après rapprochement 3 voies ; la **mise en paiement** reste DAF/Trésorerie.
- Il ne peut pas **créer un fournisseur ET émettre un gros BC vers ce fournisseur le même jour** sans contrôle (alerte anti-fraude).
- Toute modification de **RIB/coordonnées bancaires fournisseur** déclenche une **double validation** (DAF) et une notification.

---

## 5. Processus métier (procure-to-pay)

```
1. BESOIN        Chantier/Siège exprime une demande d'achat
                 → Chargé des achats reçoit, qualifie, consolide
2. SOURCING      Demande de prix à ≥ 2-3 fournisseurs (selon seuil)
                 → Comparatif (prix / délai / qualité) → choix motivé
3. ENGAGEMENT    Émission du Bon de Commande
                 → Validation selon seuil (DTrav N1 / DAF N2 / DG N3 / PCA)
4. RÉCEPTION     Livraison → Magasinier saisit le bon de réception
                 → Chargé des achats contrôle l'écart BC / livré
5. FACTURATION   Facture fournisseur reçue
                 → Rapprochement 3 voies : BC ↔ Réception ↔ Facture
                 → « Bon à payer » proposé (si concordance)
6. PAIEMENT      DAF / Trésorerie règle (hors périmètre achats)
7. ÉVALUATION    Notation périodique du fournisseur (qualité/délai/prix)
```

**Règle des 3 voies (3-way match) :** une facture n'est « bonne à payer » que si **BC validé + réception conforme + facture** concordent (montants, quantités). Tout écart > tolérance (ex. 2 %) ouvre un **litige** à traiter avant paiement.

---

## 6. Modèles de données concernés (existants à réutiliser)

| Modèle Prisma | Usage |
|---|---|
| `Supplier` | Panel fournisseurs (nom, catégorie, NIU, RCCM, notes, blocage). |
| `FrameworkContract` | Contrats-cadres (maxAmount, usedAmount, status). |
| `PurchaseOrder` (`PoStatus`) | Bons de commande + circuit `DRAFT→PENDING_DAF→PENDING_DG→APPROVED/REJECTED`. |
| `SupplierInvoice` (`InvoiceStatus`) | Factures fournisseurs + rapprochement. |
| `MaterialRequest` | Demandes de matériel chantier → source de besoin. |
| `SupplierEvaluation` | Notations fournisseurs. |
| `Validation` | Circuit de validation transverse (réutilisable pour les seuils). |
| `AuditLog` | Traçabilité de toutes les actions achats. |

**Évolutions de schéma à prévoir :**
- Nouveau rôle `PURCHASING_OFFICER` dans l'enum `Role` (+ entrée matrice RBAC, module `ACHATS`, route `/achats`).
- `PurchaseRequest` (demande d'achat consolidée) si l'on veut un objet distinct de `MaterialRequest`.
- `RfqRequest` / `RfqQuote` (demande de prix + offres) pour le comparatif fournisseurs.
- Champ `purchaseThresholds` paramétrable par tenant (Json) pour les seuils.
- `Supplier.bankAccount` (RIB) avec verrou double-validation.

---

## 7. Écrans de l'espace Achats (sidebar `/achats`)

**Pilotage**
- **Tableau de bord achats** — KPIs (dépenses du mois, BC en attente, litiges, économies réalisées).
- **Mon espace** — profil.

**Cycle achat**
- **Demandes d'achat** — file des besoins à traiter (chantiers + siège).
- **Demandes de prix / comparatifs** — sourcing et choix fournisseur.
- **Bons de commande** — liste + création + suivi statut + envoi PDF fournisseur.
- **Contrats-cadres** — enveloppes négociées + consommation.
- **Réceptions** — suivi des livraisons (lecture magasin) + contrôle écarts.
- **Factures fournisseurs** — rapprochement 3 voies + proposition « bon à payer ».

**Fournisseurs**
- **Panel fournisseurs** — fiches, notation, agréments, historique, blocage (proposition).

---

## 8. Tableau de bord & KPIs

- **Dépenses d'achat** : du mois, cumul annuel, par catégorie, par chantier.
- **Engagements en attente** : BC à valider (par niveau), montant bloqué.
- **Performance fournisseurs** : délai moyen de livraison, taux de conformité, top fournisseurs.
- **Économies** : écart prix négocié vs prix catalogue / budget.
- **Litiges** : factures en écart, BC non livrés en retard.
- **Contrats-cadres** : taux de consommation, échéances proches.

---

## 9. Sécurité, traçabilité, conformité

- **Audit complet** (`AuditLog`) : création/modif/annulation de BC, choix fournisseur, proposition bon à payer, modif RIB.
- **Séparation des tâches** appliquée techniquement (un même utilisateur ne peut pas franchir 2 étapes de contrôle d'un même BC).
- **Anti-fraude** : alertes sur création fournisseur + gros BC immédiat, BC fractionnés pour passer sous un seuil, modif RIB.
- **Conformité OHADA / fiscale** : NIU et RCCM obligatoires pour engager un fournisseur ; pièces justificatives attachées.
- **Multi-tenant** : périmètre strictement limité au tenant (et filiales si groupe).

---

## 10. Hors périmètre (interdictions explicites)

Le Chargé des achats **ne peut pas** :
- Mettre en paiement une facture (rôle DAF/Trésorerie).
- Comptabiliser une écriture (rôle Comptable).
- Auto-valider un BC au-dessus de son seuil.
- Modifier un BC déjà approuvé ou une facture déjà comptabilisée.
- Modifier seul le RIB d'un fournisseur.
- Accéder aux espaces RH, DG, SG, IT.

---

## 11. Intégrations

- **Magasin** : un BC validé alimente l'attente de réception ; la réception magasin déclenche le rapprochement.
- **Comptabilité** : le « bon à payer » alimente la file de comptabilisation ; la facture comptabilisée sort du périmètre achats.
- **Trésorerie / DAF** : les engagements (BC validés) impactent les prévisions de trésorerie.
- **Chantiers** : les demandes d'achat et BC sont rattachés à un chantier (analytique).
- **Propriétaire / PCA** : les indicateurs achats (dépenses, fournisseurs, dettes) remontent dans son cockpit.

---

## 12. Critères d'acceptation (pour l'implémentation)

1. Un Chargé des achats peut créer un fournisseur, émettre un BC ≤ seuil (statut `APPROVED`) et le voir dans la liste.
2. Un BC > seuil part en validation (DAF puis DG selon montant) et le Chargé des achats **ne peut pas** l'auto-valider.
3. Le rapprochement 3 voies bloque le « bon à payer » en cas d'écart > tolérance.
4. Le Chargé des achats **n'a aucun bouton** de paiement ni de comptabilisation.
5. Toutes les actions sont tracées dans `AuditLog`.
6. Le périmètre est limité au tenant ; les KPIs achats remontent au PCA en lecture.
7. Toutes les pages sont **responsives** (mobile-first) et les montants affichés **en chiffres complets** (charte T-ERP).

---

*Document de cadrage — à valider par la Direction (DG/DAF/PCA) avant développement. Les seuils, tolérances et étapes de validation sont paramétrables et doivent être confirmés par la Direction Financière.*
