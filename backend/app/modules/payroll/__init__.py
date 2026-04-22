from .calculator import PayrollCalculator, calculate_payroll
from .data_loader import load_company_info, load_employee_data, load_payroll_config
from .models import CompanyInfo, EmployeePayrollData, PayrollConfig
from .pdf_generator import PayslipPDFGenerator, generate_payslip_pdf


def __getattr__(name):
    if name in {"PayrollBatchProcessor", "generate_all_payslips"}:
        from .main import PayrollBatchProcessor, generate_all_payslips

        return {
            "PayrollBatchProcessor": PayrollBatchProcessor,
            "generate_all_payslips": generate_all_payslips,
        }[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "CompanyInfo",
    "EmployeePayrollData",
    "PayrollCalculator",
    "PayrollConfig",
    "PayslipPDFGenerator",
    "calculate_payroll",
    "generate_payslip_pdf",
    "load_company_info",
    "load_employee_data",
    "load_payroll_config",
    "PayrollBatchProcessor",
    "generate_all_payslips",
]
