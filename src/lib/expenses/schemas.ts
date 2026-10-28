import { z } from "zod";
import { parseDateOnly } from "@/lib/maintenance/schedule";

export const uuid = z.string().uuid();
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(parseDateOnly(s).getTime()))
  .transform(parseDateOnly);
const text = (max: number) => z.string().trim().max(max).nullish();

export const expenseCreate = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(99_999_999),
  spentAt: dateOnly,
  category: text(80),
  providerId: uuid.nullish(),
  notes: text(5000),
});
export const expenseUpdate = expenseCreate.omit({ id: true }).partial();

export const EXPENSE_CATEGORIES = ["Servicios", "Mantenimiento", "Reparaciones", "Compras", "Impuestos", "Seguros", "Otros"];
