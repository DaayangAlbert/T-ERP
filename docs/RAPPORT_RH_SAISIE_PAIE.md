# Rapport - Saisie de paie RH

Date d'analyse : 2026-05-13  
Perimetre : espace RH, route `/rh/paie`, cycle de paie, saisie des variables, preparation de l'etat de salaire et generation des bulletins.

## 1. Resume executif

La partie "Saisie de paie" de l'espace RH est deja active comme module de saisie des variables mensuelles. Elle permet de :

- afficher le cycle de paie courant ;
- visualiser un workflow paie en 6 etapes ;
- saisir des jours travailles, heures supplementaires et une prime mensuelle ;
- auto-sauvegarder les lignes dans `PayrollInput` ;
- lancer un calcul de paie ;
- effectuer une validation RH N1.

Mais le module ne genere pas encore de vrais bulletins de paie a partir des saisies. Le bouton "Lancer calcul paie" change seulement le statut du cycle a `CALCULATED`. Il ne cree pas de lignes `Payslip`, ne calcule pas les cotisations, ne met pas a jour les totaux du cycle et ne produit pas un etat de salaire detaille.

Il existe toutefois des briques utiles deja en place :

- modele `Payslip` + `PayslipLine` ;
- composant PDF de bulletin `PayslipPDF` ;
- route PDF d'un bulletin existant ;
- route DAF d'etat de paie PDF synthetique ;
- page DAF pour validation N2 et actions "Etat complet", "Ordre de virement", "DIPE CNPS", "Etat IRPP".

Le futur prototype d'etat de salaire et de generation des bulletins doit donc s'integrer entre la saisie RH et le workflow DAF/DG.

## 2. Fichiers et routes actuels

### Interface RH

- Page principale : `src/app/(app)/rh/paie/page.tsx`
- Hook client : `src/hooks/useRhPayrollInput.ts`
- Composants :
  - `src/components/rh/payroll-input/PayrollWorkflowBar.tsx`
  - `src/components/rh/payroll-input/PayrollInputKpis.tsx`
  - `src/components/rh/payroll-input/PayrollInputTable.tsx`

### API RH paie

- `GET /api/rh/payroll/current-cycle`
  - Fichier : `src/app/api/rh/payroll/current-cycle/route.ts`
  - Charge le cycle courant ou le dernier cycle existant.
  - Cree un cycle `DRAFT` si aucun cycle n'existe.

- `GET /api/rh/payroll/cycles/:id/inputs?category=&search=`
  - Fichier : `src/app/api/rh/payroll/cycles/[id]/inputs/route.ts`
  - Retourne les lignes de saisie depuis un pool synthetique de 487 personnes.
  - Fusionne les valeurs deja sauvegardees dans `PayrollInput`.

- `PATCH /api/rh/payroll/cycles/:id/inputs/:employeeKey`
  - Fichier : `src/app/api/rh/payroll/cycles/[id]/inputs/[employeeKey]/route.ts`
  - Sauvegarde une ligne de saisie avec `upsert`.

- `POST /api/rh/payroll/cycles/:id/calculate`
  - Fichier : `src/app/api/rh/payroll/cycles/[id]/calculate/route.ts`
  - Met uniquement le statut du cycle a `CALCULATED`.

- `POST /api/rh/payroll/cycles/:id/validate-n1`
  - Fichier : `src/app/api/rh/payroll/cycles/[id]/validate-n1/route.ts`
  - Enregistre `n1ValidatedAt`.
  - Met actuellement le statut a `N1_PENDING`.

### API et UI DAF deja liees a la paie

- Page DAF : `src/app/(app)/daf/paie/page.tsx`
- Hook DAF : `src/hooks/useDafPayroll.ts`
- API cycle DAF : `src/app/api/daf/payroll/current/route.ts`
- API validation N2 : `src/app/api/daf/payroll/[period]/validate-n2/route.ts`
- API PDF etat synthetique : `src/app/api/daf/payroll/[period]/state-pdf/route.ts`
- Actions DAF : `src/components/daf/payroll/PayrollActionsCard.tsx`

### Bulletins existants

- Modele PDF bulletin : `src/components/payroll/PayslipPDF.tsx`
- API PDF bulletin : `src/app/api/payslips/[id]/pdf/route.ts`
- API bulletins utilisateur :
  - `src/app/api/users/me/payslips/route.ts`
  - `src/app/api/users/me/payslips/[id]/route.ts`
  - `src/app/api/emp/payslips/route.ts`
  - `src/app/api/emp/payslips/[id]/route.ts`
  - `src/app/api/emp/payslips/[id]/pdf/route.ts`

## 3. Modele de donnees actuel

### `PayrollCycle`

Le cycle de paie contient :

- `tenantId`
- `period` au format `YYYY-MM`
- `status`
- `totalBulletins`
- `grossAmount`
- `employerCharges`
- `netToPay`
- dates de workflow : `startedAt`, `calculatedAt`, `n1ValidatedAt`, `n2ValidatedAt`, `n3ValidatedAt`, `paidAt`, `dipeSubmittedAt`
- `warnings`
- relation `inputs`

Statuts actuels :

- `DRAFT`
- `CALCULATING`
- `CALCULATED`
- `N1_PENDING`
- `N2_PENDING`
- `N3_PENDING`
- `PAID`
- `DIPE_SUBMITTED`
- `CLOSED`

### `PayrollInput`

Les variables de paie sauvegardees sont :

- `payrollCycleId`
- `employeeKey`
- `category`
- `daysWorked`
- `hoursWorked`
- `overtimeHours`
- `bonuses` JSON
- `advances`
- `deductions` JSON
- `savedAt`
- `savedBy`

Point important : `employeeKey` peut etre un identifiant synthetique comme `syn_xxx`, pas forcement un `User.id`. Cela bloque la generation de vrais bulletins `Payslip`, car `Payslip` exige actuellement un `userId` reel.

### `Payslip`

Le modele bulletin existe deja et contient :

- `tenantId`
- `userId`
- `period`, `periodLabel`, `periodEnd`, `paymentDate`
- totaux : `grossAmount`, `taxableGross`, `netAmount`, `socialCharges`, `fiscalCharges`, `employerCharges`
- details du brut : `baseSalary`, `overtimeAmount`, `seniorityBonus`, `transportAllowance`, `otherBonuses`
- cotisations : `cnpsAmount`, `irppAmount`, `otherDeductions`
- paiement : `paymentMethod`, `paymentBankAccount`, `paymentReference`
- temps : `workedDays`, `reportedHours`
- statut : `DRAFT`, `CALCULATED`, `VALIDATED_N1`, `VALIDATED_N2`, `VALIDATED_N3`, `PAID`, `CANCELLED`
- validation : `validatedN1At`, `validatedN2At`, `validatedN3At`, `paidAt`
- `pdfUrl`
- relation `lines`

### `PayslipLine`

Les lignes de bulletin sont deja prevues :

- `code`
- `label`
- `quantity`
- `base`
- `rate`
- `amountPlus`
- `amountMinus`
- `employerAmount`
- `order`

Ce modele est adapte pour reproduire un prototype de bulletin avec codes de paie type `A001`, `A045`, `A050`, etc.

## 4. Flux actuel de la saisie RH

1. La page `/rh/paie` charge le cycle via `GET /api/rh/payroll/current-cycle`.
2. L'utilisateur choisit un onglet :
   - Journaliers
   - Heures sup permanents
   - Primes
   - Avances
   - Retenues
3. Les lignes sont chargees via `GET /api/rh/payroll/cycles/:id/inputs`.
4. Le tableau affiche des personnes synthetiques issues de `getSyntheticPersonnel(487)`.
5. L'utilisateur modifie :
   - jours travailles ;
   - heures supplementaires ;
   - prime mensuelle.
6. Apres 800 ms sans nouvelle modification, le front appelle `PATCH /inputs/:employeeKey`.
7. Les donnees sont sauvegardees dans `PayrollInput`.
8. Le bouton "Lancer calcul paie" appelle `POST /calculate`.
9. L'API met seulement le cycle en `CALCULATED`.
10. Le bouton "Valider N1 RH -> DAF" appelle `POST /validate-n1`.

## 5. Ecarts constates

### 5.1 Calcul de paie incomplet

Le calcul actuel ne produit pas de donnees de paie. Il ne fait pas :

- creation de `Payslip` ;
- creation de `PayslipLine` ;
- calcul du brut imposable ;
- calcul CNPS ;
- calcul IRPP ;
- calcul des retenues ;
- calcul des charges patronales ;
- mise a jour de `PayrollCycle.grossAmount`, `employerCharges`, `netToPay`.

### 5.2 Etat de salaire encore synthetique

La route DAF `state-pdf` genere un PDF tres simple avec :

- nombre de bulletins ;
- brut total ;
- charges patronales ;
- net a virer.

Elle ne genere pas encore un etat de salaire detaille ligne par ligne, avec les colonnes salarie, brut, cotisations, net, banque, CNPS, IRPP, etc.

### 5.3 Generation des bulletins non connectee a la saisie RH

Le composant `PayslipPDF` est pret pour rendre un bulletin existant, mais aucun endpoint RH ne cree les bulletins depuis `PayrollInput`.

Actuellement, les bulletins viennent surtout du seed ou d'autres espaces utilisateur. Le seed cree notamment un bulletin demo pour le DG.

### 5.4 Probleme de correspondance employe

La saisie RH utilise un pool synthetique de 487 personnes. Or `Payslip` exige un `userId`.

Pour generer de vrais bulletins, il faudra choisir une strategie :

1. transformer les 487 personnes synthetiques en vrais `User` ;
2. limiter la generation aux utilisateurs reels du tenant ;
3. creer un modele intermediaire de salarie paie ;
4. conserver le synthetique seulement pour la demo d'etat de salaire, sans generation officielle de bulletin.

### 5.5 Statut N1 incoherent

Le workflow affiche :

1. `DRAFT` - Saisie variables
2. `CALCULATED` - Calcul brut -> net
3. `N1_PENDING` - Validation RH N1
4. `N2_PENDING` - Validation DAF N2
5. `N3_PENDING` - Validation DG N3
6. `PAID` - Virements / DIPE

Mais l'action `validate-n1` met le cycle a `N1_PENDING`. Apres validation RH, le cycle devrait probablement passer a `N2_PENDING`, sinon il reste visuellement bloque sur "Validation RH N1".

### 5.6 Saisie par onglet encore generique

Les onglets changent le pool de personnes, mais le formulaire affiche toujours les memes champs :

- jours ;
- tarif/jour ;
- heures sup ;
- prime ;
- total brut.

Les onglets "Avances" et "Retenues" ne disposent pas encore de champs dedies dans le tableau, alors que le modele `PayrollInput` prevoit `advances` et `deductions`.

### 5.7 Import CSV absent

Le prompt RH mentionne `POST /api/rh/payroll/cycles/:id/import-csv`, mais la route n'existe pas encore.

## 6. Points d'extension pour ton prototype

### 6.1 Ajouter un vrai etat de salaire

Le futur etat de salaire peut etre branche comme nouvelle vue RH ou DAF :

- cote RH : apercu apres calcul, avant validation N1 ;
- cote DAF : etat officiel pour controle et validation N2 ;
- cote DG : synthese seulement, sauf besoin de detail.

Routes proposees :

- `GET /api/rh/payroll/cycles/:id/state`
  - retourne un etat JSON detaille pour affichage web ;
- `GET /api/rh/payroll/cycles/:id/state-pdf`
  - genere le PDF de l'etat RH ;
- `GET /api/daf/payroll/:period/state`
  - meme etat, cote DAF, apres N1 ;
- `GET /api/daf/payroll/:period/state-pdf?type=full`
  - peut remplacer ou enrichir la route PDF existante.

Colonnes probables de l'etat :

- matricule ;
- nom et prenoms ;
- poste ;
- chantier / affectation ;
- categorie ;
- type contrat ;
- jours travailles ;
- salaire de base ;
- heures supplementaires ;
- primes ;
- avantages ;
- brut ;
- brut imposable ;
- CNPS salarie ;
- IRPP ;
- autres retenues ;
- avances ;
- net a payer ;
- charges patronales ;
- banque ;
- RIB ;
- mode de paiement ;
- statut du bulletin.

### 6.2 Brancher la generation des bulletins

Le meilleur point de branchement est `POST /api/rh/payroll/cycles/:id/calculate`.

Comportement cible :

1. verifier que le cycle est `DRAFT` ou `CALCULATING` ;
2. charger les `PayrollInput` ;
3. charger les salaries reels ;
4. calculer chaque bulletin ;
5. creer ou mettre a jour `Payslip` ;
6. creer ou remplacer les `PayslipLine` ;
7. mettre a jour les totaux du cycle ;
8. passer le cycle a `CALCULATED` ;
9. ecrire un `auditLog`.

Pour eviter de melanger UI et logique metier, creer des services :

- `src/lib/payroll/calculate-cycle.ts`
- `src/lib/payroll/build-payslip-lines.ts`
- `src/lib/payroll/build-payroll-state.ts`
- `src/lib/payroll/payroll-rates.ts`

### 6.3 Ajouter une relation cycle -> bulletins

Aujourd'hui, `Payslip` n'a pas de lien direct vers `PayrollCycle`. On peut retrouver par `tenantId + period`, mais c'est fragile.

Migration recommandee :

```prisma
model Payslip {
  payrollCycleId String?
  payrollCycle   PayrollCycle? @relation(fields: [payrollCycleId], references: [id])
}

model PayrollCycle {
  payslips Payslip[]
}
```

La contrainte unique existante `@@unique([tenantId, userId, period])` peut rester.

### 6.4 Gerer les salaries synthetiques

Avant de generer des bulletins officiels, il faut resoudre la source employe.

Option recommandee pour une demo propre :

- garder le pool synthetique pour les volumes RH ;
- generer des bulletins uniquement pour les `User` reels du tenant ;
- afficher dans l'etat de salaire une mention "donnees demo" pour les lignes synthetiques ;
- lorsque le prototype est valide, transformer le pool de demo en vrais users seedes ou creer un modele `PayrollEmployee`.

Option plus robuste :

```prisma
model PayrollEmployeeSnapshot {
  id             String @id @default(cuid())
  payrollCycleId String
  employeeKey    String
  userId         String?
  matricule      String
  firstName      String
  lastName       String
  position       String?
  category       String?
  site           String?
  bankName       String?
  rib            String?
  cnpsNumber     String?
  niu            String?
}
```

Cette table permet de figer les informations du salarie au moment du cycle, meme si son profil change ensuite.

## 7. Workflow cible recommande

### Etape 1 - Saisie RH

Statut cycle : `DRAFT`

- RH saisit les variables.
- `PayrollInput` est mis a jour.
- Aucun bulletin officiel n'est encore produit.

### Etape 2 - Calcul

Statut cycle : `CALCULATING` puis `CALCULATED`

- Calcul brut/net.
- Generation ou mise a jour des `Payslip`.
- Generation des `PayslipLine`.
- Generation de l'etat de salaire JSON.
- Totaux cycle mis a jour.

### Etape 3 - Controle RH

Statut cycle : `CALCULATED`

- RH consulte l'etat de salaire.
- RH consulte quelques bulletins echantillons.
- RH corrige les inputs si besoin.
- RH valide N1.

Apres validation RH :

- cycle -> `N2_PENDING`
- bulletins -> `VALIDATED_N1`

### Etape 4 - Validation DAF

Statut cycle : `N2_PENDING`

- DAF consulte l'etat complet.
- DAF telecharge :
  - etat complet de paie ;
  - ordre de virement ;
  - etat IRPP ;
  - DIPE CNPS.
- DAF valide N2.

Apres validation DAF :

- cycle -> `N3_PENDING`
- bulletins -> `VALIDATED_N2`

### Etape 5 - Validation DG

Statut cycle : `N3_PENDING`

- DG valide la masse salariale.
- cycle -> statut suivant selon choix metier :
  - `PAID` si paiement immediat ;
  - ou `N3_APPROVED` a ajouter si paiement separe.

### Etape 6 - Paiement et DIPE

Statut cycle : `PAID`, puis `DIPE_SUBMITTED`, puis `CLOSED`

- Generation ordre de virement final.
- Marquage bulletins `PAID`.
- DIPE/CNPS et IRPP exportes.

## 8. Adaptations UI a prevoir

### Dans `/rh/paie`

Ajouter apres calcul :

- bouton "Voir l'etat de salaire" ;
- bouton "Telecharger etat de salaire PDF" ;
- bouton "Generer / regenerer les bulletins" si separe du calcul ;
- bouton "Apercu bulletin" sur une ligne employe ;
- badges d'anomalies par ligne ;
- total brut/net recalculable en temps reel apres saisie.

### Dans le tableau de saisie

Les colonnes doivent probablement varier selon l'onglet :

- Journaliers : jours, tarif/jour, heures sup, prime, avance, retenue.
- Heures sup permanents : heures 125%, heures 150%, heures 200%, montant.
- Primes : type prime, montant, imposable oui/non.
- Avances : avance du mois, solde restant, retenue.
- Retenues : type retenue, montant, motif.

### Dans l'etat de salaire

Prevoir deux affichages :

- vue web avec filtres et totals sticky ;
- PDF officiel selon ton prototype.

Filtres utiles :

- chantier ;
- categorie ;
- type contrat ;
- banque ;
- statut ;
- anomalies.

## 9. Endpoints a ajouter ou enrichir

### Priorite 1

- Enrichir `POST /api/rh/payroll/cycles/:id/calculate`
  - creer les bulletins ;
  - remplir les lignes ;
  - mettre a jour les totaux.

- Ajouter `GET /api/rh/payroll/cycles/:id/state`
  - etat web detaille.

- Ajouter `GET /api/rh/payroll/cycles/:id/payslips`
  - liste des bulletins generes.

- Ajouter `GET /api/rh/payroll/cycles/:id/payslips/:payslipId/pdf`
  - telechargement RH/DAF/DG selon droits.

### Priorite 2

- Ajouter `GET /api/rh/payroll/cycles/:id/state-pdf`
  - PDF selon prototype.

- Enrichir `GET /api/daf/payroll/:period/state-pdf`
  - utiliser les donnees detaillees au lieu de la synthese actuelle.

- Ajouter `POST /api/rh/payroll/cycles/:id/import-csv`
  - import bulk.

- Ajouter `POST /api/rh/payroll/cycles/:id/regenerate-payslips`
  - utile si modification apres calcul.

### Priorite 3

- Ajouter exports :
  - `xlsx` ;
  - ordre de virement banque ;
  - DIPE ;
  - IRPP.

## 10. Controle qualite et risques

### Risques fonctionnels

- Generer des bulletins pour des salaries synthetiques sans `User.id`.
- Modifier les saisies apres validation sans verrou.
- Ne pas conserver de snapshot des donnees salarie au moment du cycle.
- Melanger calcul demo et calcul conforme.
- Produire un etat de salaire dont les totaux ne correspondent pas aux bulletins.

### Correctifs rapides conseilles

1. Bloquer le `PATCH PayrollInput` si le cycle n'est plus `DRAFT`.
2. Corriger `validate-n1` pour passer a `N2_PENDING`.
3. Ajouter des logs d'audit sur chaque validation.
4. Centraliser le calcul dans `src/lib/payroll`.
5. Ajouter un lien direct entre `PayrollCycle` et `Payslip`.
6. Ne pas exposer de PDF officiel sans mention "prototype / demo" tant que les formules ne sont pas validees.

## 11. Checklist pour integrer ton prototype

Quand le prototype de l'etat de salaire sera pret, fournir :

- colonnes exactes de l'etat ;
- ordre des colonnes ;
- totaux en haut ou en bas ;
- regroupements souhaites : par chantier, categorie, banque ou contrat ;
- format A4 portrait/paysage ;
- nombre de lignes par page ;
- style des en-tetes ;
- libelles officiels ;
- codes de paie attendus ;
- regles de calcul ou formules provisoires ;
- workflow attendu apres generation ;
- exemples de 2 ou 3 salaries avec resultat attendu.

Avec ces elements, l'integration naturelle sera :

1. creer le builder JSON de l'etat ;
2. creer le composant PDF selon prototype ;
3. brancher le calcul sur `PayrollInput` ;
4. creer les bulletins `Payslip` + `PayslipLine` ;
5. enrichir `/rh/paie` avec la previsualisation.

## 12. Conclusion

La saisie de paie RH est une bonne base d'interface et de workflow. Elle joue aujourd'hui le role de module de collecte des variables.

Pour arriver a un etat de salaire et a des bulletins generes, il faut ajouter une couche metier centrale de calcul paie, puis brancher cette couche sur les modeles `Payslip` et `PayslipLine` deja existants.

Le futur prototype doit donc surtout guider :

- la forme visuelle de l'etat de salaire ;
- la structure des lignes de bulletin ;
- les colonnes et totaux attendus ;
- le niveau de detail par salarie ;
- les exports PDF/officiels a produire.

