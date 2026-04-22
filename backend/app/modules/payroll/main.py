from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Iterable

if __package__ in {None, ""}:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
    from app.modules.payroll.calculator import PayrollCalculator
    from app.modules.payroll.data_loader import load_company_info, load_employee_data, load_payroll_config
    from app.modules.payroll.models import EmployeePayrollData, PayrollResult
    from app.modules.payroll.pdf_generator import PayslipPDFGenerator
    from app.modules.payroll.utils import ensure_directory, slugify_filename_component
else:
    from .calculator import PayrollCalculator
    from .data_loader import load_company_info, load_employee_data, load_payroll_config
    from .models import EmployeePayrollData, PayrollResult
    from .pdf_generator import PayslipPDFGenerator
    from .utils import ensure_directory, slugify_filename_component


LOGGER = logging.getLogger(__name__)
MODULE_DIR = Path(__file__).resolve().parent
DEFAULT_COMPANY_PATH = MODULE_DIR / "company.json"
DEFAULT_CONFIG_PATH = MODULE_DIR / "payroll_config.json"
DEFAULT_SOURCE_PATH = MODULE_DIR / "data" / "employes_paie.xlsx"
DEFAULT_OUTPUT_ROOT = MODULE_DIR / "output"


class PayrollBatchProcessor:
    def __init__(
        self,
        company_path=DEFAULT_COMPANY_PATH,
        config_path=DEFAULT_CONFIG_PATH,
        output_root=DEFAULT_OUTPUT_ROOT,
        company=None,
        config=None,
    ):
        self.company = company or load_company_info(company_path)
        self.config = config or load_payroll_config(config_path)
        self.output_root = Path(output_root)
        self.calculator = PayrollCalculator(config=self.config, company=self.company)
        self.pdf_generator = PayslipPDFGenerator(company=self.company, config=self.config)

    def generate_all_payslips(
        self,
        employees: Iterable[EmployeePayrollData],
        create_pdf: bool = True,
        allow_override: bool | None = None,
    ) -> list[PayrollResult]:
        results: list[PayrollResult] = []
        for employee in employees:
            result = self.calculator.calculate_payroll(employee, allow_override=allow_override)
            result.output_path = self._build_output_path(result)
            if create_pdf:
                self.pdf_generator.generate_payslip_pdf(result, result.output_path)
            results.append(result)
        return results

    def generate_for_employee(
        self,
        employee: EmployeePayrollData,
        create_pdf: bool = True,
        allow_override: bool | None = None,
    ) -> PayrollResult:
        result = self.calculator.calculate_payroll(employee, allow_override=allow_override)
        result.output_path = self._build_output_path(result)
        if create_pdf:
            self.pdf_generator.generate_payslip_pdf(result, result.output_path)
        return result

    def _build_output_path(self, result: PayrollResult) -> Path:
        output_dir = ensure_directory(self.output_root / "bulletins" / result.period_key)
        filename = f"bulletin_{slugify_filename_component(result.employee.matricule)}_{result.period_key.replace('-', '_')}.pdf"
        return output_dir / filename


def generate_all_payslips(
    source_path=DEFAULT_SOURCE_PATH,
    company_path=DEFAULT_COMPANY_PATH,
    config_path=DEFAULT_CONFIG_PATH,
    output_root=DEFAULT_OUTPUT_ROOT,
    employee_id: str | None = None,
    dry_run: bool = False,
    allow_override: bool | None = None,
) -> list[PayrollResult]:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    employees = load_employee_data(source_path, logger=LOGGER)
    if employee_id:
        employees = [employee for employee in employees if employee.employee_id == employee_id or employee.matricule == employee_id]

    if not employees:
        raise ValueError("Aucun employe valide a traiter.")

    processor = PayrollBatchProcessor(company_path=company_path, config_path=config_path, output_root=output_root)
    return processor.generate_all_payslips(employees, create_pdf=not dry_run, allow_override=allow_override)


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generation dynamique des bulletins de paie.")
    parser.add_argument("--company", default=str(DEFAULT_COMPANY_PATH), help="Chemin vers company.json")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Chemin vers payroll_config.json")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE_PATH), help="Chemin vers le fichier Excel ou CSV des employes")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_ROOT), help="Dossier racine de sortie")
    parser.add_argument("--employee-id", default=None, help="Traiter un seul employe par employee_id ou matricule")
    parser.add_argument("--dry-run", action="store_true", help="Calcule les bulletins sans generer les PDF")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_argument_parser()
    args = parser.parse_args(argv)

    try:
        results = generate_all_payslips(
            source_path=args.source,
            company_path=args.company,
            config_path=args.config,
            output_root=args.output_dir,
            employee_id=args.employee_id,
            dry_run=args.dry_run,
        )
    except Exception as error:
        LOGGER.error("Echec de generation: %s", error)
        return 1

    for result in results:
        message = (
            f"{result.employee.matricule} | net={result.net_a_payer} | "
            f"sortie={'aucun PDF (dry-run)' if args.dry_run else result.output_path}"
        )
        LOGGER.info(message)

    LOGGER.info("%s bulletin(s) traite(s).", len(results))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
