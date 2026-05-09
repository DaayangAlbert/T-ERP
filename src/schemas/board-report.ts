import { z } from "zod";
import { BoardReportType } from "@prisma/client";

export const createBoardReportSchema = z.object({
  type: z.nativeEnum(BoardReportType),
  period: z.string().min(4).max(20),
  boardDate: z.coerce.date(),
  chapters: z.record(z.string(), z.boolean()),
  comments: z.record(z.string(), z.string()).optional().default({}),
});
export type CreateBoardReportInput = z.infer<typeof createBoardReportSchema>;

export const sendBoardReportSchema = z.object({
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(120),
      })
    )
    .min(1)
    .max(20),
  message: z.string().max(2000).optional().default(""),
});
export type SendBoardReportInput = z.infer<typeof sendBoardReportSchema>;
