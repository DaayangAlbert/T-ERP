/**
 * Service de création d'un document GED.
 *
 * Orchestre la transaction complète :
 *   1. Crée le `Document` (avec spaceId, classificationId, internalReference)
 *   2. Crée le `DocumentRetentionRecord` (calcule duaEndDate selon DUA)
 *   3. Si la classification exige un workflow → instancie
 *      `DocumentWorkflowInstance` + ses `DocumentWorkflowStep`
 *   4. Émet un `GedAuditEvent action=IMPORT` (traçabilité)
 *
 * Toutes les opérations sont dans une seule transaction Prisma.
 */
import { prisma } from "@/lib/prisma";
import {
  Confidentiality,
  DocStatus,
  GedAuditAction,
  WorkflowStatus,
  StepStatus,
  type Role,
} from "@prisma/client";
import {
  autoClassify,
  computeDuaEndDate,
  nextInternalReference,
  type AutoClassifyHint,
  type AutoClassifyResult,
} from "@/lib/ged/auto-classify";

export interface CreateDocumentInput {
  tenantId: string;
  authorId: string;
  filename: string;
  displayName?: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  siteId?: string | null;
  /** Si fourni, force le préfixe de classification. */
  classificationPrefix?: string;
  /** Si fourni, force l'espace cible. */
  spaceId?: string;
  /** Sinon hérité de la classification (par défaut INTERNAL). */
  confidentiality?: Confidentiality;
  /** Marque le document comme déjà publié (sinon DRAFT). */
  publish?: boolean;
  /** Notes optionnelles pour l'audit log. */
  importNotes?: string;
}

interface WorkflowStepDef {
  stepIndex: number;
  name: string;
  role: string;
  mandatory?: boolean;
  slaHours?: number;
}

export interface CreateDocumentResult {
  id: string;
  internalReference: string | null;
  classification: AutoClassifyResult;
  retentionRecordId: string;
  workflowInstanceId: string | null;
  duaEndDate: string;
}

async function instantiateWorkflow(
  tx: any,
  documentId: string,
  templateId: string,
  templateSteps: WorkflowStepDef[],
  initiatorId: string,
  tenantId: string,
): Promise<string> {
  if (templateSteps.length === 0) {
    throw new Error("Le template de workflow n'a aucune étape définie");
  }

  // Construire la référence unique WF-AAAA-NNNN
  const year = new Date().getFullYear();
  const pattern = `WF-${year}-`;
  const lastWf = await tx.documentWorkflowInstance.findFirst({
    where: { reference: { startsWith: pattern } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  const lastNum = lastWf
    ? Number(lastWf.reference.replace(pattern, "")) || 0
    : 0;
  const reference = `${pattern}${String(lastNum + 1).padStart(4, "0")}`;

  // SLA total = somme des slaHours des étapes (défaut 48h/étape)
  const totalSlaHours = templateSteps.reduce(
    (sum, s) => sum + (s.slaHours ?? 48),
    0,
  );
  const dueAt = new Date(Date.now() + totalSlaHours * 3600 * 1000);

  // Résoudre l'assigné de chaque étape : 1er utilisateur du rôle dans le tenant
  // (fallback : l'initiateur si aucun utilisateur ne correspond).
  const stepData: Array<{
    stepIndex: number;
    stepName: string;
    assignedToId: string;
    status: StepStatus;
  }> = [];
  for (const s of templateSteps) {
    const assignee = await tx.user.findFirst({
      where: { tenantId, role: s.role as Role, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    stepData.push({
      stepIndex: s.stepIndex,
      stepName: s.name,
      assignedToId: assignee?.id ?? initiatorId,
      status: StepStatus.PENDING,
    });
  }

  const instance = await tx.documentWorkflowInstance.create({
    data: {
      reference,
      templateId,
      documentId,
      status: WorkflowStatus.IN_PROGRESS,
      currentStep: 0,
      initiatorId,
      dueAt,
      steps: { create: stepData },
    },
    select: { id: true },
  });
  return instance.id;
}

export async function createGedDocument(
  input: CreateDocumentInput,
): Promise<CreateDocumentResult> {
  const hint: AutoClassifyHint = {
    explicitPrefix: input.classificationPrefix,
    explicitSpaceId: input.spaceId,
    siteId: input.siteId ?? undefined,
  };
  const classification = await autoClassify(
    input.tenantId,
    input.displayName ?? input.filename,
    hint,
  );

  // Référence interne (seulement si on a une classification)
  let internalReference: string | null = null;
  if (classification.classification) {
    internalReference = await nextInternalReference(
      input.tenantId,
      classification.classification.prefix,
    );
  }

  // Confidentialité : si non spécifiée, hérite de la classification (sinon INTERNAL)
  const confidentiality =
    input.confidentiality ??
    classification.classification?.confidentiality ??
    Confidentiality.INTERNAL;

  const now = new Date();
  const duaEndDate = await computeDuaEndDate(
    now,
    classification.classification?.duaYears ?? null,
    classification.classification?.duaTrigger ?? "CREATION_DATE",
    input.siteId ?? null,
  );

  const result = await prisma.$transaction(async (tx) => {
    // 1) Créer le document
    const doc = await tx.document.create({
      data: {
        tenantId: input.tenantId,
        authorId: input.authorId,
        name: input.displayName ?? input.filename,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        url: input.url,
        siteId: input.siteId ?? null,
        spaceId: classification.spaceId,
        classificationId: classification.classificationId,
        internalReference,
        confidentiality,
        status: input.publish ? DocStatus.PUBLISHED : DocStatus.DRAFT,
      },
      select: { id: true },
    });

    // 2) Retention record
    const retention = await tx.documentRetentionRecord.create({
      data: {
        documentId: doc.id,
        duaEndDate,
        archivalStatus: "ACTIVE",
        legalHold: false,
      },
      select: { id: true },
    });

    // 3) Workflow (si requis par la classification)
    let workflowInstanceId: string | null = null;
    if (classification.classification?.workflowId) {
      const template = await tx.documentWorkflowTemplate.findFirst({
        where: {
          id: classification.classification.workflowId,
          active: true,
        },
        select: { id: true, steps: true },
      });
      if (template) {
        const tplSteps = (template.steps as unknown as WorkflowStepDef[]) ?? [];
        if (tplSteps.length > 0) {
          workflowInstanceId = await instantiateWorkflow(
            tx,
            doc.id,
            template.id,
            tplSteps,
            input.authorId,
            input.tenantId,
          );
        }
      }
    }

    // 4) Audit event IMPORT
    await tx.gedAuditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.authorId,
        action: GedAuditAction.IMPORT,
        documentId: doc.id,
        spaceId: classification.spaceId,
        metadata: {
          filename: input.filename,
          sizeBytes: input.sizeBytes,
          mimeType: input.mimeType,
          internalReference,
          detectedPrefix: classification.detectedPrefix,
          classifReason: classification.reason,
          workflowInstantiated: Boolean(workflowInstanceId),
          notes: input.importNotes ?? null,
        },
      },
    });

    return { docId: doc.id, retentionId: retention.id, workflowInstanceId };
  });

  return {
    id: result.docId,
    internalReference,
    classification,
    retentionRecordId: result.retentionId,
    workflowInstanceId: result.workflowInstanceId,
    duaEndDate: duaEndDate.toISOString(),
  };
}
