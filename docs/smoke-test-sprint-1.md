# T-ERP - Smoke Test Sprint 1

## Objet

Ce document fixe la verification minimale a executer a la fin du Sprint 1.
L'objectif n'est pas de remplacer une vraie suite de tests, mais de securiser le parcours critique V1 et les verifications de base du repo.

## Parcours critique couvre

- inscription d'une entreprise
- creation du super admin de plateforme
- validation de l'entreprise par le super admin
- connexion de l'admin entreprise
- acces aux statuts des modules V1 du tableau de bord
- build frontend
- verification syntaxique backend

## Commandes rapides

### Verification backend

```powershell
python -m compileall backend\app backend\seed_super_admin.py
```

### Verification frontend

```powershell
cd frontend
npm run build
```

### Smoke scenario backend automatisable

Ce script utilise une base SQLite temporaire et n'a pas besoin de PostgreSQL local.

```powershell
python backend\scripts\smoke_test_sprint_1.py
```

## Ce que valide le script `backend/scripts/smoke_test_sprint_1.py`

1. `POST /api/v1/auth/bootstrap-super-admin`
2. `POST /api/v1/companies/register`
3. `POST /api/v1/auth/login` pour le super admin
4. `GET /api/v1/companies/pending`
5. `PATCH /api/v1/companies/{id}/review`
6. `POST /api/v1/auth/login` pour l'admin entreprise
7. `GET /api/v1/auth/me`
8. `GET /api/v1/companies/status`
9. `GET /api/v1/projects/status`
10. `GET /api/v1/finance/status`
11. `GET /api/v1/inventory/status`

## Resultat attendu

- code de retour `0` pour le script
- message final `Sprint 1 smoke test passed`
- `npm run build` passe
- `python -m compileall ...` passe

## Limites actuelles

- le smoke test ne couvre pas encore le frontend navigateur de bout en bout
- le smoke test ne remplace pas une suite `pytest` ou E2E
- il valide le coeur du flux V1, pas l'ensemble des modules presents dans le repo
