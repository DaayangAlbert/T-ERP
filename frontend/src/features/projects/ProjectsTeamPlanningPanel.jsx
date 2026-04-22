import { useState } from "react";
import { Pencil, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectActionDialog } from "@/features/projects/ProjectActionDialog";

function submitAndClose(handler, close) {
  return async (event) => {
    await handler(event);
    close();
  };
}

function AssignmentEditDialog({ item, t, saving, onSave }) {
  const [projectRole, setProjectRole] = useState(item.project_role || "chef_projet");
  const [assignmentMode, setAssignmentMode] = useState(item.assignment_mode || "immediate");
  const [startDate, setStartDate] = useState(item.start_date || "");
  const [endDate, setEndDate] = useState(item.end_date || "");
  const [isActive, setIsActive] = useState(Boolean(item.is_active));

  return (
    <ProjectActionDialog
      triggerLabel="Modifier l'affectation"
      title="Modifier l'affectation"
      description="Mettez a jour le role, les dates ou le statut de cette affectation."
      closeLabel={t("common.close")}
      triggerClassName="h-8 w-8 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
      triggerContent={<Pencil className="h-4 w-4" />}
    >
      {({ close }) => (
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSave(item.id, {
              project_role: projectRole,
              assignment_mode: assignmentMode,
              start_date: startDate || null,
              end_date: endDate || null,
              is_active: isActive,
            });
            close();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={projectRole} onChange={(event) => setProjectRole(event.target.value)} placeholder={t("pages.projects.projectRole")} />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={assignmentMode}
              onChange={(event) => setAssignmentMode(event.target.value)}
            >
              <option value="immediate">{t("enums.assignmentMode.immediate")}</option>
              <option value="deferred">{t("enums.assignmentMode.deferred")}</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Affectation active
          </label>
          <Button type="submit" disabled={saving}>Enregistrer</Button>
        </form>
      )}
    </ProjectActionDialog>
  );
}

export function ProjectsTeamPlanningPanel({
  t,
  assignmentItems,
  taskItems,
  orderedTaskItems,
  collaboratorOptions,
  assignmentForm,
  taskForm,
  saving,
  createAssignment,
  createTask,
  updateAssignment,
  updateTask,
  changeTaskStatus,
  updateProjectAssignment,
  blockProjectAssignment,
  renderSectionHeader,
  getCollaboratorLabel,
  taskTypes,
  taskStatuses,
  priorities,
  ganttNode,
  sectionMode = "both",
}) {
  const showTeam = sectionMode === "both" || sectionMode === "team";
  const showPlanning = sectionMode === "both" || sectionMode === "planning";
  const orderedAssignments = [...assignmentItems].sort((left, right) => {
    if (Boolean(left?.is_active) !== Boolean(right?.is_active)) {
      return left?.is_active ? -1 : 1;
    }

    const leftName = String(left?.user?.full_name || `#${left?.user_id || ""}`);
    const rightName = String(right?.user?.full_name || `#${right?.user_id || ""}`);
    return leftName.localeCompare(rightName, "fr", { sensitivity: "base" });
  });

  return (
    <>
      {showTeam && (
      <Card className="space-y-4">
        {renderSectionHeader({
          eyebrow: t("pages.projects.teamEyebrow"),
          title: t("pages.projects.teamSection"),
          description: t("pages.projects.teamSectionHint"),
          meta: (
            <>
              <Badge variant="info">{assignmentItems.length}</Badge>
              <ProjectActionDialog
                triggerLabel={t("pages.projects.addAssignment")}
                title={t("pages.projects.addAssignment")}
                description={t("pages.projects.teamSectionHint")}
                closeLabel={t("common.close")}
              >
                {({ close }) => (
                  <form className="grid gap-3" onSubmit={submitAndClose(createAssignment, close)}>
                    <div className="grid gap-3 md:grid-cols-2">
                      {collaboratorOptions.length ? (
                        <select
                          aria-label="project-assignment-user"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={assignmentForm.user_id}
                          onChange={(e) => updateAssignment("user_id", e.target.value)}
                        >
                          <option value="">{t("pages.projects.selectCollaborator")}</option>
                          {collaboratorOptions.map((item) => (
                            <option key={`assignment-user-${item.id}`} value={item.id}>
                              {getCollaboratorLabel(item)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input placeholder={t("pages.projects.userId")} value={assignmentForm.user_id} onChange={(e) => updateAssignment("user_id", e.target.value)} />
                      )}
                      <Input placeholder={t("pages.projects.projectRole")} value={assignmentForm.project_role} onChange={(e) => updateAssignment("project_role", e.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assignmentForm.assignment_mode} onChange={(e) => updateAssignment("assignment_mode", e.target.value)}>
                        <option value="immediate">{t("enums.assignmentMode.immediate")}</option>
                        <option value="deferred">{t("enums.assignmentMode.deferred")}</option>
                      </select>
                      <Input type="date" value={assignmentForm.start_date} onChange={(e) => updateAssignment("start_date", e.target.value)} />
                      <Input type="date" value={assignmentForm.end_date} onChange={(e) => updateAssignment("end_date", e.target.value)} />
                    </div>
                    <Button type="submit" disabled={saving}>{t("pages.projects.addAssignment")}</Button>
                  </form>
                )}
              </ProjectActionDialog>
            </>
          ),
        })}
        {orderedAssignments.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[linear-gradient(90deg,rgba(14,165,233,0.12),rgba(59,130,246,0.08))] text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">{t("pages.projects.assignedUser")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t("pages.projects.projectRole")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t("pages.projects.startDate")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t("pages.projects.endDate")}</th>
                    <th className="px-4 py-3 whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 whitespace-nowrap">Contact</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orderedAssignments.map((item) => (
                    <tr key={item.id} className="bg-white transition-colors hover:bg-sky-50/60">
                      <td className="px-4 py-3 text-slate-800">
                        <p className="font-semibold text-slate-900">{item.user?.full_name || `#${item.user_id}`}</p>
                        {item.user?.job_title ? <p className="text-xs text-slate-500">{item.user.job_title}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{item.project_role || "--"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.start_date || "--"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{item.end_date || "--"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={item.is_active ? "success" : "neutral"}>{item.is_active ? "Actif" : "Bloque"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="line-clamp-1 max-w-[220px]">{item.user?.email || "--"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <AssignmentEditDialog item={item} t={t} saving={saving} onSave={updateProjectAssignment} />
                          <button
                            type="button"
                            disabled={saving || !item.is_active}
                            onClick={() => blockProjectAssignment(item.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Bloquer"
                            title="Bloquer"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">{t("common.noData")}</p>
        )}
      </Card>
      )}

      {showPlanning && (
      <Card className="space-y-4">
        {renderSectionHeader({
          eyebrow: t("pages.projects.planningEyebrow"),
          title: t("pages.projects.planningSection"),
          description: t("pages.projects.planningSectionHint"),
          meta: (
            <>
              <Badge variant="info">{taskItems.length}</Badge>
              <ProjectActionDialog
                triggerLabel={t("pages.projects.addTask")}
                title={t("pages.projects.addTask")}
                description={t("pages.projects.planningSectionHint")}
                closeLabel={t("common.close")}
              >
                {({ close }) => (
                  <form className="grid gap-3" onSubmit={submitAndClose(createTask, close)}>
                    <div className="grid gap-3 md:grid-cols-3">
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.parent_task_id} onChange={(e) => updateTask("parent_task_id", e.target.value)}>
                        <option value="">{t("pages.projects.rootTask")}</option>
                        {orderedTaskItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {`${"  ".repeat(item.depth)}${item.title}`}
                          </option>
                        ))}
                      </select>
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.task_type} onChange={(e) => updateTask("task_type", e.target.value)}>
                        {taskTypes.map((value) => <option key={value} value={value}>{t(`enums.projectTaskType.${value}`)}</option>)}
                      </select>
                      <Input placeholder={t("pages.projects.taskName")} value={taskForm.title} onChange={(e) => updateTask("title", e.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-5">
                      {collaboratorOptions.length ? (
                        <select
                          aria-label="project-task-assignee"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={taskForm.assigned_to_user_id}
                          onChange={(e) => updateTask("assigned_to_user_id", e.target.value)}
                        >
                          <option value="">{t("pages.projects.assignedUser")}</option>
                          {collaboratorOptions.map((item) => (
                            <option key={`task-assignee-${item.id}`} value={item.id}>
                              {getCollaboratorLabel(item)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder={t("pages.projects.assignedUser")}
                          value={taskForm.assigned_to_user_id}
                          onChange={(e) => updateTask("assigned_to_user_id", e.target.value)}
                        />
                      )}
                      {collaboratorOptions.length ? (
                        <select
                          aria-label="project-task-owner"
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={taskForm.responsible_user_id}
                          onChange={(e) => updateTask("responsible_user_id", e.target.value)}
                        >
                          <option value="">{t("pages.projects.responsibleUser")}</option>
                          {collaboratorOptions.map((item) => (
                            <option key={`task-owner-${item.id}`} value={item.id}>
                              {getCollaboratorLabel(item)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder={t("pages.projects.responsibleUser")}
                          value={taskForm.responsible_user_id}
                          onChange={(e) => updateTask("responsible_user_id", e.target.value)}
                        />
                      )}
                      <Input aria-label="project-task-start-date" type="date" value={taskForm.start_date} onChange={(e) => updateTask("start_date", e.target.value)} />
                      <Input aria-label="project-task-end-date" type="date" value={taskForm.end_date} onChange={(e) => updateTask("end_date", e.target.value)} />
                      <Input aria-label="project-task-progress" type="number" min="0" max="100" value={taskForm.progress_percent} onChange={(e) => updateTask("progress_percent", e.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.priority} onChange={(e) => updateTask("priority", e.target.value)}>
                        {priorities.map((value) => <option key={value} value={value}>{t(`enums.taskPriority.${value}`)}</option>)}
                      </select>
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={taskForm.status} onChange={(e) => updateTask("status", e.target.value)}>
                        {taskStatuses.map((value) => <option key={value} value={value}>{t(`enums.projectTaskStatus.${value}`)}</option>)}
                      </select>
                      <Button type="submit" disabled={saving}>{t("pages.projects.addTask")}</Button>
                    </div>
                    <Textarea rows={2} placeholder={t("pages.projects.description")} value={taskForm.description} onChange={(e) => updateTask("description", e.target.value)} />
                  </form>
                )}
              </ProjectActionDialog>
            </>
          ),
        })}

        {ganttNode}

        <div className="space-y-2">
          {orderedTaskItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div style={{ paddingLeft: `${item.depth * 16}px` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.depth > 0 && <span className="h-2 w-2 rounded-full bg-slate-300" />}
                    <p className="font-medium text-slate-900">{item.title}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">{t(`enums.projectTaskType.${item.task_type}`)}</p>
                </div>
                <select className="rounded-md border border-slate-300 px-2 py-1 text-xs" value={item.status === "done" ? "completed" : item.status} onChange={(e) => changeTaskStatus(item.id, e.target.value)}>
                  {taskStatuses.map((value) => <option key={value} value={value}>{t(`enums.projectTaskStatus.${value}`)}</option>)}
                </select>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {t("pages.projects.assignedUser")}: {item.assigned_user?.full_name || t("pages.projects.notAssigned")}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("pages.projects.responsibleUser")}: {item.responsible_user?.full_name || t("pages.projects.notAssigned")}
              </p>
              <p className="mt-2 text-sm text-slate-600">{item.start_date || "-"}{" -> "}{item.end_date || item.due_date || "-"}</p>
            </div>
          ))}
        </div>
      </Card>
      )}
    </>
  );
}
