# Module Payroll

Module Python de generation automatique de bulletins de paie, concu pour etre reutilisable dans l'ERP Flask puis expose plus tard via API ou interface React.

## Arborescence

```text
backend/app/modules/payroll/
  __init__.py
  main.py
  models.py
  calculator.py
  pdf_generator.py
  data_loader.py
  utils.py
  company.json
  payroll_config.json
  requirements.txt
  README.md
  data/
    employes_paie.xlsx
  output/
    .gitkeep
    bulletins/
      .gitkeep
```

## Schema des donnees

### `company.json`

- `name`
- `taxpayer_number`
- `postal_box`
- `city`
- `phone`
- `email`
- `country`
- `logo_path`

### `payroll_config.json`

- `cnps_ceiling`
- `cnps_salarial_rate`
- `cfp_patronal_rate`
- `fne_patronal_rate`
- `cot_pf_patronal_rate`
- `cot_pvid_patronal_rate`
- `cot_at_patronal_rate`
- `allow_override`
- `devise`
- `format_date`
- `format_montant`
- `rubriques`

Options deja prevues pour aller plus loin sans toucher au code metier :

- `cac_rate`
- `cfs_rate`
- `default_tc_amount`
- `default_rav_amount`

### `employes_paie.xlsx`

Colonnes minimales prises en charge :

- `employee_id`
- `nom`
- `prenom`
- `matricule`
- `categorie`
- `echelon`
- `anciennete_mois`
- `cnps_number`
- `convention_collective`
- `emploi`
- `departement`
- `date_embauche`
- `horaire`
- `situation_famille`
- `numero_compte`
- `domiciliation`
- `jours_payes`
- `salaire_base_mensuel`
- `indemn_transport`
- `autres_gains`
- `mode_paiement`
- `date_debut_periode`
- `date_fin_periode`
- `date_paiement`
- `brut_imposable`
- `irpp`
- `cac`
- `tc`
- `rav`
- `cfs`
- `observation`

Le loader accepte aussi :

- un CSV avec les memes en-tetes ;
- une liste Python de dictionnaires ;
- un JSON contenant une liste d'objets, pour preparer l'integration base de donnees.

## Regles dynamiques de calcul

- Salaire de base : `salaire_base_mensuel`
- Indemnite transport : `indemn_transport`
- Autres gains : `autres_gains`
- Salaire brut : `salaire_base_mensuel + indemn_transport + autres_gains`
- Brut imposable :
  - utilise la valeur fournie si presente ;
  - sinon retombe sur `salaire_base_mensuel`
- Base CNPS : `min(brut_imposable, cnps_ceiling)`
- CNPS salariale : `base_cnps * cnps_salarial_rate`
- Charges patronales :
  - `CFP = base_cnps * cfp_patronal_rate`
  - `FNE = base_cnps * fne_patronal_rate`
  - `COT. PF = base_cnps * cot_pf_patronal_rate`
  - `COT. PVID = base_cnps * cot_pvid_patronal_rate`
  - `COT. AT = base_cnps * cot_at_patronal_rate`
- Retenues salariales : `irpp + cac + tc + rav + cfs + cnps_salariale`
- Net a payer : `salaire_brut - total_retenues`

## Override dynamique

Le flag `allow_override` permet a des montants fournis par la source de remplacer certains calculs derives.

Exemples de colonnes optionnelles qu'un futur export ERP ou SQL peut envoyer sans changer le moteur :

- `cnps_salariale`
- `cfp_patronal`
- `fne_patronal`
- `cot_pf_patronal`
- `cot_pvid_patronal`
- `cot_at_patronal`
- `total_retenues`
- `total_patronal`
- `net_a_payer`

## Installation

Depuis la racine du projet :

```bash
python -m pip install -r backend/requirements.txt
```

Dependencies payroll ajoutees au backend :

- `reportlab`
- `openpyxl`

Le module sait tout de meme lire un `.xlsx` simple sans `openpyxl` grace a un fallback standard library.

## Execution

Depuis `backend/` :

```bash
python -m app.modules.payroll.main --source app/modules/payroll/data/employes_paie.xlsx
```

Execution sur un seul employe :

```bash
python -m app.modules.payroll.main --source app/modules/payroll/data/employes_paie.xlsx --employee-id EMP-001
```

Execution sans PDF, pour verifier uniquement les calculs :

```bash
python -m app.modules.payroll.main --source app/modules/payroll/data/employes_paie.xlsx --dry-run
```

## API Flask

Le module est expose dans l'API v1 :

- `GET /api/v1/payroll/status`
- `POST /api/v1/payroll/payslips/generate`
- `GET /api/v1/payroll/payslips/download/<period_key>/<filename>`

Permissions utilisees :

- `payroll.read`
- `payroll.manage`

Exemple de generation inline :

```json
{
  "source_type": "inline",
  "dry_run": false,
  "include_lines": true,
  "employees": [
    {
      "employee_id": "EMP-001",
      "nom": "MEBENGA",
      "prenom": "JEAN JACQUES",
      "matricule": "22-031",
      "jours_payes": 28,
      "salaire_base_mensuel": 200000,
      "indemn_transport": 42000,
      "autres_gains": 0,
      "mode_paiement": "EN ESPECE",
      "date_debut_periode": "2025-02-01",
      "date_fin_periode": "2025-02-28",
      "date_paiement": "2025-02-28",
      "brut_imposable": 200000,
      "irpp": 20000,
      "cac": 2000,
      "tc": 1500,
      "rav": 1950,
      "cfs": 2000
    }
  ]
}
```

Exemple avec fichier :

```json
{
  "source_type": "file",
  "source_path": "app/modules/payroll/data/employes_paie.xlsx",
  "dry_run": true
}
```

## Sortie

Les bulletins sont generes dans :

```text
backend/app/modules/payroll/output/bulletins/YYYY-MM/
```

Format :

```text
bulletin_{matricule}_{yyyy_mm}.pdf
```

## Modifier le plafond CNPS

Changer uniquement la valeur :

```json
"cnps_ceiling": 750000
```

dans `payroll_config.json`.

Aucun changement n'est necessaire dans `calculator.py`.

## Integration Flask / PostgreSQL

Le module est maintenant expose dans l'ERP Flask avec deux usages :

- generation fichier / inline via `POST /api/v1/payroll/payslips/generate`
- generation mensuelle depuis la base via `POST /api/v1/payroll/periods/generate`

Endpoints disponibles :

- `GET /api/v1/payroll/status`
- `GET /api/v1/payroll/employees`
- `GET /api/v1/payroll/employees/<user_id>/profile`
- `PATCH /api/v1/payroll/employees/<user_id>/profile`
- `DELETE /api/v1/payroll/employees/<user_id>/profile`
- `GET /api/v1/payroll/periods`
- `POST /api/v1/payroll/periods`
- `PATCH /api/v1/payroll/periods/<period_id>`
- `GET /api/v1/payroll/periods/<period_id>/inputs`
- `PUT /api/v1/payroll/periods/<period_id>/inputs`
- `DELETE /api/v1/payroll/periods/<period_id>/inputs/<user_id>`
- `GET /api/v1/payroll/runs`
- `POST /api/v1/payroll/payslips/generate`
- `POST /api/v1/payroll/periods/generate`
- `GET /api/v1/payroll/payslips/download/<period_key>/<filename>`

Le flux SQL/PostgreSQL s'appuie sur :

- `users` pour les employes de base ;
- `employee_payroll_profiles` pour les donnees paie persistantes (CNPS, mode de paiement, transport, gains fixes, compte bancaire, etc.) ;
- `payroll_periods` pour les periodes mensuelles ;
- `payroll_period_inputs` pour la preparation mensuelle et les overrides du mois ;
- `payroll_runs` et `payroll_run_items` pour l'historique des generations.

Cycle de preparation recommande :

1. creer ou mettre a jour une periode brouillon ;
2. enregistrer les `payroll_period_inputs` employee par employee ;
3. recharger et ajuster le brouillon depuis l'interface ;
4. lancer la generation via `payroll_period_id` sans ressaisie ligne par ligne.

Exemple de payload mensuel :

```json
{
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "payment_date": "2026-03-31",
  "employee_ids": [12],
  "employee_inputs": [
    {
      "user_id": 12,
      "days_paid": 31,
      "transport_allowance": 42000,
      "brut_imposable": 200000,
      "irpp": 20000,
      "cac": 2000,
      "tc": 1500,
      "rav": 1950,
      "cfs": 2000,
      "payment_method": "cash"
    }
  ]
}
```

## Evolutions prevues

- envoi des bulletins par email ;
- signature numerique ;
- ecriture de profils paie complets depuis l'interface ;
- synchronisation avec des donnees comptables/fiscales ;
- declenchement depuis React ;
- archivage mensuel ;
- ajout du logo entreprise.
