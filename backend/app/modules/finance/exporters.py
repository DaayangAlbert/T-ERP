from __future__ import annotations

import csv
from io import BytesIO
from io import StringIO
from typing import Any

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _mapping_rows(mapping: dict[str, Any], *, key_label: str = "metric", value_label: str = "value") -> list[dict[str, Any]]:
    return [{key_label: key, value_label: value} for key, value in mapping.items()]


def _safe_sheet_title(title: str) -> str:
    cleaned = "".join(ch for ch in title if ch not in "\\/*?:[]")
    return cleaned[:31] or "Sheet"


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def _report_sections(report_name: str, payload: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    if report_name == "dashboard":
        return (
            "Dashboard finance",
            [
                {
                    "title": "KPI",
                    "columns": [("metric", "Metric"), ("value", "Value")],
                    "rows": _mapping_rows(payload.get("kpis", {})),
                },
                {
                    "title": "Alerts",
                    "columns": [("level", "Level"), ("code", "Code"), ("message", "Message")],
                    "rows": payload.get("alerts", []),
                },
                {
                    "title": "Treasury",
                    "columns": [("code", "Code"), ("name", "Name"), ("current_balance", "Balance"), ("alert_threshold", "Threshold")],
                    "rows": payload.get("treasury", []),
                },
            ],
        )
    if report_name == "cash_flow":
        return (
            "Cash flow",
            [
                {
                    "title": "Summary",
                    "columns": [("metric", "Metric"), ("value", "Value")],
                    "rows": _mapping_rows(payload.get("summary", {})),
                },
                {
                    "title": "Accounts",
                    "columns": [("account_name", "Account"), ("incoming", "Incoming"), ("outgoing", "Outgoing"), ("balance", "Balance")],
                    "rows": payload.get("accounts", []),
                },
                {
                    "title": "Recent movements",
                    "columns": [("movement_date", "Date"), ("direction", "Direction"), ("reference", "Reference"), ("amount", "Amount"), ("running_balance", "Running balance")],
                    "rows": payload.get("recent_movements", []),
                },
            ],
        )
    if report_name == "tax_summary":
        return (
            "Tax summary",
            [
                {
                    "title": "Summary",
                    "columns": [("metric", "Metric"), ("value", "Value")],
                    "rows": _mapping_rows(payload.get("summary", {})),
                },
                {
                    "title": "Tax documents",
                    "columns": [("source_type", "Source"), ("reference", "Reference"), ("document_date", "Date"), ("partner_name", "Partner"), ("base_amount", "Base"), ("tax_rate", "Rate"), ("tax_amount", "Tax"), ("total_amount", "Total")],
                    "rows": payload.get("documents", []),
                },
            ],
        )
    if report_name == "notifications":
        return (
            "Finance notifications",
            [
                {
                    "title": "Notifications",
                    "columns": [("severity", "Severity"), ("code", "Code"), ("title", "Title"), ("message", "Message"), ("event_date", "Date"), ("reference", "Reference")],
                    "rows": payload.get("items", []),
                }
            ],
        )
    if report_name in {"expenses", "revenues", "invoices"}:
        columns_by_report = {
            "expenses": [("expense_number", "Number"), ("expense_date", "Date"), ("category", "Category"), ("amount", "Gross"), ("tax_amount", "Tax"), ("net_amount", "Net"), ("approval_status", "Approval")],
            "revenues": [("revenue_number", "Number"), ("revenue_date", "Date"), ("revenue_type", "Type"), ("amount", "Gross"), ("tax_amount", "Tax"), ("net_amount", "Net"), ("collection_status", "Collection")],
            "invoices": [("invoice_number", "Number"), ("issued_on", "Date"), ("customer_name", "Customer"), ("subtotal_amount", "Subtotal"), ("tax_amount", "Tax"), ("amount_total", "Total"), ("status", "Status")],
        }
        labels_by_report = {
            "expenses": "Expenses",
            "revenues": "Revenues",
            "invoices": "Invoices",
        }
        return (
            labels_by_report[report_name],
            [
                {
                    "title": labels_by_report[report_name],
                    "columns": columns_by_report[report_name],
                    "rows": payload.get("items", []),
                }
            ],
        )
    if report_name == "accounting_journal":
        return (
            "Accounting journal",
            [
                {
                    "title": "Journal lines",
                    "columns": [
                        ("entry_reference", "Entry"),
                        ("line_number", "Line"),
                        ("entry_date", "Date"),
                        ("journal_code", "Journal"),
                        ("journal_name", "Journal name"),
                        ("piece_reference", "Piece"),
                        ("label", "Label"),
                        ("account_code", "Account"),
                        ("account_name", "Account name"),
                        ("partner_code", "Partner code"),
                        ("partner_name", "Partner name"),
                        ("debit", "Debit"),
                        ("credit", "Credit"),
                        ("currency", "Currency"),
                        ("project_code", "Project code"),
                        ("project_name", "Project name"),
                        ("source_type", "Source"),
                        ("source_id", "Source id"),
                        ("tax_rate", "Tax rate"),
                        ("due_date", "Due date"),
                    ],
                    "rows": payload.get("items", []),
                },
                {
                    "title": "Summary",
                    "columns": [("metric", "Metric"), ("value", "Value")],
                    "rows": _mapping_rows(payload.get("summary", {})),
                },
            ],
        )
    raise ValueError(f"Unsupported report: {report_name}")


def _build_xlsx(title: str, sections: list[dict[str, Any]]) -> BytesIO:
    workbook = Workbook()
    first_sheet = workbook.active
    workbook.remove(first_sheet)

    for section in sections:
        sheet = workbook.create_sheet(_safe_sheet_title(section["title"]))
        headers = [label for _, label in section["columns"]]
        sheet.append(headers)
        for row in section["rows"]:
            sheet.append([row.get(key) for key, _ in section["columns"]])
        for column_index, _header in enumerate(headers, start=1):
            sheet.column_dimensions[chr(64 + min(column_index, 26))].width = 22

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def _build_pdf(title: str, sections: list[dict[str, Any]]) -> BytesIO:
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]), Spacer(1, 12)]

    for section in sections:
        story.append(Paragraph(section["title"], styles["Heading3"]))
        rows = [[label for _, label in section["columns"]]]
        for row in section["rows"]:
            rows.append([_stringify(row.get(key)) for key, _ in section["columns"]])
        if len(rows) == 1:
            rows.append(["" for _ in section["columns"]])
        table = Table(rows, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("LEADING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("TOPPADDING", (0, 1), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
                ]
            )
        )
        story.extend([table, Spacer(1, 12)])

    document.build(story)
    buffer.seek(0)
    return buffer


def _build_csv(_title: str, sections: list[dict[str, Any]]) -> BytesIO:
    text_buffer = StringIO()
    writer = csv.writer(text_buffer)

    single_section = len(sections) == 1
    for section_index, section in enumerate(sections):
        if not single_section:
            if section_index > 0:
                writer.writerow([])
            writer.writerow([section["title"]])
        headers = [label for _, label in section["columns"]]
        writer.writerow(headers)
        for row in section["rows"]:
            writer.writerow([_stringify(row.get(key)) for key, _ in section["columns"]])

    data = text_buffer.getvalue().encode("utf-8-sig")
    buffer = BytesIO(data)
    buffer.seek(0)
    return buffer


def build_finance_export_document(report_name: str, export_format: str, payload: dict[str, Any]) -> tuple[BytesIO, str, str]:
    title, sections = _report_sections(report_name, payload)
    if export_format == "csv":
        return _build_csv(title, sections), "text/csv", f"{report_name}.csv"
    if export_format == "xlsx":
        return _build_xlsx(title, sections), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{report_name}.xlsx"
    if export_format == "pdf":
        return _build_pdf(title, sections), "application/pdf", f"{report_name}.pdf"
    raise ValueError(f"Unsupported export format: {export_format}")
