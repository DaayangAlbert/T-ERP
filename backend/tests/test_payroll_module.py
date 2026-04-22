from decimal import Decimal
from pathlib import Path

from app.modules.payroll.calculator import PayrollCalculator
from app.modules.payroll.data_loader import load_company_info, load_employee_data, load_payroll_config
from app.modules.payroll.models import EmployeePayrollData
from app.modules.payroll.utils import format_currency_fr


PAYROLL_DIR = Path(__file__).resolve().parents[1] / "app" / "modules" / "payroll"


def _build_calculator() -> PayrollCalculator:
    config = load_payroll_config(PAYROLL_DIR / "payroll_config.json")
    company = load_company_info(PAYROLL_DIR / "company.json")
    return PayrollCalculator(config=config, company=company)


def _build_employee(**overrides) -> EmployeePayrollData:
    payload = {
        "employee_id": "EMP-TEST-001",
        "nom": "MEBENGA",
        "prenom": "JEAN JACQUES",
        "matricule": "22-031",
        "jours_payes": Decimal("28"),
        "salaire_base_mensuel": Decimal("200000"),
        "indemn_transport": Decimal("42000"),
        "autres_gains": Decimal("0"),
        "brut_imposable": Decimal("200000"),
        "irpp": Decimal("20000"),
        "cac": Decimal("2000"),
        "tc": Decimal("1500"),
        "rav": Decimal("1950"),
        "cfs": Decimal("2000"),
    }
    payload.update(overrides)
    return EmployeePayrollData(**payload)


def test_cnps_uses_configurable_ceiling():
    calculator = _build_calculator()
    employee = _build_employee(
        salaire_base_mensuel=Decimal("900000"),
        indemn_transport=Decimal("0"),
        brut_imposable=Decimal("900000"),
        irpp=Decimal("0"),
        cac=Decimal("0"),
        tc=Decimal("0"),
        rav=Decimal("0"),
        cfs=Decimal("0"),
    )

    result = calculator.calculate_payroll(employee)

    assert result.base_cnps == Decimal("750000")
    assert result.cnps_salariale == Decimal("31500")


def test_net_a_payer_matches_expected_amount():
    calculator = _build_calculator()
    employee = _build_employee()

    result = calculator.calculate_payroll(employee)

    assert result.salaire_brut == Decimal("242000")
    assert result.total_retenues == Decimal("35850")
    assert result.net_a_payer == Decimal("206150")


def test_patronal_retenues_total_is_computed_from_rates():
    calculator = _build_calculator()
    employee = _build_employee()

    result = calculator.calculate_payroll(employee)

    assert result.cfp_patronal == Decimal("3000")
    assert result.fne_patronal == Decimal("2000")
    assert result.cot_pf_patronal == Decimal("14000")
    assert result.cot_pvid_patronal == Decimal("8400")
    assert result.cot_at_patronal == Decimal("10000")
    assert result.total_patronal == Decimal("37400")


def test_currency_format_uses_french_spacing():
    assert format_currency_fr(Decimal("206150")) == "206 150"


def test_sample_xlsx_structure_is_readable():
    employees = load_employee_data(PAYROLL_DIR / "data" / "employes_paie.xlsx")

    assert len(employees) >= 2
    assert employees[0].matricule == "22-031"
