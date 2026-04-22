export const COMPLIANCE_DOCUMENT_TYPES = [
  { value: "acf", labelFr: "ACF", labelEn: "ACF" },
  { value: "niu", labelFr: "NIU", labelEn: "Tax ID" },
  { value: "location_plan", labelFr: "Plan de localisation", labelEn: "Location plan" },
  { value: "trade_register", labelFr: "Registre du commerce", labelEn: "Trade register" },
  { value: "company_statutes", labelFr: "Statut de l'entreprise", labelEn: "Company statutes" },
  { value: "social_compliance_certificate", labelFr: "Attestation de conformite sociale", labelEn: "Social compliance certificate" },
  { value: "rib", labelFr: "RIB", labelEn: "Bank account statement" },
  { value: "dg_identity_card", labelFr: "CNI du DG", labelEn: "Managing director ID" },
  { value: "pca_identity_card", labelFr: "CNI du PCA", labelEn: "Board chair ID" },
];

export const CORRESPONDENCE_DIRECTIONS = {
  incoming: "incoming",
  outgoing: "outgoing",
};

function createWorkspaceId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export function createEmptyAsset(name = "") {
  return {
    id: createWorkspaceId("asset"),
    name,
    stored_path: "",
  };
}

export function createEmptyComplianceDocument(type = "acf") {
  return {
    id: createWorkspaceId("doc"),
    type,
    bank_label: "",
    valid_from: "",
    valid_until: "",
    assigned_to_user_id: "",
    assigned_to_label: "",
    notes: "",
    attachments: [],
  };
}

export function createEmptyCorrespondence(direction = CORRESPONDENCE_DIRECTIONS.incoming) {
  return {
    id: createWorkspaceId("corr"),
    direction,
    reference_number: "",
    subject: "",
    project_id: "",
    project_name: "",
    signatory: "",
    received_on: "",
    response_due_on: "",
    discharge_on: "",
    notes: "",
    attachments: [],
  };
}

export function normalizeCompanyWorkspacePayload(rawValue) {
  if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
    return {
      compliance_documents: Array.isArray(rawValue.compliance_documents)
        ? rawValue.compliance_documents
        : Array.isArray(rawValue.documents)
          ? rawValue.documents
          : [],
      correspondences: {
        incoming: Array.isArray(rawValue?.correspondences?.incoming) ? rawValue.correspondences.incoming : [],
        outgoing: Array.isArray(rawValue?.correspondences?.outgoing) ? rawValue.correspondences.outgoing : [],
      },
    };
  }

  if (Array.isArray(rawValue)) {
    return {
      compliance_documents: rawValue,
      correspondences: { incoming: [], outgoing: [] },
    };
  }

  return {
    compliance_documents: [],
    correspondences: { incoming: [], outgoing: [] },
  };
}

export function getComplianceTypeLabel(type, language = "fr", bankLabel = "") {
  const item = COMPLIANCE_DOCUMENT_TYPES.find((entry) => entry.value === type);
  const fallback = type ? String(type).replaceAll("_", " ") : "";
  const label = language?.startsWith("en") ? item?.labelEn || fallback : item?.labelFr || fallback;
  if (type === "rib" && bankLabel) {
    return `${label} ${bankLabel}`;
  }
  return label || "-";
}

export function buildCompanyWorkspacePayload({ complianceDocuments, incomingCorrespondences, outgoingCorrespondences }) {
  return {
    compliance_documents: complianceDocuments,
    correspondences: {
      incoming: incomingCorrespondences,
      outgoing: outgoingCorrespondences,
    },
  };
}

export function buildCompanyAssetDownloadUrl(asset) {
  if (!asset?.stored_path) {
    return "";
  }
  const params = new URLSearchParams();
  params.set("path", asset.stored_path);
  if (asset.name) {
    params.set("name", asset.name);
  }
  return `/companies/me/assets?${params.toString()}`;
}

export function getDocumentValidityStatus(document) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!document?.valid_until) {
    return "unknown";
  }

  const expiry = new Date(`${document.valid_until}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) {
    return "unknown";
  }

  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) {
    return "expired";
  }
  if (diffDays <= 30) {
    return "expiring";
  }
  return "valid";
}
