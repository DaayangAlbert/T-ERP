import { CheckCircle2, FileClock, SendHorizonal, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/features/magasinier/components/KpiCard";
import { MagasinierSection } from "@/features/magasinier/components/MagasinierSection";
import { SignalementComposer } from "@/features/magasinier/components/SignalementComposer";
import type { MagasinierWorkspaceModel } from "@/features/magasinier/hooks/useMagasinierWorkspace";
import { formatDateTime } from "@/features/magasinier/utils/format";

interface ReportsPageProps {
  workspace: MagasinierWorkspaceModel;
}

export function ReportsPage({ workspace }: ReportsPageProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FileClock}
          label="Brouillons"
          value={String(workspace.workspace.signalements.filter((item) => item.status === "draft").length)}
          helper="Signalements non encore envoyes"
          tone="neutral"
        />
        <KpiCard
          icon={SendHorizonal}
          label="Envoyes"
          value={String(workspace.workspace.signalements.filter((item) => item.status === "sent").length)}
          helper="En attente d'accuse"
          tone="warning"
        />
        <KpiCard
          icon={ShieldAlert}
          label="En traitement"
          value={String(workspace.workspace.signalements.filter((item) => item.status === "in_progress").length)}
          helper="Suivi par la hierarchie"
          tone="info"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Resolus"
          value={String(workspace.workspace.signalements.filter((item) => item.status === "resolved").length)}
          helper="Incidents clotures"
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Nouveau signalement"
            title="Remonter un etat de stock"
            description="Choisissez le projet, le type d'incident, la priorite et ajoutez vos pieces jointes."
          />
          <SignalementComposer
            projects={workspace.workspace.projects}
            selectedProjectId={workspace.workspace.selectedProjectId}
            onSaveDraft={(draft) => workspace.actions.createSignalement(draft, "draft")}
            onSend={(draft) => workspace.actions.createSignalement(draft, "sent")}
          />
        </Card>

        <Card className="space-y-4">
          <MagasinierSection
            eyebrow="Demandes liees au stock"
            title="Suivi des besoins terrain"
            description="Demandes de sortie, approvisionnement et priorites a traiter."
            action={<Badge variant="warning">{workspace.workspace.requests.length}</Badge>}
          />
          <div className="space-y-3">
            {workspace.workspace.requests.map((request) => (
              <div
                key={request.id}
                className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-50">{request.title}</p>
                  <Badge variant={request.priority === "urgent" ? "danger" : request.priority === "high" ? "warning" : "neutral"}>
                    {request.priority}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {request.itemName} · {request.quantity}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Besoin pour le {formatDateTime(request.neededBy)} · {request.requesterName}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <MagasinierSection
          eyebrow="Historique"
          title="Signalements recents"
          description="Statuts previsibles : brouillon, envoye, recu, en traitement, resolu et rejete."
        />
        <div className="space-y-3">
          {workspace.workspace.signalements.map((report) => (
            <div
              key={report.id}
              className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{report.title}</p>
                    <Badge variant="info">{report.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{report.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={report.priority === "urgent" ? "danger" : report.priority === "high" ? "warning" : "neutral"}>
                    {report.priority}
                  </Badge>
                  <Badge variant="info">{report.status}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => workspace.actions.updateSignalementStatus(report.id, "received")}>
                  Marquer recu
                </Button>
                <Button variant="outline" onClick={() => workspace.actions.updateSignalementStatus(report.id, "in_progress")}>
                  Passer en traitement
                </Button>
                <Button variant="outline" onClick={() => workspace.actions.updateSignalementStatus(report.id, "resolved")}>
                  Marquer resolu
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
