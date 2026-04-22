import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { httpClient } from "@/shared/api/httpClient";
import {
  buildCompanyAssetDownloadUrl,
  buildCompanyWorkspacePayload,
  COMPLIANCE_DOCUMENT_TYPES,
  createEmptyComplianceDocument,
  getComplianceTypeLabel,
  getDocumentValidityStatus,
  normalizeCompanyWorkspacePayload,
} from "@/features/companies/companyWorkspaceData";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

function formatDate(value, language) {
  if (!value) {
    return "--";
  }
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function statusVariant(status) {
  if (status === "expired") {
    return "danger";
  }
  if (status === "expiring") {
    return "warning";
  }
  return "success";
}

function companyStatusVariant(status) {
  if (status === "approved" || status === "active" || status === "complete") {
    return "success";
  }
  if (status === "under_review" || status === "info_requested") {
    return "info";
  }
  if (status === "pending" || status === "suspended" || status === "expiring") {
    return "warning";
  }
  if (status === "rejected" || status === "expired") {
    return "danger";
  }
  return "neutral";
}

function buildProfileForm(companyData) {
  return {
    trade_name: companyData?.trade_name || "",
    acronym: companyData?.acronym || "",
    email: companyData?.email || "",
    phone: companyData?.phone || "",
    activity_domain: companyData?.activity_domain || "",
    city: companyData?.city || "",
    address_line: companyData?.address_line || "",
    country_name: companyData?.country_name || "",
    contact_person_name: companyData?.settings?.contact_person_name || "",
    contact_person_phone: companyData?.settings?.contact_person_phone || "",
    website_url: companyData?.settings?.website_url || "",
  };
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

const COPY = {
  fr: {
    eyebrow: "Conformite entreprise",
    title: "Documents administratifs a jour",
    description:
      "La partie descriptive entreprise et administration est retiree ici. L'espace est recentre sur les documents a tenir a jour, leurs dates de validite, les scans comprimes et la personne interne qui doit les suivre.",
    trackedDocuments: "Documents suivis",
    activeCompany: "Entreprise active",
    renew: "A renouveler",
    renewHint: "Echeance dans 30 jours ou moins",
    expiredCount: "Expires",
    expiredHint: "A traiter en priorite",
    loading: "Chargement...",
    tableTitle: "Tableau de conformite",
    tableHint: "ACF, NIU, plan de localisation, registre du commerce, statuts, attestation sociale, RIB et pieces DG/PCA.",
    addDocument: "Ajouter un document",
    readOnly: "Lecture seule",
    noDocument: "Aucun document administratif n'est encore renseigne.",
    document: "Document",
    validity: "Validite",
    owner: "Responsable interne",
    scans: "Scans",
    actions: "Actions",
    bankLabel: "Banque concernee",
    note: "Note utile",
    valid: "valide",
    expiring: "a renouveler",
    expired: "expire",
    review: "a verifier",
    noNote: "Sans note.",
    start: "Debut",
    end: "Fin",
    choosePerson: "Choisir une personne",
    freeName: "Nom libre si besoin",
    unassigned: "Non affecte",
    download: "Telecharger",
    uploading: "Televersement...",
    addScan: "Ajouter un scan",
    remove: "Supprimer",
    save: "Enregistrer la conformite",
    saving: "Enregistrement...",
    readOnlyHint: "Les documents restent visibles, mais la modification est reservee aux profils administratifs autorises.",
    setupEyebrow: "Mise en route",
    setupTitle: "Configuration initiale de l'entreprise",
    setupDescription: "Completez les informations essentielles de la societe pour sortir proprement du mode premier setup et fluidifier l'exploitation.",
    setupPending: "Setup en cours",
    setupComplete: "Setup complete",
    setupProgress: "Progression",
    setupTasksTitle: "Actions a terminer",
    setupSave: "Enregistrer la fiche entreprise",
    setupSaving: "Enregistrement de la fiche...",
    setupReadonlyHint: "La fiche societe reste visible, mais sa mise a jour est reservee aux profils administratifs autorises.",
    setupTask_company_phone: "Ajouter le telephone principal de l'entreprise",
    setupTask_company_address: "Renseigner la ville et l'adresse de reference",
    setupTask_activity_domain: "Preciser le domaine d'activite",
    setupTask_main_contact: "Designer un contact principal joignable",
    setupTask_compliance_documents: "Importer au moins un document de conformite",
    reviewStatusTitle: "Statut d'onboarding",
    onboardingStatus: "Onboarding",
    accountStatus: "Compte",
    subscriptionStatus: "Abonnement",
    tradeName: "Nom commercial",
    acronym: "Sigle",
    companyEmail: "Email entreprise",
    companyPhone: "Telephone entreprise",
    activityDomain: "Domaine d'activite",
    city: "Ville",
    address: "Adresse",
    countryName: "Pays",
    contactPerson: "Contact principal",
    contactPhone: "Telephone contact",
    website: "Site web",
  },
  en: {
    eyebrow: "Company compliance",
    title: "Administrative documents up to date",
    description:
      "The descriptive company and admin profile section has been removed here. The space now focuses on documents that must stay up to date, their validity dates, compressed scans, and the internal owner who follows them.",
    trackedDocuments: "Tracked documents",
    activeCompany: "Active company",
    renew: "To renew",
    renewHint: "Expiry within 30 days or less",
    expiredCount: "Expired",
    expiredHint: "Needs priority action",
    loading: "Loading...",
    tableTitle: "Compliance table",
    tableHint: "ACF, NIU, location plan, trade register, company statutes, social compliance certificate, bank details, and DG/PCA IDs.",
    addDocument: "Add document",
    readOnly: "Read-only",
    noDocument: "No administrative document has been provided yet.",
    document: "Document",
    validity: "Validity",
    owner: "Internal owner",
    scans: "Scans",
    actions: "Actions",
    bankLabel: "Related bank",
    note: "Useful note",
    valid: "valid",
    expiring: "renew",
    expired: "expired",
    review: "review",
    noNote: "No note.",
    start: "Start",
    end: "End",
    choosePerson: "Choose a person",
    freeName: "Free name if needed",
    unassigned: "Unassigned",
    download: "Download",
    uploading: "Uploading...",
    addScan: "Add scan",
    remove: "Remove",
    save: "Save compliance",
    saving: "Saving...",
    readOnlyHint: "Documents remain visible, but editing is reserved for authorized administrative profiles.",
    setupEyebrow: "Getting started",
    setupTitle: "Company setup",
    setupDescription: "Complete the essential company fields to exit first-run mode cleanly and make day-to-day operations easier.",
    setupPending: "Setup pending",
    setupComplete: "Setup complete",
    setupProgress: "Progress",
    setupTasksTitle: "Remaining actions",
    setupSave: "Save company profile",
    setupSaving: "Saving company profile...",
    setupReadonlyHint: "The company sheet remains visible, but editing is reserved for authorized administrative profiles.",
    setupTask_company_phone: "Add the main company phone number",
    setupTask_company_address: "Fill in the city and reference address",
    setupTask_activity_domain: "Specify the business domain",
    setupTask_main_contact: "Assign a reachable main contact",
    setupTask_compliance_documents: "Upload at least one compliance document",
    reviewStatusTitle: "Onboarding status",
    onboardingStatus: "Onboarding",
    accountStatus: "Account",
    subscriptionStatus: "Subscription",
    tradeName: "Trade name",
    acronym: "Acronym",
    companyEmail: "Company email",
    companyPhone: "Company phone",
    activityDomain: "Business domain",
    city: "City",
    address: "Address",
    countryName: "Country",
    contactPerson: "Main contact",
    contactPhone: "Contact phone",
    website: "Website",
  },
};

export function CompanyComplianceWorkspace({
  companyData,
  loading,
  error,
  canEdit,
  saving,
  mutationError,
  onSaveCompanyProfile,
  onSaveWorkspace,
}) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const text = COPY[locale];
  const contactsQuery = useApiQuery("/chat/contacts", { params: { limit: 200 } });
  const [documents, setDocuments] = useState([]);
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(companyData));
  const [uploadBusyId, setUploadBusyId] = useState("");

  const normalizedWorkspace = useMemo(
    () => normalizeCompanyWorkspacePayload(companyData?.administrative_documents),
    [companyData?.administrative_documents]
  );
  const complianceDocuments = normalizedWorkspace.compliance_documents || [];
  const correspondences = normalizedWorkspace.correspondences || { incoming: [], outgoing: [] };
  const setup = companyData?.setup || {};
  const pendingTaskCodes = setup.pending_task_codes || [];
  const setupStatus = setup.status || "pending";

  useEffect(() => {
    setDocuments(complianceDocuments);
  }, [complianceDocuments]);

  useEffect(() => {
    setProfileForm(buildProfileForm(companyData));
  }, [companyData]);

  const contacts = contactsQuery.data?.items || [];
  const expiringCount = documents.filter((item) => getDocumentValidityStatus(item) === "expiring").length;
  const expiredCount = documents.filter((item) => getDocumentValidityStatus(item) === "expired").length;

  const persistDocuments = async (nextDocuments) => {
    await onSaveWorkspace(
      buildCompanyWorkspacePayload({
        complianceDocuments: nextDocuments,
        incomingCorrespondences: correspondences.incoming || [],
        outgoingCorrespondences: correspondences.outgoing || [],
      })
    );
  };

  const saveCompanyProfile = async () => {
    await onSaveCompanyProfile({
      trade_name: profileForm.trade_name,
      acronym: profileForm.acronym,
      email: profileForm.email,
      phone: profileForm.phone,
      activity_domain: profileForm.activity_domain,
      city: profileForm.city,
      address_line: profileForm.address_line,
      country_name: profileForm.country_name,
      contact_person_name: profileForm.contact_person_name,
      contact_person_phone: profileForm.contact_person_phone,
      website_url: profileForm.website_url,
    });
  };

  const updateDocument = (id, field, value) => {
    setDocuments((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const updateAssignee = (id, userId) => {
    const contact = contacts.find((item) => String(item.id) === String(userId));
    setDocuments((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              assigned_to_user_id: userId,
              assigned_to_label: contact?.display_name || "",
            }
          : item
      )
    );
  };

  const removeDocument = (id) => {
    setDocuments((current) => current.filter((item) => item.id !== id));
  };

  const handleUpload = async (documentId, file) => {
    if (!file || !canEdit) {
      return;
    }

    setUploadBusyId(documentId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpClient.post("/companies/me/uploads/administrative_documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const asset = response.data?.data;
      if (!asset) {
        return;
      }
      const nextDocuments = documents.map((item) =>
        item.id === documentId
          ? {
              ...item,
              attachments: [
                ...(item.attachments || []),
                {
                  id: `${documentId}-${Date.now()}`,
                  name: asset.attachment_name,
                  stored_path: asset.stored_path,
                },
              ],
            }
          : item
      );
      setDocuments(nextDocuments);
      await persistDocuments(nextDocuments);
    } finally {
      setUploadBusyId("");
    }
  };

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-300 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(226,232,240,0.94))] text-slate-950 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:text-white">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">{text.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{text.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-slate-300">{text.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label={text.trackedDocuments} value={documents.length} hint={companyData?.legal_name || text.activeCompany} />
            <SummaryCard label={text.renew} value={expiringCount} hint={text.renewHint} />
            <SummaryCard label={text.expiredCount} value={expiredCount} hint={text.expiredHint} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{text.setupEyebrow}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{text.setupTitle}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text.setupDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={companyStatusVariant(companyData?.onboarding_status)}>{text.onboardingStatus}: {companyData?.onboarding_status || "--"}</Badge>
            <Badge variant={companyStatusVariant(companyData?.account_status)}>{text.accountStatus}: {companyData?.account_status || "--"}</Badge>
            <Badge variant={companyStatusVariant(companyData?.subscription_status)}>{text.subscriptionStatus}: {companyData?.subscription_status || "--"}</Badge>
            <Badge variant={companyStatusVariant(setupStatus)}>{setupStatus === "complete" ? text.setupComplete : text.setupPending}</Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label={text.setupProgress} value={`${setup.completion_percent ?? 0}%`} hint={`${setup.completed_tasks ?? 0}/${setup.total_tasks ?? 0}`} />
          <SummaryCard label={text.reviewStatusTitle} value={companyData?.onboarding_status || "--"} hint={companyData?.legal_name || text.activeCompany} />
          <SummaryCard label={text.setupTasksTitle} value={pendingTaskCodes.length} hint={pendingTaskCodes.length ? text.setupPending : text.setupComplete} />
        </div>

        {!!pendingTaskCodes.length && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/35 dark:text-amber-200">
            <p className="font-medium">{text.setupTasksTitle}</p>
            <ul className="mt-2 list-disc pl-5">
              {pendingTaskCodes.map((code) => (
                <li key={code}>{text[`setupTask_${code}`] || code}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Input value={profileForm.trade_name} onChange={(event) => setProfileForm((current) => ({ ...current, trade_name: event.target.value }))} placeholder={text.tradeName} />
          <Input value={profileForm.acronym} onChange={(event) => setProfileForm((current) => ({ ...current, acronym: event.target.value }))} placeholder={text.acronym} />
          <Input value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} placeholder={text.companyEmail} />
          <Input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder={text.companyPhone} />
          <Input value={profileForm.activity_domain} onChange={(event) => setProfileForm((current) => ({ ...current, activity_domain: event.target.value }))} placeholder={text.activityDomain} />
          <Input value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} placeholder={text.city} />
          <Input value={profileForm.address_line} onChange={(event) => setProfileForm((current) => ({ ...current, address_line: event.target.value }))} placeholder={text.address} />
          <Input value={profileForm.country_name} onChange={(event) => setProfileForm((current) => ({ ...current, country_name: event.target.value }))} placeholder={text.countryName} />
          <Input value={profileForm.contact_person_name} onChange={(event) => setProfileForm((current) => ({ ...current, contact_person_name: event.target.value }))} placeholder={text.contactPerson} />
          <Input value={profileForm.contact_person_phone} onChange={(event) => setProfileForm((current) => ({ ...current, contact_person_phone: event.target.value }))} placeholder={text.contactPhone} />
          <div className="md:col-span-2">
            <Input value={profileForm.website_url} onChange={(event) => setProfileForm((current) => ({ ...current, website_url: event.target.value }))} placeholder={text.website} />
          </div>
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="button" onClick={saveCompanyProfile} disabled={saving}>
              {saving ? text.setupSaving : text.setupSave}
            </Button>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-amber-700 dark:text-amber-300">{text.setupReadonlyHint}</p>
          </Card>
        )}
      </Card>

      {(loading || error) && <p className={`text-sm ${error ? "text-rose-600" : "text-slate-500"}`}>{error || text.loading}</p>}
      {mutationError && <p className="text-sm text-rose-600">{mutationError}</p>}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.tableTitle}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{text.tableHint}</p>
          </div>
          {canEdit ? (
            <Button type="button" onClick={() => setDocuments((current) => [createEmptyComplianceDocument(), ...current])}>
              {text.addDocument}
            </Button>
          ) : (
            <Badge variant="neutral">{text.readOnly}</Badge>
          )}
        </div>

        {!documents.length && <p className="text-sm text-slate-500">{text.noDocument}</p>}

        {!!documents.length && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-slate-100/90 dark:bg-slate-900/80">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  <th className="px-4 py-4 whitespace-nowrap">{text.document}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{text.validity}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{text.owner}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{text.scans}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{text.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
                {documents.map((item) => {
                  const validityStatus = getDocumentValidityStatus(item);
                  const validityLabel =
                    validityStatus === "valid"
                      ? text.valid
                      : validityStatus === "expiring"
                        ? text.expiring
                        : validityStatus === "expired"
                          ? text.expired
                          : text.review;

                  return (
                    <tr key={item.id} className="align-top transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
                      <td className="px-4 py-4">
                        {canEdit ? (
                          <div className="grid gap-2">
                            <select
                              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                              value={item.type || "acf"}
                              onChange={(event) => updateDocument(item.id, "type", event.target.value)}
                            >
                              {COMPLIANCE_DOCUMENT_TYPES.map((entry) => (
                                <option key={entry.value} value={entry.value}>
                                  {getComplianceTypeLabel(entry.value, i18n.language)}
                                </option>
                              ))}
                            </select>
                            {item.type === "rib" ? (
                              <Input value={item.bank_label || ""} onChange={(event) => updateDocument(item.id, "bank_label", event.target.value)} placeholder={text.bankLabel} />
                            ) : null}
                            <Textarea rows={2} value={item.notes || ""} onChange={(event) => updateDocument(item.id, "notes", event.target.value)} placeholder={text.note} />
                          </div>
                        ) : (
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900 dark:text-white">{getComplianceTypeLabel(item.type, i18n.language, item.bank_label)}</p>
                              <Badge variant={statusVariant(validityStatus)}>{validityLabel}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.notes || text.noNote}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {canEdit ? (
                          <div className="grid gap-2">
                            <Input type="date" value={item.valid_from || ""} onChange={(event) => updateDocument(item.id, "valid_from", event.target.value)} />
                            <Input type="date" value={item.valid_until || ""} onChange={(event) => updateDocument(item.id, "valid_until", event.target.value)} />
                          </div>
                        ) : (
                          <div>
                            <p className="text-slate-700 dark:text-slate-200">{text.start}: {formatDate(item.valid_from, i18n.language)}</p>
                            <p className="mt-1 text-slate-700 dark:text-slate-200">{text.end}: {formatDate(item.valid_until, i18n.language)}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {canEdit ? (
                          <div className="grid gap-2">
                            <select
                              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                              value={item.assigned_to_user_id || ""}
                              onChange={(event) => updateAssignee(item.id, event.target.value)}
                            >
                              <option value="">{text.choosePerson}</option>
                              {contacts.map((contact) => (
                                <option key={contact.id} value={contact.id}>
                                  {contact.display_name}
                                </option>
                              ))}
                            </select>
                            <Input value={item.assigned_to_label || ""} onChange={(event) => updateDocument(item.id, "assigned_to_label", event.target.value)} placeholder={text.freeName} />
                          </div>
                        ) : (
                          <p className="text-slate-700 dark:text-slate-200">{item.assigned_to_label || text.unassigned}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(item.attachments || []).map((attachment) => (
                            <a
                              key={attachment.id}
                              href={buildCompanyAssetDownloadUrl(attachment)}
                              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {text.download}
                            </a>
                          ))}
                          {canEdit ? (
                            <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                              {uploadBusyId === item.id ? text.uploading : text.addScan}
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => handleUpload(item.id, event.target.files?.[0])} />
                            </label>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {canEdit ? (
                          <Button type="button" variant="outline" onClick={() => removeDocument(item.id)}>
                            {text.remove}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="button" onClick={() => persistDocuments(documents)} disabled={saving}>
              {saving ? text.saving : text.save}
            </Button>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-amber-700 dark:text-amber-300">{text.readOnlyHint}</p>
          </Card>
        )}
      </Card>
    </section>
  );
}
