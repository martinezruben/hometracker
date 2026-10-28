import { z } from "zod";

export const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max).nullish();

export const listCreate = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(160),
  type: z.enum(["shopping", "sale", "general"]).default("general"),
});
export const listUpdate = z.object({ name: z.string().trim().min(1).max(160) }).partial();

export const itemCreate = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  quantity: text(40),
  price: z.number().min(0).max(99_999_999).nullish(),
  notes: text(5000),
});
export const itemUpdate = itemCreate
  .omit({ id: true })
  .partial()
  .extend({
    checked: z.boolean().optional(),
    status: z.enum(["pending", "done", "available", "sold"]).optional(),
  });
