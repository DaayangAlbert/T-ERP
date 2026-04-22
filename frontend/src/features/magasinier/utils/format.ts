function parseDate(value: string) {
  return new Date(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    notation: value > 999 ? "compact" : "standard",
    maximumFractionDigits: value > 999 ? 1 : 0,
  }).format(value || 0);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatPercent(value: number) {
  return `${Math.round(Number(value || 0))}%`;
}

export function formatShortDate(value: string) {
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

export function formatDateTime(value: string) {
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatHour(value: string) {
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function initialsFromName(value: string) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("");
}

export function humanizeStatus(value: string) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function inferAttachmentKind(fileName: string) {
  const lowerName = String(fileName || "").toLowerCase();

  if (/\.(png|jpe?g|gif|webp|svg)$/.test(lowerName)) {
    return "image";
  }
  if (/\.(mp4|mov|avi|webm)$/.test(lowerName)) {
    return "video";
  }

  return "document";
}

export function formatFileSize(size: number) {
  if (!size) {
    return "0 Ko";
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
  }
  return `${Math.max(1, Math.round(size / 1024))} Ko`;
}
