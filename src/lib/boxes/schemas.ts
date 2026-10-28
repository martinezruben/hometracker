import { z } from "zod";

export const uuid = z.string().uuid();

export const BOX_COLORS = ["blue", "orange", "green", "purple"] as const;

export const boxCreate = z.object({
  id: uuid.optional(),
  color: z.enum(BOX_COLORS).optional(),
  name: z.string().trim().min(1).max(160),
  location: z.string().trim().max(160).nullish(),
  notes: z.string().trim().max(5000).nullish(),
});

export const boxUpdate = boxCreate.omit({ id: true }).partial();

export const itemCreate = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(9999).default(1),
  category: z.string().trim().max(80).nullish(),
  notes: z.string().trim().max(5000).nullish(),
});

export const itemUpdate = itemCreate.omit({ id: true }).partial();
