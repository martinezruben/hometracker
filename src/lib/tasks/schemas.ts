import { z } from "zod";
import { parseDateOnly } from "@/lib/maintenance/schedule";

export const uuid = z.string().uuid();
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(parseDateOnly(s).getTime()))
  .transform(parseDateOnly);

/** "3:week" = cada 3 semanas. */
export const repeatRule = z.string().regex(/^[1-9]\d{0,2}:(day|week|month|year)$/);

export const taskCreate = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).nullish(),
  dueAt: dateOnly.nullish(),
  repeatRule: repeatRule.nullish(),
  assignedTo: uuid.nullish(),
});
export const taskUpdate = taskCreate.omit({ id: true }).partial().extend({ reopen: z.boolean().optional() });

/** `dueAt` es el vencimiento que la persona vio al completar: hace idempotente el reintento. */
export const taskComplete = z.object({ dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish() });
