from __future__ import annotations

from decimal import Decimal

from .models import CompanyInfo, EmployeePayrollData, PayrollConfig, PayrollLine, PayrollResult, PayrollSummary, PayrollTotals
from .utils import month_label_fr, number_to_french_words, parse_optional_decimal, quantize_amount


ZERO = Decimal("0")


class PayrollCalculator:
    def __init__(self, config: PayrollConfig, company: CompanyInfo):
        self.config = config
        self.company = company

    def calculate_payroll(
        self,
        employee: EmployeePayrollData,
        allow_override: bool | None = None,
    ) -> PayrollResult:
        effective_override = self.config.allow_override if allow_override is None else allow_override

        salaire_base = quantize_amount(employee.salaire_base_mensuel)
        indemn_transport = quantize_amount(employee.indemn_transport)
        autres_gains = quantize_amount(employee.autres_gains)
        salaire_brut_calc = salaire_base + indemn_transport + autres_gains
        salaire_brut = self._resolve_override(employee, "salaire_brut", salaire_brut_calc, effective_override)

        brut_imposable_calc = employee.brut_imposable if employee.brut_imposable is not None else salaire_base
        brut_imposable = self._resolve_override(employee, "brut_imposable", quantize_amount(brut_imposable_calc), effective_override)

        base_cnps_calc = min(brut_imposable, self.config.cnps_ceiling)
        base_cnps = self._resolve_override(employee, "base_cnps", quantize_amount(base_cnps_calc), effective_override)

        irpp = quantize_amount(employee.irpp or ZERO)
        cac_calc = employee.cac if employee.cac is not None else self._calculate_from_rate(irpp, self.config.cac_rate)
        cac = quantize_amount(cac_calc)
        tc = quantize_amount(employee.tc if employee.tc is not None else self.config.default_tc_amount or ZERO)
        rav = quantize_amount(employee.rav if employee.rav is not None else self.config.default_rav_amount or ZERO)
        cfs_base = brut_imposable
        cfs_calc = employee.cfs if employee.cfs is not None else self._calculate_from_rate(cfs_base, self.config.cfs_rate)
        cfs = quantize_amount(cfs_calc)

        cnps_salariale_calc = self._calculate_from_rate(base_cnps, self.config.cnps_salarial_rate)
        cnps_salariale = self._resolve_override(employee, "cnps_salariale", cnps_salariale_calc, effective_override)

        cfp_patronal = self._resolve_override(
            employee,
            "cfp_patronal",
            self._calculate_from_rate(base_cnps, self.config.cfp_patronal_rate),
            effective_override,
        )
        fne_patronal = self._resolve_override(
            employee,
            "fne_patronal",
            self._calculate_from_rate(base_cnps, self.config.fne_patronal_rate),
            effective_override,
        )
        cot_pf_patronal = self._resolve_override(
            employee,
            "cot_pf_patronal",
            self._calculate_from_rate(base_cnps, self.config.cot_pf_patronal_rate),
            effective_override,
        )
        cot_pvid_patronal = self._resolve_override(
            employee,
            "cot_pvid_patronal",
            self._calculate_from_rate(base_cnps, self.config.cot_pvid_patronal_rate),
            effective_override,
        )
        cot_at_patronal = self._resolve_override(
            employee,
            "cot_at_patronal",
            self._calculate_from_rate(base_cnps, self.config.cot_at_patronal_rate),
            effective_override,
        )

        total_retenues_calc = irpp + cac + tc + rav + cfs + cnps_salariale
        total_retenues = self._resolve_override(employee, "total_retenues", total_retenues_calc, effective_override)

        total_patronal_calc = cfp_patronal + fne_patronal + cot_pf_patronal + cot_pvid_patronal + cot_at_patronal
        total_patronal = self._resolve_override(employee, "total_patronal", total_patronal_calc, effective_override)

        net_a_payer_calc = salaire_brut - total_retenues
        net_a_payer = self._resolve_override(employee, "net_a_payer", net_a_payer_calc, effective_override)

        lines = self._build_lines(
            employee=employee,
            salaire_base=salaire_base,
            indemn_transport=indemn_transport,
            autres_gains=autres_gains,
            salaire_brut=salaire_brut,
            irpp=irpp,
            cac=cac,
            tc=tc,
            rav=rav,
            cfs=cfs,
            cnps_salariale=cnps_salariale,
            cfp_patronal=cfp_patronal,
            fne_patronal=fne_patronal,
            cot_pf_patronal=cot_pf_patronal,
            cot_pvid_patronal=cot_pvid_patronal,
            cot_at_patronal=cot_at_patronal,
        )

        totals = PayrollTotals(
            montant_plus=quantize_amount(salaire_brut),
            montant_minus=quantize_amount(total_retenues),
            retenue_patronale=quantize_amount(total_patronal),
        )
        summary = PayrollSummary(
            brut=salaire_brut,
            brut_imposable=brut_imposable,
            appointement=employee.jours_payes,
            net_a_payer=net_a_payer,
            charges_sociales=cnps_salariale,
            charges_fiscales=irpp + cac + tc + rav + cfs,
            libelles=month_label_fr(employee.date_fin_periode or employee.date_debut_periode),
            cumul="",
        )

        return PayrollResult(
            employee=employee,
            company=self.company,
            config=self.config,
            lines=lines,
            totals=totals,
            summary=summary,
            salaire_brut=salaire_brut,
            brut_imposable=brut_imposable,
            base_cnps=base_cnps,
            cnps_salariale=cnps_salariale,
            cfp_patronal=cfp_patronal,
            fne_patronal=fne_patronal,
            cot_pf_patronal=cot_pf_patronal,
            cot_pvid_patronal=cot_pvid_patronal,
            cot_at_patronal=cot_at_patronal,
            total_retenues=total_retenues,
            total_patronal=total_patronal,
            net_a_payer=net_a_payer,
            montant_en_lettres=number_to_french_words(net_a_payer),
        )

    def _build_lines(self, **payload) -> list[PayrollLine]:
        employee: EmployeePayrollData = payload["employee"]
        days = employee.jours_payes
        lines: list[PayrollLine] = []

        self._append_line(
            lines,
            "salaire_base",
            montant_plus=payload["salaire_base"],
            nombre=days if days else "",
            base=self._unit_base(payload["salaire_base"], days),
        )
        self._append_line(
            lines,
            "indemn_transport",
            montant_plus=payload["indemn_transport"],
            nombre=days if payload["indemn_transport"] and days else "",
            base=self._unit_base(payload["indemn_transport"], days),
        )
        self._append_line(lines, "autres_gains", montant_plus=payload["autres_gains"])
        self._append_line(lines, "salaire_brut", montant_plus=payload["salaire_brut"], always_show=True)
        self._append_line(lines, "irpp", montant_minus=payload["irpp"])
        self._append_line(lines, "cac", montant_minus=payload["cac"], taux=self.config.cac_rate)
        self._append_line(lines, "tc", montant_minus=payload["tc"])
        self._append_line(lines, "rav", montant_minus=payload["rav"])
        self._append_line(lines, "cfs", montant_minus=payload["cfs"], taux=self.config.cfs_rate)
        self._append_line(lines, "cnps", montant_minus=payload["cnps_salariale"], taux=self.config.cnps_salarial_rate)
        self._append_line(lines, "cfp", retenue_patronale=payload["cfp_patronal"], taux=self.config.cfp_patronal_rate)
        self._append_line(lines, "fne", retenue_patronale=payload["fne_patronal"], taux=self.config.fne_patronal_rate)
        self._append_line(lines, "cot_pf", retenue_patronale=payload["cot_pf_patronal"], taux=self.config.cot_pf_patronal_rate)
        self._append_line(
            lines,
            "cot_pvid",
            retenue_patronale=payload["cot_pvid_patronal"],
            taux=self.config.cot_pvid_patronal_rate,
        )
        self._append_line(lines, "cot_at", retenue_patronale=payload["cot_at_patronal"], taux=self.config.cot_at_patronal_rate)
        return lines

    def _append_line(
        self,
        lines: list[PayrollLine],
        rubric_key: str,
        nombre="",
        base="",
        taux="",
        montant_plus: Decimal = ZERO,
        montant_minus: Decimal = ZERO,
        retenue_patronale: Decimal = ZERO,
        always_show: bool = False,
    ) -> None:
        rubric = self.config.rubric(rubric_key)
        visible = always_show or rubric.always_show or any(
            value not in (None, "", ZERO) for value in (montant_plus, montant_minus, retenue_patronale)
        )
        if not visible:
            return

        lines.append(
            PayrollLine(
                code=rubric.code,
                libelle=rubric.libelle,
                nombre=nombre if nombre not in (None, ZERO) else "",
                base=base if base not in (None, ZERO) else rubric.base_label,
                taux=taux if taux not in (None, "", ZERO) else "",
                montant_plus=quantize_amount(montant_plus),
                montant_minus=quantize_amount(montant_minus),
                retenue_patronale=quantize_amount(retenue_patronale),
            )
        )

    def _unit_base(self, amount: Decimal, quantity: Decimal) -> Decimal | str:
        if not quantity:
            return ""
        return quantize_amount(amount / quantity)

    def _calculate_from_rate(self, base: Decimal, rate: Decimal | None) -> Decimal:
        if rate is None:
            return ZERO
        return quantize_amount(base * rate)

    def _resolve_override(
        self,
        employee: EmployeePayrollData,
        key: str,
        calculated: Decimal,
        allow_override: bool,
    ) -> Decimal:
        if not allow_override:
            return quantize_amount(calculated)
        override = parse_optional_decimal(employee.source_values.get(key))
        if override is None:
            return quantize_amount(calculated)
        return quantize_amount(override)


def calculate_payroll(
    employee: EmployeePayrollData,
    config: PayrollConfig,
    company: CompanyInfo,
    allow_override: bool | None = None,
) -> PayrollResult:
    calculator = PayrollCalculator(config=config, company=company)
    return calculator.calculate_payroll(employee=employee, allow_override=allow_override)
