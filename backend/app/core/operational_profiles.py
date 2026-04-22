from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.core.default_profiles import DEFAULT_GLOBAL_PROFILE_TEMPLATES


BASE_OPERATIONAL_PROFILE_TEMPLATES = [
    {
        "code": "directeur_general",
        "name": "Directeur General (DG)",
        "definition": "Responsable principal de l'entreprise avec une vue globale sur les decisions strategiques et la performance.",
        "missions": [
            "Superviser l'ensemble des departements",
            "Valider les decisions importantes",
            "Suivre les projets et marches",
            "Controler la performance globale",
            "Prendre les decisions financieres majeures",
            "Representer l'entreprise",
        ],
        "system_access": [
            {"module": "Projets", "level": "Lecture + validation"},
            {"module": "Comptabilite", "level": "Lecture + validation"},
            {"module": "Stock", "level": "Lecture"},
            {"module": "Personnel", "level": "Lecture + validation"},
            {"module": "Marches publics", "level": "Lecture + validation"},
            {"module": "Rapports", "level": "KPI + synthese"},
        ],
        "feature_groups": [
            {
                "title": "Pilotage executif",
                "items": [
                    "Consulter tous les projets",
                    "Visualiser la rentabilite par projet",
                    "Acceder aux indicateurs cles",
                ],
            },
            {
                "title": "Validation",
                "items": [
                    "Valider un projet ou un marche",
                    "Approuver les depenses importantes",
                    "Arbitrer les decisions critiques",
                ],
            },
            {
                "title": "Gouvernance",
                "items": [
                    "Consulter les etats financiers",
                    "Suivre les rapports d'activite",
                    "Coordonner les directions",
                ],
            },
        ],
        "indicators": [
            "Projets en cours",
            "Projets en retard",
            "Chiffre d'affaires",
            "Depenses globales",
            "Benefices estimes",
            "Personnel actif",
            "Alertes critiques",
        ],
        "controls_title": "Gouvernance",
        "controls": [
            "Validation des budgets et marches",
            "Suivi transversal de la performance",
            "Lecture consolidee des risques",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Directeur General",
            "department": "Direction generale",
            "hierarchy_level": 1,
            "default_role_codes": ["directeur_general"],
            "related_role_codes": ["pca"],
            "unit_code": "DIR-GEN",
            "unit_name": "Direction generale",
            "unit_type": "directorate",
            "unit_description": "Pole executif central de l'entreprise.",
            "unit_hierarchy_level": 1,
            "unit_sort_order": 10,
        },
    },
    {
        "code": "directeur_technique",
        "name": "Directeur Technique (DT)",
        "definition": "Responsable de la realisation technique des projets, de la qualite d'execution et de la coordination chantier.",
        "missions": [
            "Superviser les chantiers",
            "Valider les choix techniques",
            "Suivre l'execution des travaux",
            "Coordonner les equipes techniques",
            "Assurer la qualite des travaux",
        ],
        "system_access": [
            {"module": "Projets", "level": "Complet"},
            {"module": "Ressources techniques", "level": "Complet"},
            {"module": "Comptabilite", "level": "Limite"},
            {"module": "Personnel technique", "level": "Lecture"},
        ],
        "feature_groups": [
            {
                "title": "Execution",
                "items": [
                    "Creer et gerer les projets",
                    "Planifier les travaux",
                    "Affecter les equipes",
                ],
            },
            {
                "title": "Qualite et delais",
                "items": [
                    "Suivre l'avancement",
                    "Valider les taches",
                    "Gerer les incidents techniques",
                ],
            },
            {
                "title": "Reporting chantier",
                "items": [
                    "Consulter les rapports de chantier",
                    "Piloter les echeances",
                    "Prioriser les actions correctives",
                ],
            },
        ],
        "indicators": [
            "Taux d'avancement",
            "Respect des delais",
            "Qualite des travaux",
            "Incidents techniques",
        ],
        "controls_title": "Pilotage technique",
        "controls": [
            "Validation des choix techniques",
            "Suivi des non-conformites",
            "Coordination inter-chantiers",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Directeur Technique",
            "department": "Direction technique",
            "hierarchy_level": 2,
            "default_role_codes": ["directeur_technique"],
            "related_role_codes": ["chef_projet", "conducteur_travaux", "chef_chantier"],
            "unit_code": "DIR-TECH",
            "unit_name": "Direction technique",
            "unit_type": "department",
            "unit_description": "Coordonne la production technique, les projets et les equipes terrain.",
            "unit_hierarchy_level": 2,
            "parent_unit_code": "DIR-GEN",
            "unit_sort_order": 20,
        },
    },
    {
        "code": "daf",
        "name": "Directeur Administratif et Financier (DAF)",
        "definition": "Pilote la comptabilite, la tresorerie, les budgets et la rentabilite de l'entreprise.",
        "missions": [
            "Superviser la comptabilite",
            "Gerer les budgets",
            "Controler les depenses",
            "Assurer la rentabilite",
            "Suivre les dettes et creances",
        ],
        "system_access": [
            {"module": "Comptabilite", "level": "Complet"},
            {"module": "Projets", "level": "Financier"},
            {"module": "Paiements", "level": "Complet"},
            {"module": "Facturation", "level": "Complet"},
        ],
        "feature_groups": [
            {
                "title": "Controle financier",
                "items": [
                    "Valider les depenses",
                    "Suivre la tresorerie",
                    "Analyser les marges",
                ],
            },
            {
                "title": "Pilotage budgetaire",
                "items": [
                    "Suivre les budgets projet",
                    "Consolider les dettes et creances",
                    "Produire les rapports financiers",
                ],
            },
            {
                "title": "Arbitrage",
                "items": [
                    "Valider les achats critiques",
                    "Prioriser les decaissements",
                    "Coordonner avec la direction generale",
                ],
            },
        ],
        "indicators": [
            "Cash-flow",
            "Marge",
            "Rentabilite",
            "Dettes",
            "Creances",
        ],
        "controls_title": "Controle financier",
        "controls": [
            "Validation des engagements",
            "Suivi de la tresorerie",
            "Trajectoire budgetaire par projet",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Directeur Administratif et Financier",
            "department": "Direction administrative et financiere",
            "hierarchy_level": 2,
            "default_role_codes": ["daf"],
            "related_role_codes": ["directeur_administratif", "controleur_gestion", "comptable"],
            "unit_code": "DIR-DAF",
            "unit_name": "Direction administrative et financiere",
            "unit_type": "department",
            "unit_description": "Regroupe la finance, l'administration et le pilotage budgetaire.",
            "unit_hierarchy_level": 2,
            "parent_unit_code": "DIR-GEN",
            "unit_sort_order": 30,
        },
    },
    {
        "code": "responsable_logistique",
        "name": "Responsable Logistique",
        "definition": "Orchestre les approvisionnements, les mouvements de stock et la disponibilite des ressources sur les projets.",
        "missions": [
            "Assurer la disponibilite des materiaux",
            "Organiser les livraisons",
            "Gerer les stocks",
            "Coordonner les equipements",
            "Planifier les besoins logistiques des projets",
        ],
        "system_access": [
            {"module": "Stock", "level": "Complet"},
            {"module": "Projets", "level": "Ressources"},
            {"module": "Fournisseurs", "level": "Complet"},
            {"module": "Comptabilite", "level": "Partiel"},
        ],
        "feature_groups": [
            {
                "title": "Stocks",
                "items": [
                    "Suivre les entrees et sorties",
                    "Gerer les niveaux de stock",
                    "Piloter les inventaires",
                ],
            },
            {
                "title": "Approvisionnement",
                "items": [
                    "Emettre les demandes d'achat",
                    "Suivre les commandes",
                    "Coordonner les fournisseurs",
                ],
            },
            {
                "title": "Transport et allocation",
                "items": [
                    "Planifier les livraisons",
                    "Affecter les vehicules",
                    "Suivre la consommation par projet",
                ],
            },
        ],
        "indicators": [
            "Niveau de stock",
            "Taux de rupture",
            "Delais de livraison",
            "Cout logistique",
            "Consommation par projet",
        ],
        "controls_title": "Flux logistiques",
        "controls": [
            "Alertes de rupture",
            "Trajectoire des approvisionnements",
            "Validation des allocations projet",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Responsable Logistique",
            "department": "Direction logistique",
            "hierarchy_level": 2,
            "default_role_codes": ["responsable_logistique"],
            "related_role_codes": ["magasinier", "logisticien", "acheteur"],
            "unit_code": "DIR-LOG",
            "unit_name": "Direction logistique",
            "unit_type": "department",
            "unit_description": "Pilote les stocks, transports et approvisionnements.",
            "unit_hierarchy_level": 2,
            "parent_unit_code": "DIR-GEN",
            "unit_sort_order": 40,
        },
    },
    {
        "code": "comptable",
        "name": "Comptable",
        "definition": "Responsable de la gestion quotidienne des operations financieres de l'entreprise.",
        "missions": [
            "Enregistrer les depenses et recettes",
            "Suivre les paiements",
            "Gerer les factures",
            "Assurer la tenue des comptes",
            "Produire les etats financiers",
        ],
        "system_access": [
            {"module": "Comptabilite", "level": "Complet"},
            {"module": "Projets", "level": "Financier"},
            {"module": "Stock", "level": "Limite"},
            {"module": "Utilisateurs", "level": "Lecture"},
        ],
        "feature_groups": [
            {
                "title": "Gestion des depenses",
                "items": [
                    "Enregistrer une depense",
                    "Categoriser les flux",
                    "Associer les depenses a un projet",
                    "Joindre des justificatifs",
                ],
            },
            {
                "title": "Gestion des recettes",
                "items": [
                    "Enregistrer les paiements clients",
                    "Suivre les encaissements",
                    "Gerer les avances",
                ],
            },
            {
                "title": "Facturation",
                "items": [
                    "Creer des factures",
                    "Suivre les paiements",
                    "Gerer les retards",
                ],
            },
            {
                "title": "Tresorerie",
                "items": [
                    "Gerer caisse et banque",
                    "Suivre les soldes",
                ],
            },
        ],
        "indicators": [
            "Depenses totales",
            "Recettes",
            "Benefices",
            "Dettes",
            "Creances",
        ],
        "controls_title": "Securite",
        "controls": [
            "Validation des operations",
            "Tracabilite complete",
            "Restriction des modifications",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Comptable",
            "department": "Finance et comptabilite",
            "hierarchy_level": 3,
            "default_role_codes": ["comptable"],
            "related_role_codes": [],
            "unit_code": "SRV-COMPTA",
            "unit_name": "Finance et comptabilite",
            "unit_type": "service",
            "unit_description": "Service charge des flux financiers, des ecritures et de la facturation.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-DAF",
            "unit_sort_order": 10,
        },
    },
    {
        "code": "magasinier",
        "name": "Magasinier",
        "definition": "Responsable de la gestion physique des stocks.",
        "missions": [
            "Gerer les entrees et sorties",
            "Suivre les niveaux de stock",
            "Effectuer les inventaires",
            "Assurer la disponibilite des materiaux",
        ],
        "system_access": [
            {"module": "Stock", "level": "Complet"},
            {"module": "Projets", "level": "Limite"},
            {"module": "Comptabilite", "level": "Non"},
            {"module": "RH", "level": "Non"},
        ],
        "feature_groups": [
            {
                "title": "Entrees de stock",
                "items": [
                    "Enregistrer les livraisons",
                    "Ajouter des articles",
                ],
            },
            {
                "title": "Sorties",
                "items": [
                    "Affecter les stocks aux projets",
                    "Enregistrer la consommation",
                ],
            },
            {
                "title": "Inventaire",
                "items": [
                    "Realiser les comptages",
                    "Ajuster les ecarts",
                ],
            },
        ],
        "indicators": [
            "Stock disponible",
            "Ruptures",
            "Mouvements",
        ],
        "controls_title": "Alertes",
        "controls": [
            "Stock faible",
            "Anomalies de stock",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Magasinier",
            "department": "Stock et logistique",
            "hierarchy_level": 3,
            "default_role_codes": ["magasinier"],
            "related_role_codes": ["logisticien"],
            "unit_code": "SRV-STOCK",
            "unit_name": "Stock et logistique",
            "unit_type": "service",
            "unit_description": "Equipe chargee des mouvements physiques de stock et des inventaires.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-LOG",
            "unit_sort_order": 20,
        },
    },
    {
        "code": "responsable_rh",
        "name": "Responsable RH",
        "definition": "Gere le personnel et les ressources humaines.",
        "missions": [
            "Gerer les employes",
            "Suivre les contrats",
            "Gerer les absences",
            "Organiser le recrutement",
        ],
        "system_access": [
            {"module": "Personnel", "level": "Complet"},
            {"module": "Projets", "level": "Limite"},
            {"module": "Comptabilite", "level": "Non"},
            {"module": "Stock", "level": "Non"},
        ],
        "feature_groups": [
            {
                "title": "Gestion du personnel",
                "items": [
                    "Ajouter et modifier des employes",
                    "Gerer les contrats",
                    "Suivre les carrieres",
                ],
            },
            {
                "title": "Presence",
                "items": [
                    "Suivre les presences",
                    "Gerer les absences",
                ],
            },
            {
                "title": "Recrutement",
                "items": [
                    "Gerer les candidatures",
                    "Integrer les nouveaux employes",
                ],
            },
        ],
        "indicators": [
            "Nombre d'employes",
            "Taux d'absenteisme",
            "Performance",
        ],
        "controls_title": "Suivi RH",
        "controls": [
            "Historique des contrats",
            "Suivi des absences",
            "Tracabilite des recrutements",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Responsable RH",
            "department": "Ressources humaines",
            "hierarchy_level": 2,
            "default_role_codes": ["responsable_rh"],
            "related_role_codes": ["rh_recruteur"],
            "unit_code": "SRV-RH",
            "unit_name": "Ressources humaines",
            "unit_type": "service",
            "unit_description": "Gere les employes, contrats, absences et recrutements.",
            "unit_hierarchy_level": 2,
            "parent_unit_code": "DIR-GEN",
            "unit_sort_order": 50,
        },
    },
    {
        "code": "chef_projet",
        "name": "Chef de projet / Conducteur des travaux",
        "definition": "Responsable de l'execution operationnelle des projets.",
        "missions": [
            "Gerer le chantier",
            "Superviser les equipes",
            "Suivre les taches",
            "Rendre compte",
        ],
        "system_access": [
            {"module": "Projets", "level": "Complet"},
            {"module": "Stock", "level": "Consultation"},
            {"module": "Comptabilite", "level": "Limite"},
            {"module": "RH", "level": "Non"},
        ],
        "feature_groups": [
            {
                "title": "Gestion des taches",
                "items": [
                    "Creer des taches",
                    "Assigner les taches",
                    "Suivre l'execution",
                ],
            },
            {
                "title": "Suivi chantier",
                "items": [
                    "Tenir le journal de chantier",
                    "Joindre des photos",
                    "Declarer les incidents",
                ],
            },
            {
                "title": "Coordination",
                "items": [
                    "Communiquer avec l'equipe",
                    "Gerer le planning",
                ],
            },
        ],
        "indicators": [
            "Avancement",
            "Respect des delais",
            "Performance equipe",
        ],
        "controls_title": "Pilotage",
        "controls": [
            "Alertes sur retards",
            "Suivi des incidents terrain",
            "Trajectoire projet par equipe",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Chef de projet",
            "department": "Execution projet",
            "hierarchy_level": 2,
            "default_role_codes": ["chef_projet"],
            "related_role_codes": ["conducteur_travaux", "chef_chantier"],
            "unit_code": "SRV-PROJ",
            "unit_name": "Execution projet",
            "unit_type": "service",
            "unit_description": "Pilote les operations terrain, le planning et l'avancement chantier.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-TECH",
            "unit_sort_order": 30,
        },
    },
    {
        "code": "ouvrier",
        "name": "Ouvrier",
        "definition": "Executant des taches sur le chantier.",
        "missions": [
            "Executer les travaux",
            "Suivre les instructions",
            "Remonter les informations",
        ],
        "system_access": [
            {"module": "Projets", "level": "Taches"},
            {"module": "Stock", "level": "Non"},
            {"module": "Comptabilite", "level": "Non"},
            {"module": "RH", "level": "Non"},
        ],
        "feature_groups": [
            {
                "title": "Execution",
                "items": [
                    "Voir ses taches",
                    "Signaler un probleme",
                    "Enregistrer l'activite en option",
                ],
            },
        ],
        "indicators": [
            "Presence",
            "Performance",
            "Historique",
        ],
        "controls_title": "Suivi",
        "controls": [
            "Suivi de presence",
            "Historique des activites",
            "Remontee des incidents",
        ],
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Ouvrier",
            "department": "Chantier",
            "hierarchy_level": 4,
            "default_role_codes": ["ouvrier"],
            "related_role_codes": ["collaborateur_terrain"],
            "unit_code": "TEAM-CHT",
            "unit_name": "Equipe chantier",
            "unit_type": "team",
            "unit_description": "Equipe d'execution terrain rattachee aux operations projet.",
            "unit_hierarchy_level": 4,
            "parent_unit_code": "SRV-PROJ",
            "unit_sort_order": 40,
        },
    },
]


OPERATIONAL_ROLE_INTERACTIONS = [
    {
        "source": "DG",
        "target": "DT",
        "description": "Validation des projets, suivi d'avancement et arbitrage des priorites terrain.",
    },
    {
        "source": "DG",
        "target": "DAF",
        "description": "Validation des budgets, depenses majeures et trajectoire de rentabilite.",
    },
    {
        "source": "DAF",
        "target": "Comptable",
        "description": "Supervision des ecritures, factures, paiements et reportings financiers.",
    },
    {
        "source": "DT",
        "target": "Chef projet",
        "description": "Coordination chantier, jalons techniques et suivi des incidents.",
    },
    {
        "source": "DT",
        "target": "Resp. logistique",
        "description": "Planification des ressources, besoins materiels et priorites d'approvisionnement.",
    },
    {
        "source": "Resp. logistique",
        "target": "Magasinier",
        "description": "Gestion des flux, niveau de stock, inventaires et affectations projet.",
    },
    {
        "source": "RH",
        "target": "DG",
        "description": "Suivi des effectifs, conformite RH et alertes de disponibilite des equipes.",
    },
    {
        "source": "Chef projet",
        "target": "Ouvrier",
        "description": "Execution des taches, suivi de presence et remontee des incidents terrain.",
    },
    {
        "source": "Chef projet",
        "target": "Resp. logistique",
        "description": "Demandes de materiaux, consommation chantier et coordination des livraisons.",
    },
]


MANUAL_OPERATIONAL_ACCESS_MATRIX = [
    {
        "role": "DG",
        "projects": "Lecture + validation",
        "inventory": "Lecture",
        "finance": "Lecture + validation",
        "hr": "Lecture + validation",
    },
    {
        "role": "DT",
        "projects": "Complet",
        "inventory": "Partiel",
        "finance": "Limite",
        "hr": "Technique",
    },
    {
        "role": "DAF",
        "projects": "Financier",
        "inventory": "Limite",
        "finance": "Complet",
        "hr": "Lecture",
    },
    {
        "role": "Resp. logistique",
        "projects": "Ressources",
        "inventory": "Complet",
        "finance": "Partiel",
        "hr": "Non",
    },
    {
        "role": "Comptable",
        "projects": "Financier",
        "inventory": "Limite",
        "finance": "Complet",
        "hr": "Non",
    },
    {
        "role": "Magasinier",
        "projects": "Limite",
        "inventory": "Complet",
        "finance": "Non",
        "hr": "Non",
    },
    {
        "role": "RH",
        "projects": "Limite",
        "inventory": "Non",
        "finance": "Non",
        "hr": "Complet",
    },
    {
        "role": "Chef projet",
        "projects": "Complet",
        "inventory": "Consultation",
        "finance": "Limite",
        "hr": "Non",
    },
    {
        "role": "Ouvrier",
        "projects": "Taches",
        "inventory": "Non",
        "finance": "Non",
        "hr": "Non",
    },
]


MANUAL_OPERATIONAL_ACCESS_MATRIX_CODES = [
    "directeur_general",
    "directeur_technique",
    "daf",
    "responsable_logistique",
    "comptable",
    "magasinier",
    "responsable_rh",
    "chef_projet",
    "ouvrier",
]


MODULE_LABELS = {
    "companies": "Entreprises",
    "users": "Personnel",
    "attendance": "Presences",
    "projects": "Projets",
    "finance": "Comptabilite",
    "payroll": "Paie",
    "inventory": "Stock",
    "procurement": "Marches publics",
    "chat": "Messagerie",
    "calls": "Appels",
    "recruitment": "Recrutement",
}


AUTO_OPERATIONAL_PROFILE_METADATA = {
    "pca": {
        "matrix_label": "PCA",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "President du Conseil d'Administration",
            "department": "Conseil d'administration",
            "hierarchy_level": 1,
            "default_role_codes": ["pca"],
            "related_role_codes": ["directeur_general"],
            "unit_code": "GOV-CA",
            "unit_name": "Conseil d'administration",
            "unit_type": "directorate",
            "unit_description": "Instance de gouvernance et d'orientation strategique.",
            "unit_hierarchy_level": 1,
            "unit_sort_order": 5,
        },
    },
    "directeur_administratif": {
        "matrix_label": "Dir. admin",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Directeur Administratif",
            "department": "Direction administrative",
            "hierarchy_level": 2,
            "default_role_codes": ["directeur_administratif"],
            "related_role_codes": ["daf", "assistant_administratif", "juriste"],
            "unit_code": "DIR-ADM",
            "unit_name": "Direction administrative",
            "unit_type": "department",
            "unit_description": "Coordonne l'administration generale, les dossiers et la conformite documentaire.",
            "unit_hierarchy_level": 2,
            "parent_unit_code": "DIR-GEN",
            "unit_sort_order": 35,
        },
    },
    "controleur_gestion": {
        "matrix_label": "Ctrl. gestion",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Controleur de gestion",
            "department": "Controle de gestion",
            "hierarchy_level": 3,
            "default_role_codes": ["controleur_gestion"],
            "related_role_codes": ["daf", "comptable"],
            "unit_code": "SRV-CDG",
            "unit_name": "Controle de gestion",
            "unit_type": "service",
            "unit_description": "Analyse les performances, budgets et marges des activites.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-DAF",
            "unit_sort_order": 15,
        },
    },
    "chef_chantier": {
        "matrix_label": "Chef chantier",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Chef de chantier",
            "department": "Execution projet",
            "hierarchy_level": 3,
            "default_role_codes": ["chef_chantier"],
            "related_role_codes": ["chef_projet", "conducteur_travaux"],
            "unit_code": "SRV-PROJ",
            "unit_name": "Execution projet",
            "unit_type": "service",
            "unit_description": "Pilote les operations terrain, le planning et l'avancement chantier.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-TECH",
            "unit_sort_order": 30,
        },
    },
    "conducteur_travaux": {
        "matrix_label": "Cond. travaux",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Conducteur de travaux",
            "department": "Execution projet",
            "hierarchy_level": 3,
            "default_role_codes": ["conducteur_travaux"],
            "related_role_codes": ["chef_projet", "chef_chantier"],
            "unit_code": "SRV-PROJ",
            "unit_name": "Execution projet",
            "unit_type": "service",
            "unit_description": "Pilote les operations terrain, le planning et l'avancement chantier.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-TECH",
            "unit_sort_order": 30,
        },
    },
    "acheteur": {
        "matrix_label": "Acheteur",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Acheteur",
            "department": "Achats et approvisionnements",
            "hierarchy_level": 3,
            "default_role_codes": ["acheteur"],
            "related_role_codes": ["responsable_logistique", "logisticien"],
            "unit_code": "SRV-ACHAT",
            "unit_name": "Achats et approvisionnements",
            "unit_type": "service",
            "unit_description": "Coordonne les consultations, commandes et relations fournisseurs.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-LOG",
            "unit_sort_order": 25,
        },
    },
    "assistant_administratif": {
        "matrix_label": "Assist. admin",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Assistant administratif",
            "department": "Direction administrative",
            "hierarchy_level": 4,
            "default_role_codes": ["assistant_administratif"],
            "related_role_codes": ["directeur_administratif", "juriste"],
            "unit_code": "SRV-ADM",
            "unit_name": "Support administratif",
            "unit_type": "service",
            "unit_description": "Assure le suivi des dossiers, courriers et pieces administratives.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-ADM",
            "unit_sort_order": 20,
        },
    },
    "juriste": {
        "matrix_label": "Juriste",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Juriste",
            "department": "Affaires juridiques",
            "hierarchy_level": 3,
            "default_role_codes": ["juriste"],
            "related_role_codes": ["directeur_administratif"],
            "unit_code": "SRV-JUR",
            "unit_name": "Affaires juridiques",
            "unit_type": "service",
            "unit_description": "Suit les contrats, risques juridiques et conformite documentaire.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-ADM",
            "unit_sort_order": 30,
        },
    },
    "logisticien": {
        "matrix_label": "Logisticien",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Logisticien",
            "department": "Coordination logistique",
            "hierarchy_level": 3,
            "default_role_codes": ["logisticien"],
            "related_role_codes": ["responsable_logistique", "magasinier", "acheteur"],
            "unit_code": "SRV-LOG",
            "unit_name": "Coordination logistique",
            "unit_type": "service",
            "unit_description": "Synchronise transports, livraisons et disponibilite des ressources terrain.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "DIR-LOG",
            "unit_sort_order": 15,
        },
    },
    "rh_recruteur": {
        "matrix_label": "RH / Recrut.",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "RH / Recruteur",
            "department": "Ressources humaines",
            "hierarchy_level": 3,
            "default_role_codes": ["rh_recruteur"],
            "related_role_codes": ["responsable_rh"],
            "unit_code": "TEAM-REC",
            "unit_name": "Cellule recrutement",
            "unit_type": "team",
            "unit_description": "Equipe en charge du sourcing, des candidatures et de l'integration.",
            "unit_hierarchy_level": 3,
            "parent_unit_code": "SRV-RH",
            "unit_sort_order": 10,
        },
    },
    "controleur_externe": {
        "matrix_label": "Ctrl. externe",
        "default_assignment": {
            "user_type": "external_controller",
            "job_title": "Controleur externe",
            "department": "Audit externe",
            "hierarchy_level": 2,
            "default_role_codes": ["controleur_externe"],
            "related_role_codes": [],
            "unit_code": "EXT-AUDIT",
            "unit_name": "Audit externe",
            "unit_type": "service",
            "unit_description": "Perimetre reserve aux audits, controles externes et missions de verification.",
            "unit_hierarchy_level": 2,
            "parent_unit_code": "DIR-GEN",
            "unit_sort_order": 60,
        },
    },
    "collaborateur_terrain": {
        "matrix_label": "Terrain",
        "default_assignment": {
            "user_type": "employee",
            "job_title": "Collaborateur terrain",
            "department": "Chantier",
            "hierarchy_level": 4,
            "default_role_codes": ["collaborateur_terrain"],
            "related_role_codes": ["ouvrier", "chef_chantier"],
            "unit_code": "TEAM-CHT",
            "unit_name": "Equipe chantier",
            "unit_type": "team",
            "unit_description": "Equipe d'execution terrain rattachee aux operations projet.",
            "unit_hierarchy_level": 4,
            "parent_unit_code": "SRV-PROJ",
            "unit_sort_order": 40,
        },
    },
    "candidat_job_seeker": {
        "matrix_label": "Chercheur d'emploi",
        "default_assignment": {
            "user_type": "job_seeker",
            "job_title": "Chercheur d'emploi",
            "department": "Parcours candidature",
            "hierarchy_level": 4,
            "default_role_codes": ["candidat_job_seeker"],
            "related_role_codes": [],
        },
    },
}


GLOBAL_PROFILE_TEMPLATES_BY_CODE = {
    template["code"]: template for template in DEFAULT_GLOBAL_PROFILE_TEMPLATES
}
EXPLICIT_PROFILE_TEMPLATES_BY_CODE = {
    template["code"]: template for template in BASE_OPERATIONAL_PROFILE_TEMPLATES
}


def _permission_actions_by_module(permission_codes: list[str]) -> dict[str, set[str]]:
    actions_by_module: dict[str, set[str]] = {}
    for code in permission_codes:
        module, _, action = code.partition(".")
        if not module or not action:
            continue
        actions_by_module.setdefault(module, set()).add(action)
    return actions_by_module


def _format_access_level(actions: set[str]) -> str:
    if "manage" in actions:
        return "Complet"
    if "read" in actions:
        return "Lecture"
    return "Limite"


def _ordered_module_labels(actions_by_module: dict[str, set[str]], *, manage_only: bool = False, read_only: bool = False) -> list[str]:
    labels: list[str] = []
    for module, label in MODULE_LABELS.items():
        actions = actions_by_module.get(module)
        if not actions:
            continue
        if manage_only and "manage" not in actions:
            continue
        if read_only and ("read" not in actions or "manage" in actions):
            continue
        labels.append(label)
    return labels


def _build_system_access_from_permissions(permission_codes: list[str]) -> list[dict[str, str]]:
    actions_by_module = _permission_actions_by_module(permission_codes)
    access_rows = []
    for module, label in MODULE_LABELS.items():
        actions = actions_by_module.get(module)
        if not actions:
            continue
        access_rows.append({"module": label, "level": _format_access_level(actions)})
    return access_rows


def _build_generic_feature_groups(permission_codes: list[str]) -> list[dict[str, list[str]]]:
    actions_by_module = _permission_actions_by_module(permission_codes)
    manage_modules = _ordered_module_labels(actions_by_module, manage_only=True)
    read_modules = _ordered_module_labels(actions_by_module, read_only=True)
    groups: list[dict[str, list[str]]] = []

    if manage_modules:
        groups.append(
            {
                "title": "Execution",
                "items": [f"Gerer {label.lower()}" for label in manage_modules[:4]],
            }
        )

    if read_modules:
        groups.append(
            {
                "title": "Supervision",
                "items": [f"Consulter {label.lower()}" for label in read_modules[:4]],
            }
        )

    if "chat" in actions_by_module or "calls" in actions_by_module:
        groups.append(
            {
                "title": "Coordination",
                "items": [
                    "Collaborer avec les autres equipes",
                    "Partager les informations utiles au bon deroulement des operations",
                ],
            }
        )

    if groups:
        return groups

    return [
        {
            "title": "Perimetre",
            "items": [
                "Consulter les informations autorisees",
                "Appliquer les regles de fonctionnement du profil",
            ],
        }
    ]


def _build_generic_missions(role_name: str, permission_codes: list[str]) -> list[str]:
    actions_by_module = _permission_actions_by_module(permission_codes)
    manage_modules = _ordered_module_labels(actions_by_module, manage_only=True)
    read_modules = _ordered_module_labels(actions_by_module, read_only=True)
    missions: list[str] = []

    if manage_modules:
        scope = ", ".join(label.lower() for label in manage_modules[:2])
        missions.append(f"Piloter {scope}")
    if read_modules:
        scope = ", ".join(label.lower() for label in read_modules[:2])
        missions.append(f"Suivre {scope}")
    missions.append(f"Assurer les responsabilites attendues du poste {role_name.lower()}")

    unique_missions = []
    for mission in missions:
        if mission not in unique_missions:
            unique_missions.append(mission)
    return unique_missions[:4]


def _build_generic_indicators(permission_codes: list[str]) -> list[str]:
    actions_by_module = _permission_actions_by_module(permission_codes)
    module_labels = _ordered_module_labels(actions_by_module)
    if not module_labels:
        return ["Activite du profil"]
    return [f"Suivi {label.lower()}" for label in module_labels[:4]]


def _build_generic_controls() -> list[str]:
    return [
        "Respect des droits d'acces",
        "Tracabilite des actions",
        "Coordination avec les responsables concernes",
    ]


def _build_auto_profile_template(role_template: dict[str, Any]) -> dict[str, Any]:
    code = role_template["code"]
    metadata = AUTO_OPERATIONAL_PROFILE_METADATA.get(code, {})
    assignment = deepcopy(metadata.get("default_assignment") or {})
    inferred_user_type = "employee"
    if code == "controleur_externe":
        inferred_user_type = "external_controller"
    if code == "candidat_job_seeker":
        inferred_user_type = "job_seeker"

    assignment.setdefault("user_type", inferred_user_type)
    assignment.setdefault("job_title", role_template["name"])
    assignment.setdefault("department", role_template["name"])
    assignment.setdefault("hierarchy_level", 3 if inferred_user_type == "employee" else 4)
    assignment.setdefault("default_role_codes", [code])
    assignment.setdefault("related_role_codes", [])

    permission_codes = list(role_template.get("permissions") or [])
    return {
        "code": code,
        "name": metadata.get("name", role_template["name"]),
        "definition": metadata.get("definition", role_template.get("description")),
        "missions": metadata.get("missions", _build_generic_missions(role_template["name"], permission_codes)),
        "system_access": metadata.get("system_access", _build_system_access_from_permissions(permission_codes)),
        "feature_groups": metadata.get("feature_groups", _build_generic_feature_groups(permission_codes)),
        "indicators": metadata.get("indicators", _build_generic_indicators(permission_codes)),
        "controls_title": metadata.get("controls_title", "Points de controle"),
        "controls": metadata.get("controls", _build_generic_controls()),
        "matrix_label": metadata.get("matrix_label", role_template["name"]),
        "default_assignment": assignment,
    }


def _build_operational_profile_templates() -> list[dict[str, Any]]:
    templates: list[dict[str, Any]] = []
    for role_template in DEFAULT_GLOBAL_PROFILE_TEMPLATES:
        code = role_template["code"]
        if code in EXPLICIT_PROFILE_TEMPLATES_BY_CODE:
            template = deepcopy(EXPLICIT_PROFILE_TEMPLATES_BY_CODE[code])
            template.setdefault("matrix_label", AUTO_OPERATIONAL_PROFILE_METADATA.get(code, {}).get("matrix_label", template["name"]))
            templates.append(template)
            continue
        templates.append(_build_auto_profile_template(role_template))
    return templates


def _matrix_level(permission_codes: list[str], modules: set[str]) -> str:
    actions_by_module = _permission_actions_by_module(permission_codes)
    merged_actions: set[str] = set()
    for module in modules:
        merged_actions.update(actions_by_module.get(module, set()))

    if "manage" in merged_actions:
        return "Complet"
    if "read" in merged_actions:
        return "Lecture"
    return "Non"


def _build_auto_access_matrix_row(profile: dict[str, Any]) -> dict[str, str]:
    code = profile["code"]
    role_template = GLOBAL_PROFILE_TEMPLATES_BY_CODE.get(code, {})
    permission_codes = list(role_template.get("permissions") or [])
    return {
        "role": profile.get("matrix_label", profile["name"]),
        "projects": _matrix_level(permission_codes, {"projects"}),
        "inventory": _matrix_level(permission_codes, {"inventory"}),
        "finance": _matrix_level(permission_codes, {"finance"}),
        "hr": _matrix_level(permission_codes, {"users", "attendance", "payroll", "recruitment"}),
    }


def _build_operational_access_matrix() -> list[dict[str, str]]:
    manual_rows_by_code = {
        code: deepcopy(row)
        for code, row in zip(MANUAL_OPERATIONAL_ACCESS_MATRIX_CODES, MANUAL_OPERATIONAL_ACCESS_MATRIX)
    }
    rows: list[dict[str, str]] = []
    for profile in OPERATIONAL_PROFILE_TEMPLATES:
        row = manual_rows_by_code.get(profile["code"])
        rows.append(row if row is not None else _build_auto_access_matrix_row(profile))
    return rows


def _build_role_interactions() -> list[dict[str, str]]:
    extra_rows = [
        {
            "source": "PCA",
            "target": "DG",
            "description": "Suit la gouvernance, les arbitrages majeurs et la trajectoire globale de l'entreprise.",
        },
        {
            "source": "Dir. admin",
            "target": "Assist. admin",
            "description": "Coordonne les dossiers, validations documentaires et echeances administratives.",
        },
        {
            "source": "Dir. admin",
            "target": "Juriste",
            "description": "Cadre les contrats, risques juridiques et points de conformite a traiter.",
        },
        {
            "source": "RH",
            "target": "RH / Recrut.",
            "description": "Oriente le sourcing, les candidatures et l'integration des nouveaux profils.",
        },
        {
            "source": "Resp. logistique",
            "target": "Acheteur",
            "description": "Declenche les approvisionnements, consultations et priorites fournisseurs.",
        },
        {
            "source": "Resp. logistique",
            "target": "Logisticien",
            "description": "Planifie les flux, transports, livraisons et disponibilites materiels.",
        },
        {
            "source": "Chef chantier",
            "target": "Terrain",
            "description": "Diffuse les consignes, suit l'execution et remonte les besoins terrain.",
        },
    ]
    return [*OPERATIONAL_ROLE_INTERACTIONS, *extra_rows]


OPERATIONAL_PROFILE_TEMPLATES = _build_operational_profile_templates()
OPERATIONAL_ROLE_INTERACTIONS = _build_role_interactions()
OPERATIONAL_ACCESS_MATRIX = _build_operational_access_matrix()

CATALOG_PROFILE_ALIAS_MAP = {
    "pca": "directeur_general",
    "directeur_administratif": "daf",
    "controleur_gestion": "daf",
    "chef_chantier": "chef_projet",
    "conducteur_travaux": "chef_projet",
    "logisticien": "magasinier",
    "rh_recruteur": "responsable_rh",
    "collaborateur_terrain": "ouvrier",
}

CATALOG_PROFILE_DISPLAY_ORDER = [
    "directeur_general",
    "directeur_technique",
    "daf",
    "responsable_rh",
    "responsable_logistique",
    "chef_projet",
    "comptable",
    "acheteur",
    "magasinier",
    "assistant_administratif",
    "juriste",
    "informaticien",
    "ouvrier",
    "controleur_externe",
    "candidat_job_seeker",
]

PROFILE_LABELS_BY_CODE = {
    template["code"]: str(template.get("matrix_label") or template["name"])
    for template in OPERATIONAL_PROFILE_TEMPLATES
}
PROFILE_CODES_BY_LABEL: dict[str, str] = {}
for code, label in PROFILE_LABELS_BY_CODE.items():
    PROFILE_CODES_BY_LABEL.setdefault(label, code)


def _resolve_catalog_profile_code(profile_code: str | None) -> str | None:
    normalized = str(profile_code or "").strip().lower()
    if not normalized:
        return None
    return CATALOG_PROFILE_ALIAS_MAP.get(normalized, normalized)


def _resolve_catalog_profile_label(label: str | None) -> str | None:
    normalized = str(label or "").strip()
    if not normalized:
        return None

    code = PROFILE_CODES_BY_LABEL.get(normalized)
    if code is None:
        return normalized

    canonical_code = _resolve_catalog_profile_code(code) or code
    return PROFILE_LABELS_BY_CODE.get(canonical_code, normalized)


def _build_catalog_operational_profile_templates() -> list[dict[str, Any]]:
    templates_by_code = {template["code"]: template for template in OPERATIONAL_PROFILE_TEMPLATES}
    return [
        deepcopy(templates_by_code[code])
        for code in CATALOG_PROFILE_DISPLAY_ORDER
        if code in templates_by_code
    ]


def _build_catalog_operational_access_matrix() -> list[dict[str, str]]:
    rows_by_code = {
        profile["code"]: deepcopy(row)
        for profile, row in zip(OPERATIONAL_PROFILE_TEMPLATES, OPERATIONAL_ACCESS_MATRIX)
    }
    return [
        rows_by_code[code]
        for code in CATALOG_PROFILE_DISPLAY_ORDER
        if code in rows_by_code
    ]


def _build_catalog_role_interactions() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen_pairs: set[tuple[str, str]] = set()

    for row in OPERATIONAL_ROLE_INTERACTIONS:
        source = _resolve_catalog_profile_label(row.get("source"))
        target = _resolve_catalog_profile_label(row.get("target"))
        if not source or not target or source == target:
            continue

        pair = (source, target)
        if pair in seen_pairs:
            continue

        seen_pairs.add(pair)
        items.append(
            {
                "source": source,
                "target": target,
                "description": row["description"],
            }
        )

    return items


CATALOG_OPERATIONAL_PROFILE_TEMPLATES = _build_catalog_operational_profile_templates()
CATALOG_OPERATIONAL_ROLE_INTERACTIONS = _build_catalog_role_interactions()
CATALOG_OPERATIONAL_ACCESS_MATRIX = _build_catalog_operational_access_matrix()


def list_operational_profile_templates(*, include_aliases: bool = False) -> list[dict[str, Any]]:
    templates = OPERATIONAL_PROFILE_TEMPLATES if include_aliases else CATALOG_OPERATIONAL_PROFILE_TEMPLATES
    return deepcopy(templates)


def list_operational_role_interactions(*, include_aliases: bool = False) -> list[dict[str, str]]:
    rows = OPERATIONAL_ROLE_INTERACTIONS if include_aliases else CATALOG_OPERATIONAL_ROLE_INTERACTIONS
    return deepcopy(rows)


def list_operational_access_matrix(*, include_aliases: bool = False) -> list[dict[str, str]]:
    rows = OPERATIONAL_ACCESS_MATRIX if include_aliases else CATALOG_OPERATIONAL_ACCESS_MATRIX
    return deepcopy(rows)


def get_operational_profile_template(profile_code: str | None) -> dict[str, Any] | None:
    normalized = str(profile_code or "").strip().lower()
    if not normalized:
        return None

    for template in OPERATIONAL_PROFILE_TEMPLATES:
        if template["code"] == normalized:
            return deepcopy(template)

    return None


def infer_operational_profile_code(
    *,
    role_codes: list[str] | None = None,
    job_title: str | None = None,
    department: str | None = None,
) -> str | None:
    normalized_role_codes = {str(code or "").strip().lower() for code in role_codes or []}
    normalized_job_title = str(job_title or "").strip().lower()
    normalized_department = str(department or "").strip().lower()
    best_code = None
    best_score = 0

    for template in OPERATIONAL_PROFILE_TEMPLATES:
        assignment = dict(template.get("default_assignment") or {})
        default_role_codes = {str(code).strip().lower() for code in assignment.get("default_role_codes") or []}
        related_role_codes = {str(code).strip().lower() for code in assignment.get("related_role_codes") or []}
        score = 0

        if default_role_codes and default_role_codes.issubset(normalized_role_codes):
            score += 10 + len(default_role_codes)
        score += len(related_role_codes.intersection(normalized_role_codes)) * 2
        if normalized_job_title and normalized_job_title == str(assignment.get("job_title") or "").strip().lower():
            score += 3
        if normalized_department and normalized_department == str(assignment.get("department") or "").strip().lower():
            score += 2

        if score > best_score:
            best_score = score
            best_code = template["code"]

    return best_code
