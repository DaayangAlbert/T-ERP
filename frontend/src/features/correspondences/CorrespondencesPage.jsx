import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import {
  buildCompanyAssetDownloadUrl,
  buildCompanyWorkspacePayload,
  CORRESPONDENCE_DIRECTIONS,
  createEmptyCorrespondence,
  normalizeCompanyWorkspacePayload,
} from "@/features/companies/companyWorkspaceData";
import { httpClient } from "@/shared/api/httpClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { getUserRoleCodes } from "@/shared/utils/operationalRoles";

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

function countAttachments(item) {
  return Array.isArray(item?.attachments) ? item.attachments.length : 0;
}

function getCorrespondenceDateValue(item, direction) {
  return item?.[direction === CORRESPONDENCE_DIRECTIONS.incoming ? "received_on" : "discharge_on"] || "";
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getSearchTextForColumn(item, column, direction) {
  if (column === "received_on") {
    return getCorrespondenceDateValue(item, direction);
  }

  return item?.[column] || "";
}

function getVisibleCorrespondenceItems(items, direction, searchValue, searchColumn) {
  const normalizedSearch = normalizeSearchValue(searchValue);

  return [...(items || [])]
    .sort((left, right) => {
      const leftDate = Date.parse(getCorrespondenceDateValue(left, direction) || "1970-01-01");
      const rightDate = Date.parse(getCorrespondenceDateValue(right, direction) || "1970-01-01");
      return rightDate - leftDate;
    })
    .filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack =
        searchColumn === "all"
          ? [
              item.reference_number,
              item.subject,
              item.project_name,
              item.signatory,
              getCorrespondenceDateValue(item, direction),
            ]
              .filter(Boolean)
              .join(" ")
          : getSearchTextForColumn(item, searchColumn, direction);

      return normalizeSearchValue(haystack).includes(normalizedSearch);
    });
}

const COPY = {
  fr: {
    columns: {
      all: "Toutes les colonnes",
      reference_number: "Numero",
      subject: "Objet",
      project_name: "Projet",
      signatory: "Signataire",
      received_on: "Date",
    },
    uploading: "Televersement...",
    addScan: "Ajouter un scan",
    add: "Ajouter",
    searchPlaceholder: "Rechercher dans le tableau",
    number: "Numero",
    subject: "Objet",
    project: "Projet",
    signatory: "Signataire",
    reception: "Reception",
    discharge: "Decharge",
    responseDue: "Delai reponse",
    pieces: "Pieces",
    actions: "Actions",
    noCorrespondencePlaceholder: "No de correspondance",
    projectPlaceholder: "Projet concerne",
    signatoryPlaceholder: "Signataire",
    scan: "Scan",
    remove: "Supprimer",
    pieceCount: "piece(s)",
    uploadError: "Televersement impossible.",
    eyebrow: "Correspondances",
    title: "Entrants et sortants",
    description:
      "Enregistrez les correspondances recues et transmises, classees du plus recent au plus ancien, avec les pieces jointes scannees et telechargeables au besoin.",
    incomingCount: "Correspondances recues",
    outgoingCount: "Correspondances transmises",
    loading: "Chargement...",
    incomingTitle: "Correspondances arrivees",
    incomingSubtitle: "Numero, objet, projet, signataire, date de reception, delai de reponse et scans attaches.",
    outgoingTitle: "Correspondances sorties",
    outgoingSubtitle: "Numero, objet, projet, signataire, date de decharge et scans de sortie.",
    incomingEmpty: "Aucune correspondance recue pour le moment.",
    outgoingEmpty: "Aucune correspondance sortante pour le moment.",
    save: "Enregistrer les correspondances",
    saving: "Enregistrement...",
    readOnlyHint: "Cette vue est accessible en lecture. Les ajouts et modifications sont reserves aux profils administratifs autorises.",
  },
  en: {
    columns: {
      all: "All columns",
      reference_number: "Number",
      subject: "Subject",
      project_name: "Project",
      signatory: "Signatory",
      received_on: "Date",
    },
    uploading: "Uploading...",
    addScan: "Add scan",
    add: "Add",
    searchPlaceholder: "Search in the table",
    number: "Number",
    subject: "Subject",
    project: "Project",
    signatory: "Signatory",
    reception: "Received",
    discharge: "Discharged",
    responseDue: "Reply due",
    pieces: "Attachments",
    actions: "Actions",
    noCorrespondencePlaceholder: "Correspondence number",
    projectPlaceholder: "Related project",
    signatoryPlaceholder: "Signatory",
    scan: "Scan",
    remove: "Remove",
    pieceCount: "attachment(s)",
    uploadError: "Upload failed.",
    eyebrow: "Correspondence",
    title: "Incoming and outgoing",
    description:
      "Record received and transmitted correspondence, sorted from newest to oldest, with scanned attachments that can be downloaded when needed.",
    incomingCount: "Received correspondence",
    outgoingCount: "Sent correspondence",
    loading: "Loading...",
    incomingTitle: "Incoming correspondence",
    incomingSubtitle: "Number, subject, project, signatory, received date, reply due date, and attached scans.",
    outgoingTitle: "Outgoing correspondence",
    outgoingSubtitle: "Number, subject, project, signatory, discharge date, and outgoing scans.",
    incomingEmpty: "No incoming correspondence at the moment.",
    outgoingEmpty: "No outgoing correspondence at the moment.",
    save: "Save correspondence",
    saving: "Saving...",
    readOnlyHint: "This view is read-only. Additions and edits are reserved for authorized administrative profiles.",
  },
};

function CorrespondenceTable({
  title,
  subtitle,
  direction,
  items,
  language,
  emptyText,
  readOnly,
  filterValue,
  filterColumn,
  onFilterValueChange,
  onFilterColumnChange,
  onAdd,
  onRemove,
  onChange,
  onUpload,
  uploadBusyId,
  text,
}) {
  const columns = [
    { value: "all", label: text.columns.all },
    { value: "reference_number", label: text.columns.reference_number },
    { value: "subject", label: text.columns.subject },
    { value: "project_name", label: text.columns.project_name },
    { value: "signatory", label: text.columns.signatory },
    { value: "received_on", label: text.columns.received_on },
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
        {!readOnly ? <Button type="button" onClick={onAdd}>{text.add}</Button> : <Badge variant="neutral">{items.length}</Badge>}
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <select className={LIST_SELECT_CLASS} value={filterColumn} onChange={(event) => onFilterColumnChange(event.target.value)}>
          {columns.map((column) => (
            <option key={column.value} value={column.value}>
              {column.label}
            </option>
          ))}
        </select>
        <Input value={filterValue} onChange={(event) => onFilterValueChange(event.target.value)} placeholder={text.searchPlaceholder} />
      </div>

      {!items.length && <p className="text-sm text-slate-500">{emptyText}</p>}

      {!!items.length && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="bg-slate-100/90 dark:bg-slate-900/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                <th className="px-4 py-4 whitespace-nowrap">{text.number}</th>
                <th className="px-4 py-4 whitespace-nowrap">{text.subject}</th>
                <th className="px-4 py-4 whitespace-nowrap">{text.project}</th>
                <th className="px-4 py-4 whitespace-nowrap">{text.signatory}</th>
                <th className="px-4 py-4 whitespace-nowrap">{direction === CORRESPONDENCE_DIRECTIONS.incoming ? text.reception : text.discharge}</th>
                <th className="px-4 py-4 whitespace-nowrap">{direction === CORRESPONDENCE_DIRECTIONS.incoming ? text.responseDue : text.pieces}</th>
                <th className="px-4 py-4 whitespace-nowrap">{text.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
              {items.map((item) => (
                <tr key={item.id} className="align-top transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
                  <td className="px-4 py-4">
                    {readOnly ? (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.reference_number || "--"}</p>
                        <p className="mt-1 text-xs text-slate-500">{countAttachments(item)} {text.pieceCount}</p>
                      </div>
                    ) : (
                      <Input value={item.reference_number || ""} onChange={(event) => onChange(item.id, "reference_number", event.target.value)} placeholder={text.noCorrespondencePlaceholder} />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {readOnly ? (
                      <p className="text-slate-700 dark:text-slate-200">{item.subject || "--"}</p>
                    ) : (
                      <Textarea rows={2} value={item.subject || ""} onChange={(event) => onChange(item.id, "subject", event.target.value)} placeholder={text.subject} />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {readOnly ? (
                      <p className="text-slate-700 dark:text-slate-200">{item.project_name || "--"}</p>
                    ) : (
                      <Input value={item.project_name || ""} onChange={(event) => onChange(item.id, "project_name", event.target.value)} placeholder={text.projectPlaceholder} />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {readOnly ? (
                      <p className="text-slate-700 dark:text-slate-200">{item.signatory || "--"}</p>
                    ) : (
                      <Input value={item.signatory || ""} onChange={(event) => onChange(item.id, "signatory", event.target.value)} placeholder={text.signatoryPlaceholder} />
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {readOnly ? (
                      <p className="text-slate-700 dark:text-slate-200">{formatDate(item.received_on || item.discharge_on, language)}</p>
                    ) : (
                      <div className="grid gap-2">
                        <Input
                          type="date"
                          value={item.received_on || item.discharge_on || ""}
                          onChange={(event) => onChange(item.id, direction === CORRESPONDENCE_DIRECTIONS.incoming ? "received_on" : "discharge_on", event.target.value)}
                        />
                        {direction === CORRESPONDENCE_DIRECTIONS.incoming ? (
                          <Input type="date" value={item.response_due_on || ""} onChange={(event) => onChange(item.id, "response_due_on", event.target.value)} />
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {readOnly ? (
                      <p className="text-slate-700 dark:text-slate-200">
                        {direction === CORRESPONDENCE_DIRECTIONS.incoming
                          ? formatDate(item.response_due_on, language)
                          : `${countAttachments(item)} ${text.pieceCount}`}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">{countAttachments(item)} {text.pieceCount}</p>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(item.attachments) &&
                        item.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={buildCompanyAssetDownloadUrl(attachment)}
                            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {text.scan}
                          </a>
                        ))}
                      {!readOnly ? (
                        <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                          {uploadBusyId === item.id ? text.uploading : text.addScan}
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => onUpload(item.id, event.target.files?.[0])} />
                        </label>
                      ) : null}
                      {!readOnly ? (
                        <Button type="button" variant="outline" onClick={() => onRemove(item.id)}>
                          {text.remove}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function CorrespondencesPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const text = COPY[locale];
  const { user } = useAuth();
  const roleCodes = getUserRoleCodes(user);
  const canEdit = user?.permissions?.includes("companies.manage") || roleCodes.includes("assistant_administratif") || roleCodes.includes("juriste");
  const { mutate, loading: saving, error: mutationError, setError } = useApiMutation();
  const companyQuery = useApiQuery("/companies/me", { ignoreStatuses: [404] });
  const [incomingItems, setIncomingItems] = useState([]);
  const [outgoingItems, setOutgoingItems] = useState([]);
  const [uploadBusyId, setUploadBusyId] = useState("");
  const [incomingSearchValue, setIncomingSearchValue] = useState("");
  const [incomingSearchColumn, setIncomingSearchColumn] = useState("all");
  const [outgoingSearchValue, setOutgoingSearchValue] = useState("");
  const [outgoingSearchColumn, setOutgoingSearchColumn] = useState("all");

  useEffect(() => {
    const workspace = normalizeCompanyWorkspacePayload(companyQuery.data?.administrative_documents);
    setIncomingItems(workspace.correspondences.incoming || []);
    setOutgoingItems(workspace.correspondences.outgoing || []);
  }, [companyQuery.data?.administrative_documents]);

  const visibleIncomingItems = useMemo(
    () => getVisibleCorrespondenceItems(incomingItems, CORRESPONDENCE_DIRECTIONS.incoming, incomingSearchValue, incomingSearchColumn),
    [incomingItems, incomingSearchColumn, incomingSearchValue]
  );
  const visibleOutgoingItems = useMemo(
    () => getVisibleCorrespondenceItems(outgoingItems, CORRESPONDENCE_DIRECTIONS.outgoing, outgoingSearchValue, outgoingSearchColumn),
    [outgoingItems, outgoingSearchColumn, outgoingSearchValue]
  );

  const persistWorkspace = async (nextIncoming, nextOutgoing) => {
    setError(null);
    const currentWorkspace = normalizeCompanyWorkspacePayload(companyQuery.data?.administrative_documents);
    await mutate({
      method: "put",
      url: "/companies/me/settings",
      data: {
        administrative_documents: buildCompanyWorkspacePayload({
          complianceDocuments: currentWorkspace.compliance_documents || [],
          incomingCorrespondences: nextIncoming,
          outgoingCorrespondences: nextOutgoing,
        }),
      },
    });
    await companyQuery.refetch();
  };

  const updateList = (setter, items, id, field, value) => {
    setter(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (setter, items, id) => setter(items.filter((item) => item.id !== id));

  const handleUpload = async (direction, correspondenceId, file) => {
    if (!file || !canEdit) {
      return;
    }

    setUploadBusyId(correspondenceId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await httpClient.post("/companies/me/uploads/correspondences", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const asset = response.data?.data;
      if (!asset) {
        return;
      }
      const normalizedAsset = {
        id: `${correspondenceId}-${Date.now()}`,
        name: asset.attachment_name,
        stored_path: asset.stored_path,
      };
      const nextIncoming =
        direction === CORRESPONDENCE_DIRECTIONS.incoming
          ? incomingItems.map((item) => (item.id === correspondenceId ? { ...item, attachments: [...(item.attachments || []), normalizedAsset] } : item))
          : incomingItems;
      const nextOutgoing =
        direction === CORRESPONDENCE_DIRECTIONS.outgoing
          ? outgoingItems.map((item) => (item.id === correspondenceId ? { ...item, attachments: [...(item.attachments || []), normalizedAsset] } : item))
          : outgoingItems;
      setIncomingItems(nextIncoming);
      setOutgoingItems(nextOutgoing);
      await persistWorkspace(nextIncoming, nextOutgoing);
    } catch (error) {
      setError(error?.response?.data?.message || text.uploadError);
    } finally {
      setUploadBusyId("");
    }
  };

  const addIncoming = () => setIncomingItems((current) => [createEmptyCorrespondence(CORRESPONDENCE_DIRECTIONS.incoming), ...current]);
  const addOutgoing = () => setOutgoingItems((current) => [createEmptyCorrespondence(CORRESPONDENCE_DIRECTIONS.outgoing), ...current]);

  const handleSave = async () => {
    await persistWorkspace(incomingItems, outgoingItems);
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{text.incomingCount}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{incomingItems.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{text.outgoingCount}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{outgoingItems.length}</p>
            </div>
          </div>
        </div>
      </Card>

      {mutationError && <p className="text-sm text-rose-600">{mutationError}</p>}
      {(companyQuery.loading || companyQuery.error) && (
        <p className={`text-sm ${companyQuery.error ? "text-rose-600" : "text-slate-500"}`}>{companyQuery.error || text.loading}</p>
      )}

      <CorrespondenceTable
        title={text.incomingTitle}
        subtitle={text.incomingSubtitle}
        direction={CORRESPONDENCE_DIRECTIONS.incoming}
        items={visibleIncomingItems}
        language={i18n.language}
        emptyText={text.incomingEmpty}
        readOnly={!canEdit}
        filterValue={incomingSearchValue}
        filterColumn={incomingSearchColumn}
        onFilterValueChange={setIncomingSearchValue}
        onFilterColumnChange={setIncomingSearchColumn}
        onAdd={addIncoming}
        onRemove={(id) => removeItem(setIncomingItems, incomingItems, id)}
        onChange={(id, field, value) => updateList(setIncomingItems, incomingItems, id, field, value)}
        onUpload={(id, file) => handleUpload(CORRESPONDENCE_DIRECTIONS.incoming, id, file)}
        uploadBusyId={uploadBusyId}
        text={text}
      />

      <CorrespondenceTable
        title={text.outgoingTitle}
        subtitle={text.outgoingSubtitle}
        direction={CORRESPONDENCE_DIRECTIONS.outgoing}
        items={visibleOutgoingItems}
        language={i18n.language}
        emptyText={text.outgoingEmpty}
        readOnly={!canEdit}
        filterValue={outgoingSearchValue}
        filterColumn={outgoingSearchColumn}
        onFilterValueChange={setOutgoingSearchValue}
        onFilterColumnChange={setOutgoingSearchColumn}
        onAdd={addOutgoing}
        onRemove={(id) => removeItem(setOutgoingItems, outgoingItems, id)}
        onChange={(id, field, value) => updateList(setOutgoingItems, outgoingItems, id, field, value)}
        onUpload={(id, file) => handleUpload(CORRESPONDENCE_DIRECTIONS.outgoing, id, file)}
        uploadBusyId={uploadBusyId}
        text={text}
      />

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? text.saving : text.save}
          </Button>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-amber-700 dark:text-amber-300">{text.readOnlyHint}</p>
        </Card>
      )}
    </section>
  );
}
