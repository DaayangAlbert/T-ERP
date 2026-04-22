from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any, Mapping


ZERO = Decimal("0")


def _pick(data: Mapping[str, Any], *keys: str, default: Any = "") -> Any:
    for key in keys:
        if key in data and data[key] not in (None, ""):
            return data[key]
    return default


def _humanize_key(key: str) -> str:
    return key.replace("_", " ").strip().title()


@dataclass(slots=True)
class CompanyInfo:
    name: str
    taxpayer_number: str = ""
    postal_box: str = ""
    city: str = ""
    phone: str = ""
    email: str = ""
    country: str = ""
    logo_path: str | None = None

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "CompanyInfo":
        return cls(
            name=str(_pick(data, "name", "company_name", "nom_entreprise", "raison_sociale", default="")).strip(),
            taxpayer_number=str(
                _pick(data, "taxpayer_number", "n_contribuable", "numero_contribuable", default="")
            ).strip(),
            postal_box=str(_pick(data, "postal_box", "bp", default="")).strip(),
            city=str(_pick(data, "city", "ville", default="")).strip(),
            phone=str(_pick(data, "phone", "telephone", "tel", default="")).strip(),
            email=str(_pick(data, "email", default="")).strip(),
            country=str(_pick(data, "country", "pays", default="")).strip(),
            logo_path=str(_pick(data, "logo_path", default="")).strip() or None,
        )


@dataclass(slots=True)
class RubricConfig:
    key: str
    code: str
    libelle: str
    base_label: str = ""
    always_show: bool = False

    @classmethod
    def from_dict(cls, key: str, data: Mapping[str, Any]) -> "RubricConfig":
        return cls(
            key=key,
            code=str(_pick(data, "code", default=key.upper())).strip(),
            libelle=str(_pick(data, "libelle", "label", default=_humanize_key(key))).strip(),
            base_label=str(_pick(data, "base_label", default="")).strip(),
            always_show=bool(_pick(data, "always_show", default=False)),
        )


@dataclass(slots=True)
class PayrollConfig:
    cnps_ceiling: Decimal
    cnps_salarial_rate: Decimal
    cfp_patronal_rate: Decimal
    fne_patronal_rate: Decimal
    cot_pf_patronal_rate: Decimal
    cot_pvid_patronal_rate: Decimal
    cot_at_patronal_rate: Decimal
    devise: str = "F CFA"
    format_date: str = "%d/%m/%Y"
    format_montant: str = "fr"
    allow_override: bool = True
    cac_rate: Decimal | None = None
    cfs_rate: Decimal | None = None
    default_tc_amount: Decimal | None = None
    default_rav_amount: Decimal | None = None
    rubriques: dict[str, RubricConfig] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Mapping[str, Any], parse_decimal, normalize_rate) -> "PayrollConfig":
        rubriques = {
            key: RubricConfig.from_dict(key, value)
            for key, value in dict(_pick(data, "rubriques", default={})).items()
        }
        return cls(
            cnps_ceiling=parse_decimal(_pick(data, "cnps_ceiling", default=ZERO)),
            cnps_salarial_rate=normalize_rate(_pick(data, "cnps_salarial_rate", default=ZERO)),
            cfp_patronal_rate=normalize_rate(_pick(data, "cfp_patronal_rate", default=ZERO)),
            fne_patronal_rate=normalize_rate(_pick(data, "fne_patronal_rate", default=ZERO)),
            cot_pf_patronal_rate=normalize_rate(_pick(data, "cot_pf_patronal_rate", default=ZERO)),
            cot_pvid_patronal_rate=normalize_rate(_pick(data, "cot_pvid_patronal_rate", default=ZERO)),
            cot_at_patronal_rate=normalize_rate(_pick(data, "cot_at_patronal_rate", default=ZERO)),
            devise=str(_pick(data, "devise", "currency", default="F CFA")).strip(),
            format_date=str(_pick(data, "format_date", default="%d/%m/%Y")).strip(),
            format_montant=str(_pick(data, "format_montant", default="fr")).strip(),
            allow_override=bool(_pick(data, "allow_override", default=True)),
            cac_rate=normalize_rate(_pick(data, "cac_rate", default=None))
            if _pick(data, "cac_rate", default=None) is not None
            else None,
            cfs_rate=normalize_rate(_pick(data, "cfs_rate", default=None))
            if _pick(data, "cfs_rate", default=None) is not None
            else None,
            default_tc_amount=parse_decimal(_pick(data, "default_tc_amount", default=None))
            if _pick(data, "default_tc_amount", default=None) not in (None, "")
            else None,
            default_rav_amount=parse_decimal(_pick(data, "default_rav_amount", default=None))
            if _pick(data, "default_rav_amount", default=None) not in (None, "")
            else None,
            rubriques=rubriques,
        )

    def rubric(self, key: str) -> RubricConfig:
        return self.rubriques.get(
            key,
            RubricConfig(key=key, code=key.upper(), libelle=_humanize_key(key)),
        )


@dataclass(slots=True)
class EmployeePayrollData:
    employee_id: str
    nom: str
    prenom: str
    matricule: str
    categorie: str = ""
    echelon: str = ""
    anciennete_mois: int = 0
    cnps_number: str = ""
    convention_collective: str = ""
    emploi: str = ""
    departement: str = ""
    date_embauche: date | None = None
    horaire: str = ""
    situation_famille: str = ""
    numero_compte: str = ""
    domiciliation: str = ""
    jours_payes: Decimal = ZERO
    salaire_base_mensuel: Decimal = ZERO
    indemn_transport: Decimal = ZERO
    autres_gains: Decimal = ZERO
    mode_paiement: str = ""
    date_debut_periode: date | None = None
    date_fin_periode: date | None = None
    date_paiement: date | None = None
    brut_imposable: Decimal | None = None
    irpp: Decimal | None = None
    cac: Decimal | None = None
    tc: Decimal | None = None
    rav: Decimal | None = None
    cfs: Decimal | None = None
    observation: str = ""
    source_values: dict[str, Any] = field(default_factory=dict)
    source_row_number: int | None = None

    @property
    def full_name(self) -> str:
        return f"{self.nom} {self.prenom}".strip()


@dataclass(slots=True)
class PayrollLine:
    code: str
    libelle: str
    nombre: Any = ""
    base: Any = ""
    taux: Any = ""
    montant_plus: Decimal = ZERO
    montant_minus: Decimal = ZERO
    retenue_patronale: Decimal = ZERO


@dataclass(slots=True)
class PayrollTotals:
    montant_plus: Decimal = ZERO
    montant_minus: Decimal = ZERO
    retenue_patronale: Decimal = ZERO


@dataclass(slots=True)
class PayrollSummary:
    brut: Decimal = ZERO
    brut_imposable: Decimal = ZERO
    appointement: Decimal = ZERO
    net_a_payer: Decimal = ZERO
    charges_sociales: Decimal = ZERO
    charges_fiscales: Decimal = ZERO
    libelles: str = ""
    cumul: str = ""


@dataclass(slots=True)
class PayrollResult:
    employee: EmployeePayrollData
    company: CompanyInfo
    config: PayrollConfig
    lines: list[PayrollLine]
    totals: PayrollTotals
    summary: PayrollSummary
    salaire_brut: Decimal
    brut_imposable: Decimal
    base_cnps: Decimal
    cnps_salariale: Decimal
    cfp_patronal: Decimal
    fne_patronal: Decimal
    cot_pf_patronal: Decimal
    cot_pvid_patronal: Decimal
    cot_at_patronal: Decimal
    total_retenues: Decimal
    total_patronal: Decimal
    net_a_payer: Decimal
    montant_en_lettres: str
    output_path: Path | None = None

    @property
    def period_key(self) -> str:
        reference_date = self.employee.date_fin_periode or self.employee.date_debut_periode
        if reference_date is None:
            return "sans-periode"
        return reference_date.strftime("%Y-%m")
