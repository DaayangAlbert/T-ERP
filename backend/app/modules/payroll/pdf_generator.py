from __future__ import annotations

from html import escape
from pathlib import Path

from .models import CompanyInfo, PayrollConfig, PayrollResult
from .utils import ensure_directory, format_currency_fr, format_date_fr, format_number_fr, format_rate_fr


class PayslipPDFGenerator:
    def __init__(self, company: CompanyInfo, config: PayrollConfig):
        self.company = company
        self.config = config

    def generate_payslip_pdf(self, payroll_result: PayrollResult, output_path: str | Path) -> Path:
        try:
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import mm
            from reportlab.platypus import KeepInFrame, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        except ImportError as error:
            raise RuntimeError(
                "La generation PDF requiert reportlab. Installez les dependances du module payroll."
            ) from error

        destination = Path(output_path)
        ensure_directory(destination.parent)

        left_margin = 8 * mm
        right_margin = 8 * mm
        top_margin = 8 * mm
        bottom_margin = 8 * mm
        available_width = A4[0] - left_margin - right_margin
        available_height = A4[1] - top_margin - bottom_margin

        styles = getSampleStyleSheet()
        normal = styles["BodyText"]
        normal.fontName = "Helvetica"
        normal.fontSize = 7
        normal.leading = 8

        small_style = ParagraphStyle(
            "PayslipSmall",
            parent=normal,
            fontName="Helvetica",
            fontSize=6.4,
            leading=7.1,
        )
        small_bold_style = ParagraphStyle(
            "PayslipSmallBold",
            parent=small_style,
            fontName="Helvetica-Bold",
        )
        title_style = ParagraphStyle(
            "PayslipTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            alignment=TA_CENTER,
            textColor=colors.black,
            spaceAfter=4,
        )
        section_style = ParagraphStyle(
            "SectionTitle",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=7.4,
            alignment=TA_LEFT,
            textColor=colors.black,
            spaceBefore=2,
            spaceAfter=2,
        )
        emphasis_style = ParagraphStyle(
            "Emphasis",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=8.2,
            leading=9,
        )
        legal_style = ParagraphStyle(
            "Legal",
            parent=small_style,
            alignment=TA_CENTER,
            fontSize=5.7,
            leading=6.3,
        )

        employee = payroll_result.employee
        story = []

        meta_table = Table(
            [
                [
                    Paragraph(
                        f"<b>Paie du</b> {escape(format_date_fr(employee.date_debut_periode, self.config.format_date))} "
                        f"<b>au</b> {escape(format_date_fr(employee.date_fin_periode, self.config.format_date))}",
                        small_style,
                    ),
                    Paragraph(
                        f"<b>Paiement le</b> {escape(format_date_fr(employee.date_paiement, self.config.format_date))}",
                        small_style,
                    ),
                    Paragraph(
                        f"<b>{escape(employee.mode_paiement or 'NON RENSEIGNE')}</b>",
                        small_style,
                    ),
                ]
            ],
            colWidths=[79 * mm, 66 * mm, 45 * mm],
        )
        meta_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 1.8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("ALIGN", (2, 0), (2, 0), "CENTER"),
                    ("LINEBEFORE", (1, 0), (1, 0), 0.45, colors.black),
                    ("LINEBEFORE", (2, 0), (2, 0), 0.45, colors.black),
                ]
            )
        )

        company_rows = [
            ("N° Contribuable", self.company.taxpayer_number),
            ("BP", self.company.postal_box),
            ("Ville", self.company.city),
            ("Tél", self.company.phone),
        ]
        employee_rows = [
            ("Nom", employee.full_name),
            ("Matricule", employee.matricule),
            ("Catégorie", employee.categorie),
            ("Échelon", employee.echelon),
            ("Ancienneté", f"{employee.anciennete_mois} mois" if employee.anciennete_mois else ""),
            ("N° CNPS", employee.cnps_number),
            ("Conv. coll.", employee.convention_collective),
            ("Emploi occupé", employee.emploi),
            ("Département", employee.departement),
            ("Date d'embauche", format_date_fr(employee.date_embauche, self.config.format_date)),
            ("Horaire", employee.horaire),
            ("Situation de famille", employee.situation_famille),
            ("N° de Compte", employee.numero_compte),
            ("Domiciliation", employee.domiciliation),
        ]
        company_panel = self._build_form_block(
            heading=self.company.name,
            rows=company_rows,
            header_style=small_bold_style,
            text_style=small_style,
            heading_background=colors.HexColor("#f4f4f4"),
        )
        employee_panel = self._build_form_block(
            heading="Informations salarié",
            rows=employee_rows,
            header_style=small_bold_style,
            text_style=small_style,
            heading_background=colors.white,
        )
        identity_table = Table([[company_panel, employee_panel]], colWidths=[64 * mm, 126 * mm])
        identity_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        header_shell = Table(
            [
                [Paragraph("BULLETIN DE PAIE", title_style)],
                [meta_table],
                [identity_table],
            ],
            colWidths=[190 * mm],
        )
        header_shell.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
                    ("LINEBELOW", (0, 0), (0, 0), 0.6, colors.black),
                    ("LINEBELOW", (0, 1), (0, 1), 0.6, colors.black),
                    ("ALIGN", (0, 0), (0, 0), "CENTER"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )

        story.append(header_shell)
        story.append(Spacer(1, 4))

        header = ["Code", "Libellés", "Nombre", "Base", "Taux", "Montant +", "Montant -", "Ret. patron."]
        body = [header]
        for line in payroll_result.lines:
            body.append(
                [
                    line.code,
                    line.libelle,
                    format_number_fr(line.nombre) if line.nombre not in ("", None) else "",
                    self._display_base(line.base),
                    format_rate_fr(line.taux),
                    self._display_amount(line.montant_plus),
                    self._display_amount(line.montant_minus),
                    self._display_amount(line.retenue_patronale),
                ]
            )
        body.append(
            [
                "",
                "TOTAL",
                "",
                "",
                "",
                format_currency_fr(payroll_result.totals.montant_plus),
                format_currency_fr(payroll_result.totals.montant_minus),
                format_currency_fr(payroll_result.totals.retenue_patronale),
            ]
        )

        main_table = Table(
            body,
            colWidths=[14 * mm, 52 * mm, 14 * mm, 18 * mm, 14 * mm, 25 * mm, 25 * mm, 24 * mm],
            repeatRows=1,
        )
        main_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
                    ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.black),
                    ("FONTSIZE", (0, 0), (-1, -1), 6.2),
                    ("LEADING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 1.8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ("ALIGN", (0, 0), (1, -1), "LEFT"),
                ]
            )
        )
        story.append(main_table)
        story.append(Spacer(1, 4))

        summary_rows = [
            ["BRUT", format_currency_fr(payroll_result.summary.brut)],
            ["BRUT IMPOSABLE", format_currency_fr(payroll_result.summary.brut_imposable)],
            ["JOURS PAYES", format_number_fr(payroll_result.summary.appointement)],
            ["CH. SOCIALES", format_currency_fr(payroll_result.summary.charges_sociales)],
            ["CH. FISCALES", format_currency_fr(payroll_result.summary.charges_fiscales)],
            ["NET A PAYER", format_currency_fr(payroll_result.summary.net_a_payer)],
            ["LIBELLES", payroll_result.summary.libelles],
        ]
        summary_table = self._build_kv_table(
            summary_rows,
            label_width=34 * mm,
            value_width=52 * mm,
            font_size=6.4,
            cell_padding=1.8,
            header="RÉSUMÉ",
        )

        net_table = Table(
            [
                ["NET À PAYER", ""],
                ["Montant", format_currency_fr(payroll_result.net_a_payer, self.config.devise, include_currency=True)],
                ["En lettres", payroll_result.montant_en_lettres],
            ],
            colWidths=[24 * mm, 48 * mm],
        )
        net_table.setStyle(
            TableStyle(
                [
                    ("SPAN", (0, 0), (1, 0)),
                    ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#f2f2f2")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
                    ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.black),
                    ("FONTNAME", (0, 0), (1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                    ("FONTSIZE", (1, 1), (1, 1), 8.8),
                    ("ALIGN", (0, 0), (1, 0), "CENTER"),
                    ("ALIGN", (1, 1), (1, 1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2.2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )

        observation_table = Table(
            [
                [Paragraph("<b>OBSERVATION</b>", small_style), Paragraph("<b>EMARGEMENT</b>", small_style)],
                [Paragraph(escape(employee.observation or " "), small_style), Paragraph(" ", small_style)],
            ],
            colWidths=[48 * mm, 48 * mm],
            rowHeights=[4.5 * mm, 9.5 * mm],
        )
        observation_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
                    ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.black),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2f2f2")),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )

        footer_table = Table(
            [[summary_table, net_table, observation_table]],
            colWidths=[55 * mm, 72 * mm, 63 * mm],
        )
        footer_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(footer_table)
        story.append(Spacer(1, 2))
        story.append(
            Paragraph(
                "Pour vous aider a faire valoir vos droits, conservez ce bulletin de paie sans limitation de duree.",
                legal_style,
            )
        )

        document = SimpleDocTemplate(
            str(destination),
            pagesize=A4,
            rightMargin=right_margin,
            leftMargin=left_margin,
            topMargin=top_margin,
            bottomMargin=bottom_margin,
        )
        document.build([KeepInFrame(available_width, available_height, story, mode="shrink")])
        return destination

    def _display_amount(self, value) -> str:
        if value in (None, "", 0):
            return ""
        return format_currency_fr(value)

    def _display_base(self, value) -> str:
        if value in (None, "", 0):
            return ""
        if isinstance(value, str):
            return value
        return format_currency_fr(value)

    def _build_form_block(self, heading, rows, *, header_style, text_style, heading_background):
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import Paragraph, Table, TableStyle

        data = [[Paragraph(escape(heading or " "), header_style), ""]]
        data.extend(
            [
                [
                    Paragraph(escape(label), header_style) if label else "",
                    Paragraph(escape(value or " "), text_style),
                ]
                for label, value in rows
            ]
        )

        table = Table(data, colWidths=[24 * mm, 100 * mm if len(rows) > 8 else 40 * mm])
        table.setStyle(
            TableStyle(
                [
                    ("SPAN", (0, 0), (1, 0)),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.black),
                    ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.black),
                    ("BACKGROUND", (0, 0), (1, 0), heading_background),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 1.3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1.3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        return table

    def _build_kv_table(self, rows, label_width=None, value_width=None, *, font_size=8, cell_padding=4, header=None):
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import Table, TableStyle

        effective_label_width = label_width or 35 * mm
        effective_value_width = value_width or 50 * mm

        data = []
        if header:
            data.append([header, ""])
        data.extend([[f"{label} :", value or ""] for label, value in rows])

        styles = [
            ("BOX", (0, 0), (-1, -1), 0.8, colors.black),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.black),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), font_size),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), cell_padding),
            ("BOTTOMPADDING", (0, 0), (-1, -1), cell_padding),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ]
        if header:
            styles.extend(
                [
                    ("SPAN", (0, 0), (1, 0)),
                    ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#f2f2f2")),
                    ("FONTNAME", (0, 0), (1, 0), "Helvetica-Bold"),
                    ("ALIGN", (0, 0), (1, 0), "LEFT"),
                ]
            )

        table = Table(data, colWidths=[effective_label_width, effective_value_width])
        table.setStyle(TableStyle(styles))
        return table

    def _join_values(self, *values, separator=" / ") -> str:
        return separator.join(str(value).strip() for value in values if str(value or "").strip())


def generate_payslip_pdf(
    payroll_result: PayrollResult,
    company: CompanyInfo,
    config: PayrollConfig,
    output_path: str | Path,
) -> Path:
    generator = PayslipPDFGenerator(company=company, config=config)
    return generator.generate_payslip_pdf(payroll_result=payroll_result, output_path=output_path)
