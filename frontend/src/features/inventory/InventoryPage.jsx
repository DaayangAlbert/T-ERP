import { useEffect, useRef, useState } from "react";
import { FlaskConical, Package, RefreshCw, Wrench } from "lucide-react";

import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { httpClient } from "@/shared/api/httpClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { buildOfflineActionSummary, enqueueInventoryOfflineAction, isOfflineRequestError, loadInventoryOfflineQueue, loadInventorySupportSnapshot, removeInventoryOfflineAction, saveInventorySupportSnapshot, updateInventoryOfflineAction } from "@/shared/offline/inventoryOfflineQueue";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { getRoleWorkspaceFlags } from "@/shared/utils/operationalRoles";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

const controlClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-primary/30 focus:ring";

const emptyItemForm = { sku: "", name: "", unit: "pcs", category: "material", min_threshold: "0", max_threshold: "", average_unit_cost: "", preferred_supplier: "", barcode: "", qr_code: "", notes: "" };
const emptyLocationForm = { code: "", name: "", location_type: "main_warehouse", project_id: "", address: "", description: "" };
const emptyOperationLine = { item_id: "", quantity: "", unit_price: "", total_amount: "", notes: "" };
const emptyOperationForm = { operation_kind: "entry", operation_date: new Date().toISOString().slice(0, 10), entry_type: "supplier_purchase", exit_type: "project_assignment", source_location_id: "", destination_location_id: "", supplier_name: "", delivery_note_number: "", invoice_reference: "", project_id: "", task_id: "", requested_by_user_id: "", responsible_user_id: "", reference: "", notes: "", validate_now: true, lines: [{ ...emptyOperationLine }] };
const emptyInventoryLine = { item_id: "", counted_quantity: "", observation: "" };
const emptyInventoryForm = { location_id: "", inventory_type: "cycle", inventory_date: new Date().toISOString().slice(0, 10), reference: "", notes: "", validate_now: false, lines: [{ ...emptyInventoryLine }] };

function compactValue(value) {
  if (Array.isArray(value)) {
    return value.map(compactValue).filter((entry) => {
      if (entry == null) return false;
      if (typeof entry !== "object") return true;
      return Object.keys(entry).length > 0;
    });
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, compactValue(entry)])
        .filter(([, entry]) => {
          if (entry === null || entry === undefined || entry === "") return false;
          if (Array.isArray(entry) && !entry.length) return false;
          return !(typeof entry === "object" && !Array.isArray(entry) && Object.keys(entry).length === 0);
        }),
    );
  }
  return value;
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function humanize(code) {
  return String(code || "").split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function normalizeScanValue(value) {
  return String(value || "").trim().toLowerCase();
}

function badgeTone(status) {
  if (["validated", "success", "approved", "normal"].includes(status)) return "success";
  if (["cancelled", "critical", "out_of_stock", "theft_anomaly"].includes(status)) return "danger";
  if (["pending", "draft", "low_stock", "overstock", "loss_breakage"].includes(status)) return "warning";
  if (["entry", "exit", "transfer"].includes(status)) return "info";
  return "neutral";
}

function MetricCard({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">{eyebrow}</p>}
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{text}</p>;
}

export function InventoryPage({ initialTab = "catalog", initialProjectId = "" }) {
  const { tenantId, user } = useAuth();
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const { canManageInventory, isComptable, isMagasinier } = getRoleWorkspaceFlags(user);
  const [activeTab, setActiveTab] = useState(initialTab || "catalog");
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [operationForm, setOperationForm] = useState(emptyOperationForm);
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [scanQuery, setScanQuery] = useState("");
  const [scanTarget, setScanTarget] = useState("lookup");
  const [scanStatus, setScanStatus] = useState("Pret pour un scan chantier.");
  const [scannerRunning, setScannerRunning] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [offlineQueue, setOfflineQueue] = useState(() => loadInventoryOfflineQueue());
  const [cachedSupportData, setCachedSupportData] = useState(() => loadInventorySupportSnapshot());
  const [queueSyncing, setQueueSyncing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanBusyRef = useRef(false);
  const lastScanRef = useRef({ value: "", at: 0 });

  const support = useApiQuery("/inventory/support-data", { enabled: canLoadTenantData });
  const dashboard = useApiQuery("/inventory/dashboard", { enabled: canLoadTenantData });
  const operations = useApiQuery("/inventory/operations", { enabled: canLoadTenantData, params: { page_size: 20 } });
  const movements = useApiQuery("/inventory/movements", { enabled: canLoadTenantData, params: { page_size: 20 } });
  const allocations = useApiQuery("/inventory/allocations", { enabled: canLoadTenantData, params: { page_size: 20 } });
  const inventories = useApiQuery("/inventory/inventories", { enabled: canLoadTenantData, params: { page_size: 20 } });
  const reports = useApiQuery("/inventory/reports/summary", { enabled: canLoadTenantData });
  const activity = useApiQuery("/inventory/activity", { enabled: canLoadTenantData, params: { page_size: 15 } });
  const { mutate, loading: mutating, error: mutationError, setError: setMutationError } = useApiMutation();

  const supportData = support.data || cachedSupportData || {};
  const items = supportData.items || [];
  const locations = supportData.locations || [];
  const projects = supportData.projects || [];
  const tasks = supportData.tasks || [];
  const users = supportData.users || [];
  const enums = supportData.enums || {};
  const summary = dashboard.data?.summary || {};
  const alerts = dashboard.data?.alerts || [];
  const pendingOperations = dashboard.data?.pending_operations || [];
  const latestEntries = dashboard.data?.latest_entries || [];
  const latestExits = dashboard.data?.latest_exits || [];
  const operationRows = operations.data?.items || [];
  const movementRows = movements.data?.items || [];
  const allocationRows = allocations.data?.items || [];
  const inventoryRows = inventories.data?.items || [];
  const valuationRows = reports.data?.valuation || [];
  const consumptionRows = reports.data?.consumption_by_project || [];
  const lossRows = reports.data?.losses_and_anomalies || [];
  const reportInventories = reports.data?.inventories || [];
  const categoryRows = reports.data?.stock_state?.by_category || [];
  const totalStockValue = reports.data?.stock_state?.total_stock_value || 0;
  const activityRows = activity.data?.items || [];

  const locationTypes = enums.location_types || ["main_warehouse", "secondary_depot", "site"];
  const itemCategories = enums.item_categories || ["material", "equipment", "consumable"];
  const entryTypes = enums.entry_types || ["supplier_purchase", "site_return", "internal_transfer", "stock_adjustment"];
  const exitTypes = enums.exit_types || ["project_assignment", "internal_consumption", "loss_breakage", "theft_anomaly"];
  const inventoryTypes = enums.inventory_types || ["periodic", "permanent", "cycle"];
  const criticalItems = items.filter((item) => item.is_critical).slice(0, 6);
  const scopedProjectId = String(initialProjectId || "").trim();
  const hasScopedProject = Boolean(scopedProjectId);
  const scopedProjects = hasScopedProject
    ? projects.filter((project) => String(project.id) === scopedProjectId)
    : projects;
  const scopedOperationRows = hasScopedProject
    ? operationRows.filter((operation) => String(operation.project_id || "") === scopedProjectId)
    : operationRows;
  const scopedMovementRows = hasScopedProject
    ? movementRows.filter((movement) => String(movement.project_id || movement.operation?.project_id || "") === scopedProjectId)
    : movementRows;
  const scopedAllocationRows = hasScopedProject
    ? allocationRows.filter((allocation) => String(allocation.project_id || allocation.project?.id || "") === scopedProjectId)
    : allocationRows;
  const selectedProjectTasks = tasks.filter((task) => String(task.project_id) === String(operationForm.project_id || ""));
  const operationNeedsProject = operationForm.operation_kind === "exit" && operationForm.exit_type === "project_assignment";
  const pageErrors = (isOnline ? [support.error, dashboard.error, operations.error, movements.error, allocations.error, inventories.error, reports.error, activity.error] : []).filter(Boolean);
  const readOnlyInventory = canLoadTenantData && !canManageInventory;
  const scanSupported =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  const scanMatches = scanQuery
    ? items.filter((item) => {
        const needle = normalizeScanValue(scanQuery);
        const exactValues = [item.barcode, item.qr_code, item.sku].map(normalizeScanValue);
        const fuzzyValues = [item.name, item.barcode, item.qr_code, item.sku].map(normalizeScanValue);
        return exactValues.includes(needle) || fuzzyValues.some((value) => value.includes(needle));
      })
    : [];

  useEffect(() => {
    setActiveTab(initialTab || "catalog");
  }, [initialTab]);

  useEffect(() => {
    if (!hasScopedProject) {
      return;
    }
    setOperationForm((prev) => ({
      ...prev,
      project_id: scopedProjectId,
    }));
  }, [hasScopedProject, scopedProjectId]);

  const refreshAll = async () => {
    await Promise.all([support.refetch(), dashboard.refetch(), operations.refetch(), movements.refetch(), allocations.refetch(), inventories.refetch(), reports.refetch(), activity.refetch()]);
  };

  const queueOfflineAction = (action) => {
    const queued = enqueueInventoryOfflineAction(action);
    setOfflineQueue(loadInventoryOfflineQueue());
    return queued;
  };

  const syncOfflineQueue = async () => {
    if (queueSyncing || typeof navigator !== "undefined" && navigator.onLine === false) return;
    const queue = loadInventoryOfflineQueue().filter((action) => !action.blocked_at);
    if (!queue.length) return;

    setQueueSyncing(true);
    let queueChanged = false;
    for (const action of queue) {
      try {
        await httpClient.request({
          method: action.method || "post",
          url: action.url,
          data: action.payload,
          params: action.params,
        });
        removeInventoryOfflineAction(action.id);
        queueChanged = true;
      } catch (error) {
        if (isOfflineRequestError(error)) {
          updateInventoryOfflineAction(action.id, (current) => ({ ...current, retry_count: (current.retry_count || 0) + 1, last_error: "Connexion indisponible" }));
          break;
        }
        updateInventoryOfflineAction(action.id, (current) => ({
          ...current,
          retry_count: (current.retry_count || 0) + 1,
          last_error: error.response?.data?.message || error.message || "Erreur de synchronisation",
          blocked_at: current.blocked_at || new Date().toISOString(),
        }));
        queueChanged = true;
      }
    }
    setOfflineQueue(loadInventoryOfflineQueue());
    setQueueSyncing(false);
    if (queueChanged) {
      await refreshAll();
    }
  };

  const runInventoryMutation = async ({ method = "post", url, data, offlineKind, offlineLabel, successMessage, reset }) => {
    setMutationError(null);
    try {
      const response = await mutate({ method, url, data });
      reset?.();
      await refreshAll();
      if (successMessage) {
        setScanStatus(successMessage);
      }
      return { queued: false, response };
    } catch (error) {
      if (!offlineKind || !isOfflineRequestError(error)) {
        throw error;
      }
      queueOfflineAction({
        kind: offlineKind,
        label: offlineLabel,
        method,
        url,
        payload: data,
      });
      reset?.();
      setMutationError(null);
      setScanStatus(`${offlineLabel || "Action"} enregistree hors ligne et en attente de synchronisation.`);
      return { queued: true, response: null };
    }
  };

  const logScanEvent = async ({ scannedValue, matchedItem = null, mode = "manual", notes = null }) => {
    const payload = {
      scanned_value: scannedValue,
      matched_item_id: matchedItem?.id || null,
      matched_item_name: matchedItem?.name || null,
      scan_target: scanTarget,
      scan_mode: mode,
      captured_at: new Date().toISOString(),
      device_label: typeof navigator !== "undefined" ? navigator.userAgent : null,
      notes,
    };
    try {
      await httpClient.post("/inventory/mobile-scans", payload);
    } catch (error) {
      if (isOfflineRequestError(error)) {
        queueOfflineAction({
          kind: "scan",
          label: `Scan ${scannedValue}`,
          method: "post",
          url: "/inventory/mobile-scans",
          payload: {
            ...payload,
            synced_from_offline: true,
          },
        });
      }
    }
  };

  const updateItem = (key, value) => setItemForm((prev) => ({ ...prev, [key]: value }));
  const updateLocation = (key, value) => setLocationForm((prev) => ({ ...prev, [key]: value }));
  const updateOperation = (key, value) => setOperationForm((prev) => ({ ...prev, [key]: value }));
  const updateInventory = (key, value) => setInventoryForm((prev) => ({ ...prev, [key]: value }));

  const submitItem = async (event) => {
    event.preventDefault();
    setMutationError(null);
    try {
      await mutate({ method: "post", url: "/inventory/items", data: compactValue(itemForm) });
      setItemForm(emptyItemForm);
      await refreshAll();
    } catch {}
  };
  const submitLocation = async (event) => {
    event.preventDefault();
    setMutationError(null);
    try {
      await mutate({ method: "post", url: "/inventory/locations", data: compactValue(locationForm) });
      setLocationForm(emptyLocationForm);
      await refreshAll();
    } catch {}
  };
  const submitOperation = async (event) => {
    event.preventDefault();
    try {
      await runInventoryMutation({
        url: "/inventory/operations",
        data: compactValue(operationForm),
        offlineKind: "operation",
        offlineLabel: `Operation ${operationForm.reference || operationForm.operation_kind}`,
        reset: () => setOperationForm({ ...emptyOperationForm, operation_kind: operationForm.operation_kind, operation_date: new Date().toISOString().slice(0, 10), validate_now: operationForm.operation_kind === "entry" }),
      });
    } catch {}
  };
  const submitInventory = async (event) => {
    event.preventDefault();
    try {
      await runInventoryMutation({
        url: "/inventory/inventories",
        data: compactValue(inventoryForm),
        offlineKind: "inventory",
        offlineLabel: `Inventaire ${inventoryForm.reference || inventoryForm.inventory_date}`,
        reset: () => setInventoryForm(emptyInventoryForm),
      });
    } catch {}
  };

  const validateOperation = async (operationId) => {
    setMutationError(null);
    try {
      await mutate({ method: "post", url: `/inventory/operations/${operationId}/validate`, data: {} });
      await refreshAll();
    } catch {}
  };
  const cancelOperation = async (operationId) => {
    setMutationError(null);
    try {
      await mutate({ method: "post", url: `/inventory/operations/${operationId}/cancel`, data: { notes: "Annule depuis le tableau magasinier" } });
      await refreshAll();
    } catch {}
  };
  const validateInventory = async (inventoryId) => {
    setMutationError(null);
    try {
      await mutate({ method: "post", url: `/inventory/inventories/${inventoryId}/validate`, data: {} });
      await refreshAll();
    } catch {}
  };

  const updateOperationKind = (value) => {
    setOperationForm((prev) => ({ ...prev, operation_kind: value, validate_now: value === "entry", entry_type: value === "entry" ? prev.entry_type || "supplier_purchase" : "", exit_type: value === "exit" ? prev.exit_type || "project_assignment" : "", project_id: value === "exit" ? (prev.project_id || scopedProjectId) : (hasScopedProject ? scopedProjectId : ""), task_id: value === "exit" ? prev.task_id : "" }));
  };
  const updateExitType = (value) => {
    setOperationForm((prev) => ({ ...prev, exit_type: value, project_id: value === "project_assignment" ? (prev.project_id || scopedProjectId) : (hasScopedProject ? scopedProjectId : ""), task_id: value === "project_assignment" ? prev.task_id : "", destination_location_id: value === "project_assignment" ? prev.destination_location_id : "" }));
  };
  const updateOperationLine = (index, key, value) => {
    setOperationForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const nextLine = { ...line, [key]: value };
        if ((key === "quantity" || key === "unit_price") && nextLine.quantity !== "" && nextLine.unit_price !== "") {
          nextLine.total_amount = String(Number(nextLine.quantity || 0) * Number(nextLine.unit_price || 0));
        }
        return nextLine;
      }),
    }));
  };
  const addOperationLine = () => setOperationForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyOperationLine }] }));
  const removeOperationLine = (index) => setOperationForm((prev) => ({ ...prev, lines: prev.lines.length === 1 ? prev.lines : prev.lines.filter((_, lineIndex) => lineIndex !== index) }));
  const updateInventoryLine = (index, key, value) => setInventoryForm((prev) => ({ ...prev, lines: prev.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)) }));
  const addInventoryLine = () => setInventoryForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyInventoryLine }] }));
  const removeInventoryLine = (index) => setInventoryForm((prev) => ({ ...prev, lines: prev.lines.length === 1 ? prev.lines : prev.lines.filter((_, lineIndex) => lineIndex !== index) }));

  const stopScanner = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause?.();
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    detectorRef.current = null;
    scanBusyRef.current = false;
    setScannerRunning(false);
  };

  const applyScannedItem = (item) => {
    if (!item) return;
    if (scanTarget === "item_form") {
      setItemForm((prev) => ({
        ...prev,
        sku: item.sku || prev.sku,
        name: item.name || prev.name,
        unit: item.unit || prev.unit,
        category: item.category || prev.category,
        min_threshold: String(item.min_threshold ?? prev.min_threshold ?? ""),
        max_threshold: item.max_threshold === null || item.max_threshold === undefined ? prev.max_threshold : String(item.max_threshold),
        average_unit_cost: String(item.average_unit_cost ?? prev.average_unit_cost ?? ""),
        preferred_supplier: item.preferred_supplier || prev.preferred_supplier,
        barcode: item.barcode || prev.barcode,
        qr_code: item.qr_code || prev.qr_code,
        notes: item.notes || prev.notes,
      }));
      setActiveTab("catalog");
      setScanStatus(`Article ${item.name} charge dans la fiche article.`);
      return;
    }
    if (scanTarget === "operation_line") {
      setOperationForm((prev) => ({
        ...prev,
        lines: prev.lines.map((line, index) => (index === 0 ? { ...line, item_id: String(item.id) } : line)),
      }));
      setActiveTab("operations");
      setScanStatus(`Article ${item.name} injecte dans la premiere ligne d'operation.`);
      return;
    }
    if (scanTarget === "inventory_line") {
      setInventoryForm((prev) => ({
        ...prev,
        lines: prev.lines.map((line, index) => (index === 0 ? { ...line, item_id: String(item.id) } : line)),
      }));
      setActiveTab("inventories");
      setScanStatus(`Article ${item.name} injecte dans la premiere ligne d'inventaire.`);
    }
  };

  const handleScanValue = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return;
    const now = Date.now();
    if (lastScanRef.current.value === value && now - lastScanRef.current.at < 2500) {
      return;
    }
    lastScanRef.current = { value, at: now };
    setScanQuery(value);
    const needle = normalizeScanValue(value);
    const exactMatches = items.filter((item) => [item.barcode, item.qr_code, item.sku].map(normalizeScanValue).includes(needle));
    const matches = exactMatches.length
      ? exactMatches
      : items.filter((item) => [item.name, item.barcode, item.qr_code, item.sku].map(normalizeScanValue).some((entry) => entry.includes(needle)));
    if (!matches.length) {
      setScanStatus(`Aucun article reconnu pour ${value}.`);
      void logScanEvent({ scannedValue: value, matchedItem: null, mode: scannerRunning ? "camera" : "manual", notes: "Aucune correspondance locale" });
      return;
    }
    setScanStatus(`${matches.length} article(s) reconnu(s) pour ${value}.`);
    void logScanEvent({ scannedValue: value, matchedItem: matches[0], mode: scannerRunning ? "camera" : "manual" });
    if (scanTarget !== "lookup") {
      applyScannedItem(matches[0]);
    }
  };

  const startScanner = async () => {
    if (!scanSupported) {
      setScanStatus("Scan camera indisponible sur ce navigateur. Utilisez la saisie manuelle.");
      return;
    }
    stopScanner();
    setActiveTab("catalog");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      detectorRef.current = new window.BarcodeDetector({
        formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39"],
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || !detectorRef.current || scanBusyRef.current) return;
        scanBusyRef.current = true;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          if (results?.length) {
            const value = results[0]?.rawValue;
            if (value) {
              handleScanValue(value);
            }
          }
        } catch {}
        scanBusyRef.current = false;
      }, 900);
      setScannerRunning(true);
      setScanStatus("Camera active. Pointez un QR code ou un code-barres.");
    } catch (error) {
      stopScanner();
      setScanStatus(error?.message || "Impossible d'acceder a la camera.");
    }
  };

  useEffect(() => {
    if (support.data?.items?.length || support.data?.locations?.length) {
      saveInventorySupportSnapshot(support.data);
      setCachedSupportData(support.data);
    }
  }, [support.data]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length) {
      void syncOfflineQueue();
    }
  }, [isOnline, offlineQueue.length]);

  useEffect(() => () => stopScanner(), []);

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.inventory" />;
  }

  let tabContent = <Card><p className="text-sm text-slate-600 dark:text-slate-300">Chargement...</p></Card>;

  if (activeTab === "catalog") {
    tabContent = (
      <div className="space-y-5">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#0f766e_100%)] text-white">
          <SectionTitle eyebrow="Scan & Mobile" title="Recherche rapide par QR code ou code-barres" description="Camera terrain si supportee, sinon saisie manuelle du code." action={<Badge className="bg-white/15 text-white" variant="neutral">{scanSupported ? "Camera ok" : "Mode manuel"}</Badge>} />
          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <video ref={videoRef} className="aspect-[4/3] w-full rounded-xl bg-slate-950 object-cover" muted playsInline />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={startScanner}>{scannerRunning ? "Relancer le scan" : "Activer la camera"}</Button>
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={stopScanner}>Arreter</Button>
              </div>
              <p className="text-sm text-slate-200">{scanStatus}</p>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <Input className="border-white/20 bg-white/10 text-white placeholder:text-slate-300" placeholder="Saisir ou coller un code" value={scanQuery} onChange={(event) => setScanQuery(event.target.value)} />
                <select className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-white/20 focus:ring" value={scanTarget} onChange={(event) => setScanTarget(event.target.value)}>
                  <option value="lookup" className="text-slate-900">Recherche seulement</option>
                  <option value="item_form" className="text-slate-900">Fiche article</option>
                  <option value="operation_line" className="text-slate-900">Ligne operation</option>
                  <option value="inventory_line" className="text-slate-900">Ligne inventaire</option>
                </select>
                <Button className="bg-amber-300 text-slate-950 hover:bg-amber-200" onClick={() => handleScanValue(scanQuery)}>Analyser</Button>
              </div>

              {!scanMatches.length && <p className="rounded-2xl border border-dashed border-white/20 px-4 py-4 text-sm text-slate-300">Aucun article detecte pour le code saisi. Le scan accepte QR, barcode, SKU et recherche textuelle.</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {scanMatches.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{item.name}</p>
                      <Badge className="bg-white/15 text-white" variant="neutral">{item.sku}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{item.barcode || item.qr_code || "Sans code enregistre"}</p>
                    <p className="mt-1 text-sm text-slate-300">Disponible {item.available_quantity || 0} {item.unit}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => applyScannedItem(item)}>Utiliser</Button>
                      <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => { setItemForm((prev) => ({ ...prev, barcode: item.barcode || prev.barcode, qr_code: item.qr_code || prev.qr_code })); setActiveTab("catalog"); }}>Codes vers la fiche</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle
            eyebrow="Catalogue"
            title="Articles par catégorie"
            description="Vue d'ensemble des articles disponibles en stock, groupés par famille."
            action={<Badge variant="info">{items.filter((item) => Number(item.available_quantity || 0) > 0).length} disponibles</Badge>}
          />
          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { key: "material", label: "Matériaux", icon: Package },
              { key: "equipment", label: "Équipements", icon: Wrench },
              { key: "consumable", label: "Consommables", icon: FlaskConical },
            ].map((block) => {
              const categoryItems = items
                .filter((item) => item.category === block.key && Number(item.available_quantity || 0) > 0)
                .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" }));
              const BlockIcon = block.icon;
              return (
                <div key={block.key} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                        <BlockIcon className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{block.label}</p>
                    </div>
                    <Badge variant="neutral">{categoryItems.length}</Badge>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-auto pr-1">
                    {categoryItems.length ? (
                      categoryItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <Badge variant={badgeTone(item.alert_level)}>{item.available_quantity || 0} {item.unit}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">{item.sku}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Aucun article disponible dans cette catégorie.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <SectionTitle eyebrow="Catalogue" title="Creer un article" description="Article, categorie, seuils, cout moyen, fournisseur et identifiants scan." />
            <form className="grid gap-3" onSubmit={submitItem}>
              <fieldset disabled={readOnlyInventory} className="grid gap-3 disabled:cursor-not-allowed disabled:opacity-70">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input required placeholder="SKU" value={itemForm.sku} onChange={(event) => updateItem("sku", event.target.value)} />
                  <Input required placeholder="Nom article" value={itemForm.name} onChange={(event) => updateItem("name", event.target.value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <select className={controlClass} value={itemForm.category} onChange={(event) => updateItem("category", event.target.value)}>
                    {itemCategories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                  </select>
                  <Input required placeholder="Unite" value={itemForm.unit} onChange={(event) => updateItem("unit", event.target.value)} />
                  <Input type="number" placeholder="Seuil mini" value={itemForm.min_threshold} onChange={(event) => updateItem("min_threshold", event.target.value)} />
                  <Input type="number" placeholder="Seuil maxi" value={itemForm.max_threshold} onChange={(event) => updateItem("max_threshold", event.target.value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="number" placeholder="Prix moyen" value={itemForm.average_unit_cost} onChange={(event) => updateItem("average_unit_cost", event.target.value)} />
                  <Input placeholder="Fournisseur principal" value={itemForm.preferred_supplier} onChange={(event) => updateItem("preferred_supplier", event.target.value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Code-barres" value={itemForm.barcode} onChange={(event) => updateItem("barcode", event.target.value)} />
                  <Input placeholder="QR code" value={itemForm.qr_code} onChange={(event) => updateItem("qr_code", event.target.value)} />
                </div>
                <Textarea rows={3} placeholder="Notes article" value={itemForm.notes} onChange={(event) => updateItem("notes", event.target.value)} />
                <Button type="submit" disabled={mutating || readOnlyInventory}>Creer</Button>
              </fieldset>
            </form>
          </Card>

          <Card>
            <SectionTitle eyebrow="Disponibilite" title="Stock en temps reel" description="Quantite disponible, reservee, valeur stock, consommation moyenne et besoin suggere." action={<Badge variant="info">{items.length}</Badge>} />
            {!items.length && <EmptyState text="Aucun article enregistre." />}
            <div className="max-h-[780px] space-y-3 overflow-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <Badge variant="neutral">{item.sku}</Badge>
                        <Badge variant="info">{humanize(item.category)}</Badge>
                        <Badge variant={badgeTone(item.alert_level)}>{humanize(item.alert_level)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.preferred_supplier || "Sans fournisseur principal"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-700">{formatMoney(item.stock_value)}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Prix moyen {formatMoney(item.average_unit_cost)}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Disponible</p><p className="mt-2 text-lg font-semibold text-slate-900">{item.available_quantity || 0} {item.unit}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Reserve</p><p className="mt-2 text-lg font-semibold text-amber-700">{item.reserved_quantity || 0} {item.unit}</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Conso moyenne</p><p className="mt-2 text-lg font-semibold text-slate-900">{item.average_monthly_consumption || 0} {item.unit}/mois</p></div>
                    <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">A acheter</p><p className="mt-2 text-lg font-semibold text-sky-700">{item.suggested_purchase_quantity || 0} {item.unit}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <SectionTitle eyebrow="Organisation" title="Ajouter un depot ou un stock chantier" description="Magasin principal, depot secondaire ou site rattache a un projet." />
            <form className="grid gap-3" onSubmit={submitLocation}>
              <fieldset disabled={readOnlyInventory} className="grid gap-3 disabled:cursor-not-allowed disabled:opacity-70">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input required placeholder="Code depot" value={locationForm.code} onChange={(event) => updateLocation("code", event.target.value)} />
                  <Input required placeholder="Nom depot" value={locationForm.name} onChange={(event) => updateLocation("name", event.target.value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select className={controlClass} value={locationForm.location_type} onChange={(event) => updateLocation("location_type", event.target.value)}>
                    {locationTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                  </select>
                  <select className={controlClass} value={locationForm.project_id} onChange={(event) => updateLocation("project_id", event.target.value)}>
                    <option value="">Projet optionnel</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <Input placeholder="Adresse" value={locationForm.address} onChange={(event) => updateLocation("address", event.target.value)} />
                <Textarea rows={3} placeholder="Description emplacement" value={locationForm.description} onChange={(event) => updateLocation("description", event.target.value)} />
                <Button type="submit" disabled={mutating || readOnlyInventory}>Creer le depot</Button>
              </fieldset>
            </form>
          </Card>

          <Card>
            <SectionTitle eyebrow="Multi-localisation" title="Carte logique des emplacements" description="Chaque article peut ensuite etre suivi par depot, magasin ou chantier." action={<Badge variant="neutral">{locations.length}</Badge>} />
            {!locations.length && <EmptyState text="Aucun emplacement enregistre." />}
            <div className="space-y-3">
              {locations.map((location) => (
                <div key={location.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{location.name}</p>
                        <Badge variant="neutral">{location.code}</Badge>
                        <Badge variant="info">{humanize(location.location_type)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{location.project?.name || "Aucun projet rattache"}</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{location.address || "Adresse non renseignee"}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === "operations") {
    tabContent = (
      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <Card>
          <SectionTitle eyebrow="Mouvement" title="Creer une entree, sortie ou transfert" description="Les lignes d'operation servent de base a la tracabilite et au calcul des couts." />
          <form className="grid gap-4" onSubmit={submitOperation}>
            <fieldset disabled={readOnlyInventory} className="grid gap-4 disabled:cursor-not-allowed disabled:opacity-70">
              <div className="grid gap-3 md:grid-cols-3">
                <select className={controlClass} value={operationForm.operation_kind} onChange={(event) => updateOperationKind(event.target.value)}>
                  <option value="entry">Entree</option>
                  <option value="exit">Sortie</option>
                  <option value="transfer">Transfert</option>
                </select>
                <Input required type="date" value={operationForm.operation_date} onChange={(event) => updateOperation("operation_date", event.target.value)} />
                <Input placeholder="Reference interne" value={operationForm.reference} onChange={(event) => updateOperation("reference", event.target.value)} />
              </div>

              {operationForm.operation_kind === "entry" && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select className={controlClass} value={operationForm.entry_type} onChange={(event) => updateOperation("entry_type", event.target.value)}>
                      {entryTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                    </select>
                    <select className={controlClass} value={operationForm.destination_location_id} onChange={(event) => updateOperation("destination_location_id", event.target.value)} required>
                      <option value="">Depot de stockage</option>
                      {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input placeholder="Fournisseur" value={operationForm.supplier_name} onChange={(event) => updateOperation("supplier_name", event.target.value)} />
                    <Input placeholder="Bon de livraison" value={operationForm.delivery_note_number} onChange={(event) => updateOperation("delivery_note_number", event.target.value)} />
                    <Input placeholder="Reference facture" value={operationForm.invoice_reference} onChange={(event) => updateOperation("invoice_reference", event.target.value)} />
                  </div>
                  <select className={controlClass} value={operationForm.project_id} onChange={(event) => updateOperation("project_id", event.target.value)} disabled={hasScopedProject}>
                    <option value="">Projet associe (optionnel)</option>
                    {scopedProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </>
              )}

              {operationForm.operation_kind === "exit" && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select className={controlClass} value={operationForm.exit_type} onChange={(event) => updateExitType(event.target.value)}>
                      {exitTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                    </select>
                    <select className={controlClass} value={operationForm.source_location_id} onChange={(event) => updateOperation("source_location_id", event.target.value)} required>
                      <option value="">Depot source</option>
                      {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <select className={controlClass} value={operationForm.project_id} onChange={(event) => updateOperation("project_id", event.target.value)} disabled={!operationNeedsProject || hasScopedProject} required={operationNeedsProject}>
                      <option value="">Projet</option>
                      {scopedProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                    <select className={controlClass} value={operationForm.task_id} onChange={(event) => updateOperation("task_id", event.target.value)} disabled={!operationNeedsProject}>
                      <option value="">Tache</option>
                      {selectedProjectTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                    </select>
                    <select className={controlClass} value={operationForm.destination_location_id} onChange={(event) => updateOperation("destination_location_id", event.target.value)} disabled={!operationNeedsProject}>
                      <option value="">Stock chantier destination</option>
                      {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {operationForm.operation_kind === "transfer" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <select className={controlClass} value={operationForm.source_location_id} onChange={(event) => updateOperation("source_location_id", event.target.value)} required>
                    <option value="">Depot source</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                  <select className={controlClass} value={operationForm.destination_location_id} onChange={(event) => updateOperation("destination_location_id", event.target.value)} required>
                    <option value="">Depot destination</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <select className={controlClass} value={operationForm.requested_by_user_id} onChange={(event) => updateOperation("requested_by_user_id", event.target.value)}>
                  <option value="">Demandeur</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
                <select className={controlClass} value={operationForm.responsible_user_id} onChange={(event) => updateOperation("responsible_user_id", event.target.value)}>
                  <option value="">Responsable reception / sortie</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                </select>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Lignes d'operation</h4>
                  <Button variant="outline" onClick={addOperationLine}>Ajouter une ligne</Button>
                </div>
                {operationForm.lines.map((line, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr]">
                      <select className={controlClass} value={line.item_id} onChange={(event) => updateOperationLine(index, "item_id", event.target.value)} required>
                        <option value="">Article</option>
                        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      <Input required type="number" placeholder="Quantite" value={line.quantity} onChange={(event) => updateOperationLine(index, "quantity", event.target.value)} />
                      <Input type="number" placeholder="Prix unitaire" value={line.unit_price} onChange={(event) => updateOperationLine(index, "unit_price", event.target.value)} />
                      <Input type="number" placeholder="Montant" value={line.total_amount} onChange={(event) => updateOperationLine(index, "total_amount", event.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input placeholder="Observation ligne" value={line.notes} onChange={(event) => updateOperationLine(index, "notes", event.target.value)} />
                      <Button variant="outline" onClick={() => removeOperationLine(index)}>Retirer</Button>
                    </div>
                  </div>
                ))}
              </div>

              <Textarea rows={3} placeholder="Notes operation" value={operationForm.notes} onChange={(event) => updateOperation("notes", event.target.value)} />
              <label className="flex items-center gap-3 text-sm text-slate-600"><input type="checkbox" checked={Boolean(operationForm.validate_now)} onChange={(event) => updateOperation("validate_now", event.target.checked)} />Valider immediatement si autorise</label>
              <Button type="submit" disabled={mutating || readOnlyInventory}>Enregistrer l'operation</Button>
            </fieldset>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle eyebrow="Trafic" title="Dernieres operations" description="Trace de toutes les entrees, sorties et transferts avec leurs lignes." action={<Badge variant="neutral">{hasScopedProject ? scopedOperationRows.length : operations.data?.pagination?.total || operationRows.length}</Badge>} />
            {!scopedOperationRows.length && <EmptyState text="Aucune operation enregistree." />}
            <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
              {scopedOperationRows.map((operation) => (
                <div key={operation.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">#{operation.id}</p><Badge variant={badgeTone(operation.status)}>{humanize(operation.status)}</Badge><Badge variant="info">{humanize(operation.operation_kind)}</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(operation.operation_date)}</p></div>
                    <div className="text-right text-sm text-slate-600 dark:text-slate-300"><p>{operation.source_location?.name || "-"}</p><p>{operation.destination_location?.name || "-"}</p></div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{operation.lines.map((line) => `${line.item?.name || "Article"} (${line.quantity || 0})`).join(", ")}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Traceabilite" title="Mouvements de stock et affectations" description="Historique physique et numerique des ressources sorties ou transferees." />
            <div className="grid gap-4">
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Mouvements recents</p>
                {!scopedMovementRows.length && <EmptyState text="Aucun mouvement comptabilise." />}
                <div className="max-h-[240px] space-y-3 overflow-auto pr-1">
                  {scopedMovementRows.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-900">{movement.item?.name || "Article"}</p><Badge variant={badgeTone(movement.movement_type)}>{humanize(movement.movement_type)}</Badge></div>
                        <p className="text-sm font-semibold text-slate-900">{movement.quantity || 0} {movement.item?.unit || ""}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{movement.project?.name || "Hors projet"} - stock {movement.stock_before ?? "-"} / {movement.stock_after ?? "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">Affectations chantier</p>
                {!scopedAllocationRows.length && <EmptyState text="Aucune affectation projet enregistree." />}
                <div className="max-h-[220px] space-y-3 overflow-auto pr-1">
                  {scopedAllocationRows.map((allocation) => (
                    <div key={allocation.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{allocation.project?.name || "Projet"}</p><Badge variant="info">{allocation.quantity_allocated || 0} {allocation.item?.unit || ""}</Badge></div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{allocation.item?.name || "Article"} - {allocation.task?.title || "Sans tache"} - {formatDate(allocation.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === "inventories") {
    tabContent = (
      <div className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr]">
        <Card>
          <SectionTitle eyebrow="Comptage" title="Lancer un inventaire" description="Inventaire periodique, permanent ou tournant avec correction apres validation." />
          <form className="grid gap-4" onSubmit={submitInventory}>
            <fieldset disabled={readOnlyInventory} className="grid gap-4 disabled:cursor-not-allowed disabled:opacity-70">
              <div className="grid gap-3 md:grid-cols-3">
                <select className={controlClass} value={inventoryForm.location_id} onChange={(event) => updateInventory("location_id", event.target.value)} required>
                  <option value="">Depot a inventorier</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
                <select className={controlClass} value={inventoryForm.inventory_type} onChange={(event) => updateInventory("inventory_type", event.target.value)}>
                  {inventoryTypes.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                </select>
                <Input required type="date" value={inventoryForm.inventory_date} onChange={(event) => updateInventory("inventory_date", event.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Reference inventaire" value={inventoryForm.reference} onChange={(event) => updateInventory("reference", event.target.value)} />
                <label className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600"><input type="checkbox" checked={Boolean(inventoryForm.validate_now)} onChange={(event) => updateInventory("validate_now", event.target.checked)} />Valider et corriger tout de suite</label>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Lignes d'inventaire</h4>
                  <Button variant="outline" onClick={addInventoryLine}>Ajouter une ligne</Button>
                </div>
                {inventoryForm.lines.map((line, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="grid gap-3 md:grid-cols-[1.35fr_0.75fr_auto]">
                      <select className={controlClass} value={line.item_id} onChange={(event) => updateInventoryLine(index, "item_id", event.target.value)} required>
                        <option value="">Article</option>
                        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      <Input required type="number" placeholder="Quantite comptee" value={line.counted_quantity} onChange={(event) => updateInventoryLine(index, "counted_quantity", event.target.value)} />
                      <Button variant="outline" onClick={() => removeInventoryLine(index)}>Retirer</Button>
                    </div>
                    <Input placeholder="Observation" value={line.observation} onChange={(event) => updateInventoryLine(index, "observation", event.target.value)} />
                  </div>
                ))}
              </div>

              <Textarea rows={3} placeholder="Notes inventaire" value={inventoryForm.notes} onChange={(event) => updateInventory("notes", event.target.value)} />
              <Button type="submit" disabled={mutating || readOnlyInventory}>Creer l'inventaire</Button>
            </fieldset>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle eyebrow="Sessions" title="Inventaires recents" description="Ecart total, responsable, validation et correction du stock." action={<Badge variant="neutral">{inventories.data?.pagination?.total || inventoryRows.length}</Badge>} />
            {!inventoryRows.length && <EmptyState text="Aucun inventaire lance." />}
            <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
              {inventoryRows.map((inventory) => (
                <div key={inventory.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">#{inventory.id}</p><Badge variant={badgeTone(inventory.status)}>{humanize(inventory.status)}</Badge><Badge variant="info">{humanize(inventory.inventory_type)}</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{inventory.location?.name || "Depot"} - {formatDate(inventory.inventory_date)}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold text-slate-900">{inventory.discrepancy_total || 0}</p><p className="text-xs text-slate-600 dark:text-slate-300">ecart cumule</p></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {inventory.lines.slice(0, 3).map((line) => <div key={line.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{line.item?.name || "Article"} - systeme {line.system_quantity || 0} / compte {line.counted_quantity || 0}</div>)}
                  </div>
                  {inventory.status === "draft" && canManageInventory ? <div className="mt-3"><Button onClick={() => validateInventory(inventory.id)} disabled={mutating || readOnlyInventory}>Valider l'inventaire</Button></div> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Historique" title="Inventaires consolides" description="Comptage physique, comparaison systeme, validation puis correction de stock." />
            {!reportInventories.length && <EmptyState text="Pas encore d'historique d'inventaire consolide." />}
            <div className="space-y-3">
              {reportInventories.slice(0, 6).map((inventory) => (
                <div key={inventory.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{inventory.location?.name || "Depot"} - {formatDate(inventory.inventory_date)}</p><Badge variant={badgeTone(inventory.status)}>{humanize(inventory.status)}</Badge></div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{inventory.responsible_user?.full_name || "Responsable"} - ecart total {inventory.discrepancy_total || 0}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === "reports") {
    tabContent = (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Valeur globale" value={formatMoney(totalStockValue)} tone="text-emerald-700" />
          <MetricCard label="Articles catalogues" value={reports.data?.stock_state?.tracked_items || items.length} />
          <MetricCard label="Projets consommateurs" value={consumptionRows.length} tone="text-sky-700" />
          <MetricCard label="Pertes et anomalies" value={lossRows.length} tone="text-rose-700" />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <SectionTitle eyebrow="Valorisation" title="Par categorie" description="Repartition du stock entre materiaux, equipements et consommables." />
            {!categoryRows.length && <EmptyState text="Aucune synthese disponible." />}
            <div className="space-y-3">
              {categoryRows.map((row) => <div key={row.category} className="rounded-2xl border border-slate-200 px-4 py-4"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-slate-900">{humanize(row.category)}</p><p className="text-sm text-slate-600 dark:text-slate-300">{row.items || 0} article(s)</p></div><p className="font-semibold text-emerald-700">{formatMoney(row.stock_value)}</p></div></div>)}
            </div>
          </Card>

          <Card className="xl:col-span-2">
            <SectionTitle eyebrow="Valeur" title="Top valorisation stock" description="Les articles qui portent le plus de valeur et de rotation." />
            {!valuationRows.length && <EmptyState text="Aucune valorisation a afficher." />}
            <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
              {valuationRows.slice(0, 12).map((row) => (
                <div key={row.item_id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{row.name}</p><Badge variant="neutral">{row.sku}</Badge><Badge variant="info">{humanize(row.category)}</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Stock {row.on_hand_quantity || 0} - conso moyenne {row.average_monthly_consumption || 0}</p></div>
                    <p className="font-semibold text-emerald-700">{formatMoney(row.stock_value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <Card>
            <SectionTitle eyebrow="Projets" title="Consommation par chantier" description="Quantites sorties et couts imputes aux projets." />
            {!consumptionRows.length && <EmptyState text="Aucune consommation projet detectee." />}
            <div className="space-y-3">
              {consumptionRows.map((row) => <div key={row.project_id} className="rounded-2xl border border-slate-200 px-4 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{row.project_name}</p><p className="text-sm text-slate-600 dark:text-slate-300">{row.project_code}</p></div><div className="text-right"><p className="font-semibold text-slate-900">{row.total_quantity || 0}</p><p className="text-sm text-emerald-700">{formatMoney(row.total_cost)}</p></div></div></div>)}
            </div>
          </Card>
          <Card>
            <SectionTitle eyebrow="Pertes" title="Casse, vol et anomalies" description="Operations sensibles a suivre dans le cadre du controle interne." />
            {!lossRows.length && <EmptyState text="Aucune perte ou anomalie validee." />}
            <div className="space-y-3">
              {lossRows.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 px-4 py-4"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">#{row.id}</p><Badge variant={badgeTone(row.exit_type || row.status)}>{humanize(row.exit_type || row.status)}</Badge></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{row.project?.name || row.source_location?.name || "Sans projet"} - {formatDate(row.operation_date)}</p><p className="mt-2 text-sm text-slate-600">{row.lines.map((line) => `${line.item?.name || "Article"} (${line.quantity || 0})`).join(", ")}</p></div>)}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === "activity") {
    tabContent = (
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionTitle eyebrow="Journal" title="Activite du stock" description="Creation, validation, annulation et inventaires traces dans le journal d'audit." action={<Badge variant="neutral">{activity.data?.pagination?.total || activityRows.length}</Badge>} />
          {!activityRows.length && <EmptyState text="Aucune activite journalisee pour le moment." />}
          <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
            {activityRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2"><Badge variant="neutral">{humanize(row.action)}</Badge>{row.target_type && <Badge variant="info">{humanize(row.target_type)}</Badge>}</div>
                <p className="mt-2 font-medium text-slate-900">{row.description || humanize(row.action)}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(row.created_at)} - cible #{row.target_id || "-"}</p>
                {Object.keys(row.details || {}).length > 0 && <p className="mt-2 text-sm text-slate-600">{Object.entries(row.details).map(([key, value]) => `${humanize(key)}: ${value}`).join(" | ")}</p>}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <SectionTitle eyebrow="Entrees" title="Dernieres receptions" description="Suivi des bons de livraison, factures et articles recus." />
            {!latestEntries.length && <EmptyState text="Aucune reception recente." />}
            <div className="space-y-3">
              {latestEntries.map((entry) => <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">#{entry.id}</p><Badge variant={badgeTone(entry.status)}>{humanize(entry.status)}</Badge></div><p className="text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.operation_date)}</p></div><p className="mt-2 text-sm text-slate-600">{entry.supplier_name || entry.destination_location?.name || "Entree de stock"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.lines.map((line) => `${line.item?.name || "Article"} (${line.quantity || 0})`).join(", ")}</p></div>)}
            </div>
          </Card>
          <Card>
            <SectionTitle eyebrow="Sorties" title="Dernieres mises a disposition" description="Affectations chantier, consommation interne et incidents." />
            {!latestExits.length && <EmptyState text="Aucune sortie recente." />}
            <div className="space-y-3">
              {latestExits.map((entry) => <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">#{entry.id}</p><Badge variant={badgeTone(entry.exit_type || entry.status)}>{humanize(entry.exit_type || entry.status)}</Badge></div><p className="text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.operation_date)}</p></div><p className="mt-2 text-sm text-slate-600">{entry.project?.name || entry.source_location?.name || "Sortie de stock"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.lines.map((line) => `${line.item?.name || "Article"} (${line.quantity || 0})`).join(", ")}</p></div>)}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.35),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,#fff7ed_0%,#ffffff_52%,#eff6ff_100%)] p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]">
        <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-amber-100 text-amber-800">Module magasinier</Badge>
              <Badge variant="neutral">
                {isMagasinier ? "Vue terrain" : isComptable ? "Vue finance / stock" : "Pilotage stock"}
              </Badge>
              {readOnlyInventory ? <Badge variant="warning">Lecture seule</Badge> : null}
              <Badge variant="info">{items.length} articles</Badge>
              <Badge variant="neutral">{locations.length} depots</Badge>
              <Badge variant="warning">{summary.pending_validations || 0} validations</Badge>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Gestion des stocks et mouvements</h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">Pilotage des entrees, sorties, transferts, inventaires, consommations par projet et alertes de rupture.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Articles suivis" value={summary.tracked_items || 0} />
              <MetricCard label="Depots et sites" value={summary.locations || 0} />
              <MetricCard label="Articles critiques" value={summary.critical_items || 0} tone="text-rose-700" />
              <MetricCard label="Valorisation stock" value={formatMoney(summary.stock_value)} tone="text-emerald-700" />
            </div>
          </div>
          <Card className="border-slate-900 bg-slate-950 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Tour de controle</p>
                <h3 className="mt-2 text-lg font-semibold">Magasin principal, depots et chantiers</h3>
              </div>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={refreshAll} disabled={mutating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rafraichir
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-300">Achats suggeres</p><p className="mt-2 text-2xl font-semibold text-amber-200">{summary.suggested_purchases || 0}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"><p className="text-xs uppercase tracking-[0.16em] text-slate-300">Demandes en attente</p><p className="mt-2 text-2xl font-semibold text-sky-200">{pendingOperations.length}</p></div>
            </div>
          </Card>
        </div>
      </Card>

      {pageErrors.length > 0 && <Card className="border-rose-200 bg-rose-50 text-rose-700"><p className="text-sm">{pageErrors[0]}</p></Card>}
      {mutationError && <Card className="border-rose-200 bg-rose-50 text-rose-700"><p className="text-sm">{mutationError}</p></Card>}
      {readOnlyInventory && (
        <Card className="border-amber-200 bg-amber-50 text-amber-900">
          <p className="text-sm">
            Vous etes en consultation sur le stock. Les saisies et validations restent reservees aux profils avec
            <span className="font-semibold"> inventory.manage</span>.
          </p>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <SectionTitle eyebrow="A traiter" title="Validations en attente" description="Les operations sensibles restent ici tant qu'elles ne sont pas validees." action={<Badge variant="warning">{pendingOperations.length}</Badge>} />
          {!pendingOperations.length && <EmptyState text="Aucune demande en attente." />}
          <div className="space-y-3">
            {pendingOperations.map((operation) => (
              <div key={operation.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">#{operation.id}</p>
                  <Badge variant={badgeTone(operation.status)}>{humanize(operation.status)}</Badge>
                  <Badge variant="info">{humanize(operation.operation_kind)}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{operation.lines.map((line) => `${line.item?.name || "Article"} (${line.quantity || 0})`).join(", ")}</p>
                {canManageInventory ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => validateOperation(operation.id)} disabled={mutating || readOnlyInventory}>Valider</Button>
                    <Button variant="outline" onClick={() => cancelOperation(operation.id)} disabled={mutating || readOnlyInventory}>Annuler</Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle eyebrow="Alerte" title="Articles critiques et anomalies" description="Les priorites magasinier remontees automatiquement." action={<Badge variant={alerts.length ? "warning" : "success"}>{alerts.length}</Badge>} />
          {!alerts.length && !criticalItems.length && <EmptyState text="Aucune alerte critique pour le moment." />}
          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert, index) => (
              <div key={`${alert.type}-${index}`} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={alert.severity === "high" ? "danger" : "warning"}>{humanize(alert.severity)}</Badge>
                  <p className="font-medium text-slate-900">{alert.message}</p>
                </div>
              </div>
            ))}
            {!alerts.length && criticalItems.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4"><Badge variant={badgeTone(item.alert_level)}>{humanize(item.alert_level)}</Badge><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.name}</p></div>)}
          </div>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <SectionTitle eyebrow="Mobile" title="Actions rapides terrain" description="Acces tactile pour scan, sortie chantier et inventaire express." />
        <div className="grid gap-3 md:grid-cols-3">
          <Button className="justify-start px-4 py-4" onClick={startScanner}>Scanner un article</Button>
          <Button className="justify-start px-4 py-4" variant="outline" onClick={() => setActiveTab("operations")} disabled={readOnlyInventory}>Sortie chantier</Button>
          <Button className="justify-start px-4 py-4" variant="outline" onClick={() => setActiveTab("inventories")} disabled={readOnlyInventory}>Inventaire express</Button>
        </div>
      </Card>

      <Card className={isOnline ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
        <SectionTitle eyebrow="Offline chantier" title={isOnline ? "Connexion disponible" : "Mode hors ligne actif"} description={isOnline ? "La file locale se synchronise automatiquement des que le reseau est stable." : "Les scans, sorties et inventaires sont conserves localement puis rejoues a la reconnexion."} action={<Badge variant={isOnline ? "success" : "warning"}>{offlineQueue.length} en attente</Badge>} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => syncOfflineQueue()} disabled={readOnlyInventory || !isOnline || queueSyncing || !offlineQueue.length}>Synchroniser maintenant</Button>
          <Button variant="outline" onClick={() => setOfflineQueue(loadInventoryOfflineQueue())}>Rafraichir la file</Button>
        </div>
        <div className="mt-4 space-y-2">
          {!offlineQueue.length && <p className="text-sm text-slate-600">Aucune action en attente dans la file locale.</p>}
          {offlineQueue.slice(0, 6).map((action) => (
            <div key={action.id} className="rounded-xl border border-white/60 bg-white/70 px-3 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{buildOfflineActionSummary(action)}</p>
                  <Badge variant="neutral">{humanize(action.kind)}</Badge>
                  {action.blocked_at && <Badge variant="danger">Bloquee</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {action.blocked_at && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateInventoryOfflineAction(action.id, { blocked_at: null, last_error: null });
                        setOfflineQueue(loadInventoryOfflineQueue());
                        void syncOfflineQueue();
                      }}
                    >
                      Reessayer
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      removeInventoryOfflineAction(action.id);
                      setOfflineQueue(loadInventoryOfflineQueue());
                    }}
                  >
                    Retirer
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatDate(action.created_at)} - retries {action.retry_count || 0}</p>
              {action.last_error && <p className="mt-1 text-xs text-rose-600">{action.last_error}</p>}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {[["catalog", "Catalogue"], ["operations", "Operations"], ["inventories", "Inventaires"], ["reports", "Rapports"], ["activity", "Journal"]].map(([key, label]) => (
          <Button key={key} variant={activeTab === key ? "primary" : "outline"} onClick={() => setActiveTab(key)}>
            {label}
          </Button>
        ))}
      </div>

      {tabContent}
    </section>
  );
}


