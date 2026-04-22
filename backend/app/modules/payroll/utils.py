from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any


ZERO = Decimal("0")
ONE = Decimal("1")
TWO_DIGITS = Decimal("0.01")
MONTHS_FR = [
    "",
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre",
]


def parse_decimal(value: Any, default: Decimal | None = ZERO) -> Decimal | None:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):
        return Decimal(int(value))
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, float):
        return Decimal(str(value))

    text = str(value).strip()
    if not text or text.lower() in {"none", "null", "nan"}:
        return default

    text = text.replace("\xa0", " ").replace(" ", "")
    text = text.replace("%", "")

    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(",", ".")

    try:
        return Decimal(text)
    except InvalidOperation:
        return default


def parse_optional_decimal(value: Any) -> Decimal | None:
    return parse_decimal(value, default=None)


def normalize_rate(value: Any) -> Decimal:
    parsed = parse_decimal(value, default=ZERO) or ZERO
    if parsed > ONE:
        return parsed / Decimal("100")
    return parsed


def quantize_amount(value: Any) -> Decimal:
    amount = parse_decimal(value, default=ZERO) or ZERO
    return amount.quantize(ONE, rounding=ROUND_HALF_UP)


def format_currency_fr(value: Any, currency: str | None = None, include_currency: bool = False) -> str:
    amount = quantize_amount(value)
    formatted = f"{amount:,.0f}".replace(",", " ")
    if include_currency and currency:
        return f"{formatted} {currency}"
    return formatted


def format_number_fr(value: Any) -> str:
    number = parse_decimal(value, default=None)
    if number is None:
        return ""
    if number == number.to_integral_value():
        return f"{number:,.0f}".replace(",", " ")
    quantized = number.quantize(TWO_DIGITS, rounding=ROUND_HALF_UP)
    return f"{quantized:,.2f}".replace(",", " ").replace(".", ",")


def format_rate_fr(value: Any) -> str:
    if value in (None, "", ZERO):
        return ""
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.endswith("%"):
            return stripped.replace(".", ",")
        try:
            value = Decimal(stripped)
        except InvalidOperation:
            return stripped
    rate = normalize_rate(value)
    percent = (rate * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    if percent == percent.to_integral_value():
        return f"{int(percent)}%"
    return f"{percent}".replace(".", ",") + "%"


def parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        return None

    text = str(value).strip()
    if not text:
        return None

    for date_format in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text, date_format).date()
        except ValueError:
            continue
    return None


def format_date_fr(value: Any, date_format: str = "%d/%m/%Y") -> str:
    parsed = parse_date(value)
    if parsed is None:
        return ""
    return parsed.strftime(date_format)


def month_label_fr(value: date | None) -> str:
    if value is None:
        return ""
    return MONTHS_FR[value.month]


def ensure_directory(path: str | Path) -> Path:
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def slugify_filename_component(value: Any) -> str:
    text = str(value or "").strip()
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("._")
    return normalized or "sans-identifiant"


def normalize_key(value: Any) -> str:
    text = str(value or "").strip().lower()
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.replace("-", "_").replace(" ", "_")
    normalized = re.sub(r"[^a-z0-9_]+", "", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized


def capitalize_sentence(value: str) -> str:
    if not value:
        return ""
    return value[:1].upper() + value[1:]


def number_to_french_words(value: Any) -> str:
    amount = int(quantize_amount(value))
    if amount == 0:
        return "Zero"

    billions, remainder = divmod(amount, 1_000_000_000)
    millions, remainder = divmod(remainder, 1_000_000)
    thousands, hundreds = divmod(remainder, 1000)

    parts: list[str] = []
    if billions:
        parts.append(_scale_to_words(billions, "milliard"))
    if millions:
        parts.append(_scale_to_words(millions, "million"))
    if thousands:
        if thousands == 1:
            parts.append("mille")
        else:
            parts.append(f"{_convert_under_thousand(thousands)} mille")
    if hundreds:
        parts.append(_convert_under_thousand(hundreds))

    return capitalize_sentence(" ".join(part for part in parts if part).strip())


def _scale_to_words(value: int, scale_name: str) -> str:
    words = _convert_under_thousand(value)
    if value > 1:
        return f"{words} {scale_name}s"
    return f"{words} {scale_name}"


def _convert_under_thousand(number: int) -> str:
    if number < 100:
        return _convert_under_hundred(number)

    hundreds, remainder = divmod(number, 100)
    if hundreds == 1:
        prefix = "cent"
    else:
        prefix = f"{_convert_under_hundred(hundreds)} cent"

    if remainder == 0 and hundreds > 1:
        return prefix + "s"
    if remainder == 0:
        return prefix
    return f"{prefix} {_convert_under_hundred(remainder)}"


def _convert_under_hundred(number: int) -> str:
    units = {
        0: "zero",
        1: "un",
        2: "deux",
        3: "trois",
        4: "quatre",
        5: "cinq",
        6: "six",
        7: "sept",
        8: "huit",
        9: "neuf",
        10: "dix",
        11: "onze",
        12: "douze",
        13: "treize",
        14: "quatorze",
        15: "quinze",
        16: "seize",
    }
    tens = {
        20: "vingt",
        30: "trente",
        40: "quarante",
        50: "cinquante",
        60: "soixante",
        80: "quatre-vingt",
    }

    if number <= 16:
        return units[number]
    if number < 20:
        return "dix-" + units[number - 10]
    if number < 70:
        ten = (number // 10) * 10
        unit = number % 10
        word = tens[ten]
        if unit == 0:
            return word
        if unit == 1:
            return f"{word} et un"
        return f"{word}-{units[unit]}"
    if number < 80:
        if number == 71:
            return "soixante et onze"
        return "soixante-" + _convert_under_hundred(number - 60)
    if number == 80:
        return "quatre-vingts"
    if number < 100:
        return "quatre-vingt-" + _convert_under_hundred(number - 80)
    return ""
