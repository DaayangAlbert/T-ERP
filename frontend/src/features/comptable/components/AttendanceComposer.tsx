import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { comptableTheme } from "@/features/comptable/theme";
import type { AttendanceDraftInput, WorkerProfile } from "@/features/comptable/types";

interface AttendanceComposerProps {
  workers: WorkerProfile[];
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
  onSubmit: (draft: AttendanceDraftInput) => { ok: boolean; error?: string };
}

export function AttendanceComposer({ workers, projects, defaultProjectId, onSubmit }: AttendanceComposerProps) {
  const [form, setForm] = useState({
    employeeId: workers[0]?.id || "",
    projectId: defaultProjectId || projects[0]?.id || "",
    date: new Date().toISOString().slice(0, 10),
    arrivalTime: "07:30",
    departureTime: "17:15",
    status: "present",
    notes: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      projectId: defaultProjectId || current.projectId || projects[0]?.id || "",
      employeeId: workers[0]?.id || current.employeeId || "",
    }));
  }, [defaultProjectId, projects, workers]);

  const filteredWorkers = workers.filter((worker) => worker.projectId === form.projectId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = onSubmit({
      employeeId: form.employeeId,
      projectId: form.projectId,
      date: form.date,
      arrivalTime: form.status === "absent" ? undefined : form.arrivalTime,
      departureTime: form.status === "absent" ? undefined : form.departureTime,
      status: form.status === "absent" ? "absent" : undefined,
      notes: form.notes,
    });

    if (!result.ok) {
      setError(result.error || "Impossible d'enregistrer la presence.");
      return;
    }

    setError("");
    setForm((current) => ({
      ...current,
      employeeId: filteredWorkers[0]?.id || "",
      arrivalTime: "07:30",
      departureTime: "17:15",
      status: "present",
      notes: "",
    }));
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1">
        <h4 className={`text-base font-semibold ${comptableTheme.primaryText}`}>Saisie des presences</h4>
        <p className={`text-sm ${comptableTheme.secondaryText}`}>
          Le directeur de projet est exclu automatiquement du suivi de presence.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select
          className={comptableTheme.select}
          value={form.projectId}
          onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value, employeeId: "" }))}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          className={comptableTheme.select}
          value={form.employeeId}
          onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
          required
        >
          <option value="">Employe</option>
          {filteredWorkers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.displayName} - {worker.roleLabel}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        <select
          className={comptableTheme.select}
          value={form.status}
          onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
        <Input
          type="time"
          value={form.arrivalTime}
          onChange={(event) => setForm((current) => ({ ...current, arrivalTime: event.target.value }))}
          disabled={form.status === "absent"}
        />
        <Input
          type="time"
          value={form.departureTime}
          onChange={(event) => setForm((current) => ({ ...current, departureTime: event.target.value }))}
          disabled={form.status === "absent"}
        />
      </div>
      <Textarea rows={2} placeholder="Observation" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      <Button type="submit">Enregistrer la presence</Button>
    </form>
  );
}
