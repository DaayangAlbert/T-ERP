import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { EditableFieldList, EditableFieldRow } from "@/components/ui/editable-field-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { httpClient } from "@/shared/api/httpClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  phone: "",
  gender: "",
  birth_date: "",
  address_line: "",
  preferred_language: "fr",
  profile_photo_url: "",
  identity_document_type: "cni",
  identity_document_number: "",
  identity_issue_date: "",
  identity_document_url: "",
  taxpayer_number: "",
  cv_url: "",
  chat_notifications_enabled: true,
  payslip_notifications_enabled: true,
  cnps_number: "",
  bank_account_number: "",
  bank_name: "",
  payment_method: "bank_transfer",
};

const SELECT_CLASS = LIST_SELECT_CLASS;
const ADMIN_FORBIDDEN_SELF_FIELDS = new Set(["cnps_number", "bank_account_number", "bank_name", "payment_method"]);

const COPY = {
  fr: {
    eyebrow: "Libre-service employe",
    title: "Mon profil et mes notifications",
    subtitle:
      "Mettez a jour vos informations personnelles, vos references administratives, votre CV et gardez un oeil sur les nouveaux messages et bulletins.",
    save: "Enregistrer les modifications",
    saving: "Enregistrement...",
    markPayslipsSeen: "Marquer les bulletins comme vus",
    openChat: "Ouvrir la messagerie",
    openPayroll: "Ouvrir la paie",
    saved: "Profil mis a jour avec succes.",
    notificationsTitle: "Notifications actives",
    notificationsHint: "Les compteurs s'actualisent a partir des messages non lus et des bulletins nouvellement generes.",
    unreadMessages: "Messages non lus",
    newPayslips: "Nouveaux bulletins",
    activeBadge: "Actif",
    clearBadge: "RAS",
    preferencesTitle: "Preferences de notification",
    chatNotifications: "Recevoir les alertes de nouveaux messages",
    payslipNotifications: "Recevoir les alertes de nouveaux bulletins",
    identityTitle: "Identite et contact",
    documentsTitle: "Documents et CV",
    socialTitle: "Infos sociales et bancaires",
    additionalTitle: "Informations complementaires",
    profilePhotoPreview: "Apercu photo",
    profilePhoto: "Photo de profil",
    profilePhotoHelp: "Image depuis votre appareil",
    firstName: "Prenom",
    lastName: "Nom",
    phone: "Numero de telephone",
    gender: "Genre",
    birthDate: "Date de naissance",
    address: "Adresse",
    addressTitle: "Adresse",
    language: "Langue",
    profilePhotoUrl: "Photo de profil",
    identityType: "Type de piece",
    docTypeLabel: "Type de piece",
    identityNumber: "Numero CNI / passeport",
    identityIssueDate: "Date de delivrance",
    issueDateLabel: "Date de delivrance",
    identityUrl: "Piece justificative",
    docLinkLabel: "Piece justificative",
    taxpayerNumber: "Numero de contribuable",
    cvUrl: "CV",
    cvLabel: "CV",
    cnpsNumber: "Numero CNPS",
    bankAccount: "Numero de compte bancaire",
    bankName: "Nom de la banque",
    paymentMethod: "Mode de paiement du salaire",
    uploadFile: "Televerser un fichier",
    replaceFile: "Remplacer le fichier",
    downloadFile: "Ouvrir le fichier",
    noFile: "Aucun fichier televerse",
    assetUploaded: "Fichier televerse avec succes.",
    uploading: "Televersement...",
    addressPlaceholder: "Quartier, ville, repere utile...",
    noNotifications: "Aucune notification prioritaire pour le moment.",
    latestAlerts: "Dernieres alertes",
    docTypeCni: "CNI",
    docTypePassport: "Passeport",
    docTypeOther: "Autre",
    genderMale: "Homme",
    genderFemale: "Femme",
    genderOther: "Autre",
    paymentCash: "Espece",
    paymentBankTransfer: "Virement bancaire",
    paymentMobileMoney: "Mobile money",
    paymentCheck: "Cheque",
    paymentOther: "Autre",
    adminEyebrow: "Administrateur entreprise",
    adminTitle: "Profil utilisateur admin",
    adminSubtitle:
      "Gerez votre identite administrateur et vos preferences de notifications. Le profil entreprise se pilote depuis l'espace Societe.",
    adminPersonalTitle: "Profil personnel admin",
    adminPilotageTitle: "Informations de pilotage admin",
    adminPilotageHint: "Vue de synthese du compte administrateur et du profil entreprise associe.",
    enterpriseProfileTitle: "Profil entreprise",
    openEnterpriseProfile: "Ouvrir le profil entreprise",
    accountStatus: "Statut du compte",
    subscriptionStatus: "Statut abonnement",
    setupStatus: "Statut de configuration",
    roleProfile: "Profil operationnel",
    permissionCount: "Nombre de permissions",
    primaryAdmin: "Admin principal",
    yes: "Oui",
    no: "Non",
    incompleteProfiles: "Profils collaborateurs incomplets",
    activeAlerts: "Alertes actives",
  },
  en: {
    eyebrow: "Employee self-service",
    title: "My profile and notifications",
    subtitle:
      "Keep your personal details, administrative references, resume, and in-app alerts up to date from one place.",
    save: "Save changes",
    saving: "Saving...",
    markPayslipsSeen: "Mark payslips as seen",
    openChat: "Open chat",
    openPayroll: "Open payroll",
    saved: "Profile updated successfully.",
    notificationsTitle: "Active notifications",
    notificationsHint: "Counters are driven by unread chat messages and newly generated payslips.",
    unreadMessages: "Unread messages",
    newPayslips: "New payslips",
    activeBadge: "Active",
    clearBadge: "Clear",
    preferencesTitle: "Notification preferences",
    chatNotifications: "Show alerts for new messages",
    payslipNotifications: "Show alerts for new payslips",
    identityTitle: "Identity and contact",
    documentsTitle: "Documents and resume",
    socialTitle: "Social and banking details",
    additionalTitle: "Additional information",
    profilePhotoPreview: "Photo preview",
    profilePhoto: "Profile photo",
    profilePhotoHelp: "Upload from your device",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone number",
    gender: "Gender",
    birthDate: "Birth date",
    address: "Address",
    addressTitle: "Address",
    language: "Language",
    profilePhotoUrl: "Profile photo",
    identityType: "Document type",
    docTypeLabel: "Document type",
    identityNumber: "National ID / passport number",
    identityIssueDate: "Issue date",
    issueDateLabel: "Issue date",
    identityUrl: "Document file",
    docLinkLabel: "Document file",
    taxpayerNumber: "Taxpayer number",
    cvUrl: "Resume",
    cvLabel: "Resume",
    cnpsNumber: "CNPS number",
    bankAccount: "Bank account number",
    bankName: "Bank name",
    paymentMethod: "Salary payment method",
    uploadFile: "Upload file",
    replaceFile: "Replace file",
    downloadFile: "Open file",
    noFile: "No file uploaded",
    assetUploaded: "File uploaded successfully.",
    uploading: "Uploading...",
    addressPlaceholder: "District, city, useful landmark...",
    noNotifications: "No priority notifications right now.",
    latestAlerts: "Latest alerts",
    docTypeCni: "National ID",
    docTypePassport: "Passport",
    docTypeOther: "Other",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    paymentCash: "Cash",
    paymentBankTransfer: "Bank transfer",
    paymentMobileMoney: "Mobile money",
    paymentCheck: "Check",
    paymentOther: "Other",
    adminEyebrow: "Company administrator",
    adminTitle: "Admin user profile",
    adminSubtitle:
      "Manage your administrator identity and notification preferences. The company profile is managed from the Company workspace.",
    adminPersonalTitle: "Admin personal profile",
    adminPilotageTitle: "Admin operations overview",
    adminPilotageHint: "Summary of your administrator account and linked company profile.",
    enterpriseProfileTitle: "Company profile",
    openEnterpriseProfile: "Open company profile",
    accountStatus: "Account status",
    subscriptionStatus: "Subscription status",
    setupStatus: "Setup status",
    roleProfile: "Operational profile",
    permissionCount: "Permission count",
    primaryAdmin: "Primary admin",
    yes: "Yes",
    no: "No",
    incompleteProfiles: "Incomplete employee profiles",
    activeAlerts: "Active alerts",
  },
};

function buildFormFromPayload(payload) {
  const user = payload?.user || {};
  const payrollProfile = payload?.payroll_profile || {};

  return {
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    gender: user.gender || "",
    birth_date: user.birth_date || "",
    address_line: user.address_line || "",
    preferred_language: user.preferred_language || "fr",
    profile_photo_url: user.profile_photo_url || "",
    identity_document_type: user.identity_document_type || "cni",
    identity_document_number: user.identity_document_number || "",
    identity_issue_date: user.identity_issue_date || "",
    identity_document_url: user.identity_document_url || "",
    taxpayer_number: user.taxpayer_number || "",
    cv_url: user.cv_url || "",
    chat_notifications_enabled: user.chat_notifications_enabled ?? true,
    payslip_notifications_enabled: user.payslip_notifications_enabled ?? true,
    cnps_number: payrollProfile.cnps_number || "",
    bank_account_number: payrollProfile.bank_account_number || "",
    bank_name: payrollProfile.bank_name || "",
    payment_method: payrollProfile.payment_method || "bank_transfer",
  };
}

function buildSubmitPayload(form, { excludedFields = null } = {}) {
  const nullableFields = new Set([
    "phone",
    "gender",
    "birth_date",
    "address_line",
    "profile_photo_url",
    "identity_document_type",
    "identity_document_number",
    "identity_issue_date",
    "identity_document_url",
    "taxpayer_number",
    "cv_url",
    "cnps_number",
    "bank_account_number",
    "bank_name",
    "payment_method",
  ]);

  return Object.fromEntries(
    Object.entries(form)
      .filter(([field]) => !(excludedFields instanceof Set && excludedFields.has(field)))
      .map(([field, value]) => {
      if (typeof value !== "string") {
        return [field, value];
      }

      const trimmedValue = value.trim();
      if (nullableFields.has(field)) {
        return [field, trimmedValue || null];
      }

      return [field, trimmedValue];
      })
  );
}

function buildEmptyUploads() {
  return {
    profile_photo: { available: false, filename: null, download_url: null },
    identity_document: { available: false, filename: null, download_url: null },
    cv: { available: false, filename: null, download_url: null },
  };
}

function getAssetDownloadName(assetKind, fallbackName) {
  if (fallbackName) {
    return fallbackName;
  }
  if (assetKind === "profile_photo") {
    return "photo-profil";
  }
  if (assetKind === "identity_document") {
    return "piece-identite";
  }
  if (assetKind === "cv") {
    return "cv";
  }
  return "document";
}

function stripApiPrefix(url) {
  return String(url || "").replace(/^\/api\/v1/, "");
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function formatDateTime(value, locale) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function NotificationStat({ label, value, variant = "neutral", activeLabel, clearLabel }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
        <Badge variant={variant}>{value > 0 ? activeLabel : clearLabel}</Badge>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70">
      <span className="font-medium text-slate-800 dark:text-slate-100">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function isRaw404Message(message) {
  return String(message || "").trim() === "Request failed with status code 404";
}

export function ProfilePage() {
  const { i18n } = useTranslation();
  const { refreshProfile, user } = useAuth();
  const { data, loading, error, refetch } = useApiQuery("/users/me/profile", { ignoreStatuses: [404] });
  const { data: adminDashboard } = useApiQuery("/users/dashboard", {
    enabled: user?.user_type === "company_admin",
    ignoreStatuses: [403, 404],
  });
  const { mutate, loading: saving, error: saveError } = useApiMutation();
  const { mutate: markSeen, loading: markingSeen } = useApiMutation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploads, setUploads] = useState(() => buildEmptyUploads());
  const [notice, setNotice] = useState("");
  const [assetError, setAssetError] = useState("");
  const [uploadingAssetKind, setUploadingAssetKind] = useState("");
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const copy = i18n.language?.startsWith("en") ? COPY.en : COPY.fr;
  const isCompanyAdmin = user?.user_type === "company_admin";
  const companyContext = user?.company_context || null;
  const adminIncompleteProfiles = Number(adminDashboard?.personnel?.incomplete_profiles || 0);
  const adminAlerts = Number((adminDashboard?.alerts || []).length || 0);
  const notifications = data?.notifications;
  const visibleError = isRaw404Message(error) ? null : error;
  const visibleSaveError = isRaw404Message(saveError) ? null : saveError;

  useEffect(() => {
    if (data) {
      setForm(buildFormFromPayload(data));
      setUploads(data.uploads || buildEmptyUploads());
    }
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    const downloadUrl = uploads.profile_photo?.download_url;
    if (downloadUrl) {
      httpClient
        .get(stripApiPrefix(downloadUrl), { responseType: "blob" })
        .then((response) => {
          if (cancelled) {
            return;
          }
          objectUrl = window.URL.createObjectURL(response.data);
          setProfilePhotoPreview(objectUrl);
        })
        .catch(() => {
          if (!cancelled) {
            setProfilePhotoPreview(isExternalUrl(form.profile_photo_url) ? form.profile_photo_url : "");
          }
        });
    } else {
      setProfilePhotoPreview(isExternalUrl(form.profile_photo_url) ? form.profile_photo_url : "");
    }

    return () => {
      cancelled = true;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [form.profile_photo_url, uploads.profile_photo?.download_url]);

  const updateField = (field, value) => {
    setNotice("");
    setAssetError("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setNotice("");
    setAssetError("");

    try {
      await mutate({
        method: "patch",
        url: "/users/me/profile",
        data: buildSubmitPayload(form, {
          excludedFields: isCompanyAdmin ? ADMIN_FORBIDDEN_SELF_FIELDS : null,
        }),
      });
      await Promise.all([refetch(), refreshProfile()]);
      window.dispatchEvent(new CustomEvent("terp-notifications-refresh"));
      setNotice(copy.saved);
    } catch {
      // Error state is handled by useApiMutation.
    }
  };

  const markPayslipsAsSeen = async () => {
    setNotice("");
    setAssetError("");
    try {
      await markSeen({
        method: "post",
        url: "/users/me/notifications/mark-seen",
        data: { categories: ["payslips"] },
      });
      await refetch();
      window.dispatchEvent(new CustomEvent("terp-notifications-refresh"));
    } catch {
      // Error state is handled by useApiMutation.
    }
  };

  const downloadAsset = async (assetKind) => {
    const asset = uploads?.[assetKind];
    if (!asset?.download_url) {
      return;
    }

    setNotice("");
    setAssetError("");
    try {
      const response = await httpClient.get(stripApiPrefix(asset.download_url), { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = getAssetDownloadName(assetKind, asset.filename);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Download errors are surfaced through the existing page notices only when needed.
    }
  };

  const uploadProfileAsset = async (assetKind, file) => {
    if (!file) {
      return;
    }

    setNotice("");
    setAssetError("");
    setUploadingAssetKind(assetKind);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpClient.post(`/users/me/profile/uploads/${assetKind}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const payload = response.data?.data;
      setForm(buildFormFromPayload(payload));
      setUploads(payload?.uploads || buildEmptyUploads());
      await refreshProfile();
      setNotice(copy.assetUploaded);
    } catch (uploadError) {
      setAssetError(uploadError?.response?.data?.message || "");
    } finally {
      setUploadingAssetKind("");
    }
  };

  if (loading && !data) {
    return <p className="text-sm text-slate-500">{copy.saving}</p>;
  }

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
          {isCompanyAdmin ? copy.adminEyebrow : copy.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {isCompanyAdmin ? copy.adminTitle : copy.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isCompanyAdmin ? copy.adminSubtitle : copy.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isCompanyAdmin ? (
            <Link
              to="/app/companies"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
            >
              {copy.openEnterpriseProfile}
            </Link>
          ) : null}
          <Link
            to="/app/chat"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
          >
            {copy.openChat}
          </Link>
          <Link
            to="/app/payroll"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
          >
            {copy.openPayroll}
          </Link>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{copy.notificationsTitle}</h3>
            <p className="text-sm text-slate-500">{copy.notificationsHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {notice ? <Badge variant="success">{notice}</Badge> : null}
            {assetError ? <Badge variant="danger">{assetError}</Badge> : null}
            {visibleSaveError ? <Badge variant="danger">{visibleSaveError}</Badge> : null}
            {visibleError ? <Badge variant="danger">{visibleError}</Badge> : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <NotificationStat
            label={copy.unreadMessages}
            value={Number(notifications?.chat?.total_unread || 0)}
            variant="warning"
            activeLabel={copy.activeBadge}
            clearLabel={copy.clearBadge}
          />
          <NotificationStat
            label={copy.newPayslips}
            value={Number(notifications?.payslips?.new_count || 0)}
            variant="success"
            activeLabel={copy.activeBadge}
            clearLabel={copy.clearBadge}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_1.3fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.preferencesTitle}</p>
            <Toggle
              label={copy.chatNotifications}
              checked={Boolean(form.chat_notifications_enabled)}
              onChange={(value) => updateField("chat_notifications_enabled", value)}
            />
            <Toggle
              label={copy.payslipNotifications}
              checked={Boolean(form.payslip_notifications_enabled)}
              onChange={(value) => updateField("payslip_notifications_enabled", value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={markPayslipsAsSeen}
              disabled={markingSeen || Number(notifications?.payslips?.new_count || 0) === 0}
            >
              {copy.markPayslipsSeen}
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.latestAlerts}</p>
            {(notifications?.items || []).length ? (
              <div className="space-y-2">
                {(notifications?.items || []).map((item) => (
                  <div
                    key={`${item.kind}-${item.conversation_id || item.payslip_id || item.title}`}
                    className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                        {item.created_at ? (
                          <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at, locale)}</p>
                        ) : null}
                      </div>
                      <Badge variant={item.kind === "payslip" ? "success" : "warning"}>{item.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500 dark:border-slate-700">
                {copy.noNotifications}
              </p>
            )}
          </div>
        </div>
      </Card>

      <form className="space-y-4" onSubmit={saveProfile}>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {isCompanyAdmin ? copy.adminPersonalTitle : copy.identityTitle}
            </h3>
            <EditableFieldList>
              <EditableFieldRow label={copy.firstName} hint={copy.identityTitle}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} placeholder={copy.firstName} />
                  <Input value={form.last_name} onChange={(event) => updateField("last_name", event.target.value)} placeholder={copy.lastName} />
                </div>
              </EditableFieldRow>
              <EditableFieldRow label={copy.phone} hint={copy.gender}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder={copy.phone} />
                  <select className={SELECT_CLASS} value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                    <option value="">{copy.gender}</option>
                    <option value="male">{copy.genderMale}</option>
                    <option value="female">{copy.genderFemale}</option>
                    <option value="other">{copy.genderOther}</option>
                  </select>
                </div>
              </EditableFieldRow>
              <EditableFieldRow label={copy.birthDate} hint={copy.language}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="date" value={form.birth_date} onChange={(event) => updateField("birth_date", event.target.value)} />
                  <select className={SELECT_CLASS} value={form.preferred_language} onChange={(event) => updateField("preferred_language", event.target.value)}>
                    <option value="fr">Francais</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </EditableFieldRow>
              <EditableFieldRow label={copy.addressTitle} hint={copy.addressPlaceholder} multiline>
                <Textarea
                  value={form.address_line}
                  onChange={(event) => updateField("address_line", event.target.value)}
                  placeholder={copy.addressPlaceholder}
                />
              </EditableFieldRow>
            </EditableFieldList>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{copy.additionalTitle}</h3>
              <Badge variant="neutral">{copy.profilePhotoPreview}</Badge>
            </div>
            <EditableFieldList>
              <EditableFieldRow label={copy.profilePhoto} hint={uploads.profile_photo?.filename || copy.profilePhotoHelp}>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadProfileAsset("profile_photo", event.target.files?.[0])}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{uploads.profile_photo?.filename || copy.noFile}</span>
                    {uploads.profile_photo?.download_url ? (
                      <Button type="button" variant="outline" onClick={() => downloadAsset("profile_photo")}>
                        {copy.downloadFile}
                      </Button>
                    ) : null}
                    {uploadingAssetKind === "profile_photo" ? <span>{copy.uploading}</span> : null}
                  </div>
                </div>
              </EditableFieldRow>
            </EditableFieldList>
            <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              {profilePhotoPreview ? (
                <img
                  src={profilePhotoPreview}
                  alt={copy.profilePhotoPreview}
                  className="h-20 w-20 rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {(form.first_name || "P").slice(0, 1)}
                  {(form.last_name || "U").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {[form.first_name, form.last_name].filter(Boolean).join(" ") || copy.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{uploads.profile_photo?.filename || copy.profilePhotoHelp}</p>
              </div>
            </div>
          </Card>
        </div>

        {isCompanyAdmin ? (
          <Card className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{copy.adminPilotageTitle}</h3>
                <p className="text-sm text-slate-500">{copy.adminPilotageHint}</p>
              </div>
              <Badge variant="info">{copy.enterpriseProfileTitle}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.enterpriseProfileTitle}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{companyContext?.legal_name || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.accountStatus}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{companyContext?.account_status || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.subscriptionStatus}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{companyContext?.subscription_status || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.setupStatus}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{companyContext?.setup_status || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.roleProfile}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.operational_profile_code || data?.user?.operational_profile_code || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.permissionCount}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{Number((user?.permissions || []).length || 0)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.primaryAdmin}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.is_primary_admin ? copy.yes : copy.no}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.incompleteProfiles}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{adminIncompleteProfiles}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.activeAlerts}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{adminAlerts}</p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className={`grid gap-4 ${isCompanyAdmin ? "xl:grid-cols-1" : "xl:grid-cols-2"}`}>
          <Card className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{copy.documentsTitle}</h3>
            <EditableFieldList>
              <EditableFieldRow label={copy.docTypeLabel} hint={copy.identityNumber}>
                <div className="grid gap-3 md:grid-cols-2">
                  <select className={SELECT_CLASS} value={form.identity_document_type} onChange={(event) => updateField("identity_document_type", event.target.value)}>
                    <option value="cni">{copy.docTypeCni}</option>
                    <option value="passport">{copy.docTypePassport}</option>
                    <option value="other">{copy.docTypeOther}</option>
                  </select>
                  <Input
                    value={form.identity_document_number}
                    onChange={(event) => updateField("identity_document_number", event.target.value)}
                    placeholder={copy.identityNumber}
                  />
                </div>
              </EditableFieldRow>
              <EditableFieldRow label={copy.issueDateLabel} hint={copy.taxpayerNumber}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="date" value={form.identity_issue_date} onChange={(event) => updateField("identity_issue_date", event.target.value)} />
                  <Input
                    value={form.taxpayer_number}
                    onChange={(event) => updateField("taxpayer_number", event.target.value)}
                    placeholder={copy.taxpayerNumber}
                  />
                </div>
              </EditableFieldRow>
              <EditableFieldRow label={copy.docLinkLabel} hint={uploads.identity_document?.filename || copy.noFile}>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(event) => uploadProfileAsset("identity_document", event.target.files?.[0])}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{uploads.identity_document?.filename || copy.noFile}</span>
                    {uploads.identity_document?.download_url ? (
                      <Button type="button" variant="outline" onClick={() => downloadAsset("identity_document")}>
                        {copy.downloadFile}
                      </Button>
                    ) : null}
                    {uploadingAssetKind === "identity_document" ? <span>{copy.uploading}</span> : null}
                  </div>
                </div>
              </EditableFieldRow>
              <EditableFieldRow label={copy.cvLabel} hint={uploads.cv?.filename || copy.noFile}>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => uploadProfileAsset("cv", event.target.files?.[0])}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{uploads.cv?.filename || copy.noFile}</span>
                    {uploads.cv?.download_url ? (
                      <Button type="button" variant="outline" onClick={() => downloadAsset("cv")}>
                        {copy.downloadFile}
                      </Button>
                    ) : null}
                    {uploadingAssetKind === "cv" ? <span>{copy.uploading}</span> : null}
                  </div>
                </div>
              </EditableFieldRow>
            </EditableFieldList>
          </Card>

          {!isCompanyAdmin ? (
            <Card className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{copy.socialTitle}</h3>
              <EditableFieldList>
                <EditableFieldRow label={copy.cnpsNumber} hint={copy.bankAccount}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={form.cnps_number} onChange={(event) => updateField("cnps_number", event.target.value)} placeholder={copy.cnpsNumber} />
                    <Input
                      value={form.bank_account_number}
                      onChange={(event) => updateField("bank_account_number", event.target.value)}
                      placeholder={copy.bankAccount}
                    />
                  </div>
                </EditableFieldRow>
                <EditableFieldRow label={copy.bankName} hint={copy.paymentMethod}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={form.bank_name} onChange={(event) => updateField("bank_name", event.target.value)} placeholder={copy.bankName} />
                    <select className={SELECT_CLASS} value={form.payment_method} onChange={(event) => updateField("payment_method", event.target.value)}>
                      <option value="cash">{copy.paymentCash}</option>
                      <option value="bank_transfer">{copy.paymentBankTransfer}</option>
                      <option value="mobile_money">{copy.paymentMobileMoney}</option>
                      <option value="check">{copy.paymentCheck}</option>
                      <option value="other">{copy.paymentOther}</option>
                    </select>
                  </div>
                </EditableFieldRow>
              </EditableFieldList>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? copy.saving : copy.save}
          </Button>
        </div>
      </form>
    </section>
  );
}
