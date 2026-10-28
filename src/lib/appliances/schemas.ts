import { z } from "zod";
import { parseDateOnly } from "@/lib/maintenance/schedule";

export const uuid = z.string().uuid();
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(parseDateOnly(s).getTime()))
  .transform(parseDateOnly);
const text = (max: number) => z.string().trim().max(max).nullish();

export const applianceCreate = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(160),
  brand: text(120),
  model: text(120),
  serial: text(120),
  location: text(160),
  purchaseDate: dateOnly.nullish(),
  warrantyUntil: dateOnly.nullish(),
  notes: text(5000),
});
export const applianceUpdate = applianceCreate.omit({ id: true }).partial();

export const planCreate = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  intervalValue: z.number().int().min(1).max(999),
  intervalUnit: z.enum(["day", "week", "month", "year"]),
  nextDue: dateOnly,
  remindDaysBefore: z.number().int().min(0).max(365).default(7),
  notes: text(5000),
});
export const planUpdate = planCreate.omit({ id: true }).partial().extend({ active: z.boolean().optional() });

export const planComplete = z.object({
  id: uuid, // id del registro: hace idempotente el reintento offline
  doneAt: dateOnly.optional(),
  cost: z.number().min(0).max(99_999_999).nullish(),
  providerId: uuid.nullish(),
  notes: text(5000),
});
