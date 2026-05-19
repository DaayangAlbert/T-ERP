import { z } from "zod";

export const PLANNING_MEMBER_ROLE = ["MEMBER", "DEPUTY"] as const;
export const PLANNING_TASK_STATUS = ["PLANNED", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELLED"] as const;
export const PLANNING_TASK_PRIORITY = ["LOW", "NORMAL", "HIGH"] as const;

export const TASK_STATUS_LABEL: Record<(typeof PLANNING_TASK_STATUS)[number], string> = {
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
  BLOCKED: "Bloquée",
  CANCELLED: "Annulée",
};

export const TASK_PRIORITY_LABEL: Record<(typeof PLANNING_TASK_PRIORITY)[number], string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute",
};

export const MEMBER_ROLE_LABEL: Record<(typeof PLANNING_MEMBER_ROLE)[number], string> = {
  MEMBER: "Membre",
  DEPUTY: "Adjoint",
};

// ---- Teams ----
export const createTeamSchema = z.object({
  siteId: z.string().min(1, "Chantier requis"),
  name: z.string().min(2).max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional().nullable(),
  leaderId: z.string().min(1, "Chef d'équipe requis"),
  memberIds: z.array(z.string()).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional().nullable(),
  leaderId: z.string().optional(),
  active: z.boolean().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(PLANNING_MEMBER_ROLE).optional(),
});

// ---- Tasks ----
export const createTaskSchema = z.object({
  siteId: z.string().min(1, "Chantier requis"),
  teamId: z.string().optional().nullable(),
  title: z.string().min(2).max(160),
  description: z.string().max(4000).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  scheduledDate: z.string().min(1, "Date requise"),
  plannedStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  plannedEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  priority: z.enum(PLANNING_TASK_PRIORITY).optional(),
  assigneeUserIds: z.array(z.string()).optional(),
});

export const updateTaskSchema = z.object({
  teamId: z.string().optional().nullable(),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(4000).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  scheduledDate: z.string().optional(),
  plannedStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  plannedEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  status: z.enum(PLANNING_TASK_STATUS).optional(),
  priority: z.enum(PLANNING_TASK_PRIORITY).optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
  assigneeUserIds: z.array(z.string()).optional(),
  blockedReason: z.string().max(2000).optional().nullable(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
