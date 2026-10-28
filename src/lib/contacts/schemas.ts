import { z } from "zod";

export const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max).nullish();

export const contactCreate = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(160),
  category: text(80),
  phone: text(40),
  email: z.union([z.string().trim().email().max(255), z.literal(""), z.null()]).optional(),
  rating: z.number().int().min(1).max(5).nullish(),
  notes: text(5000),
});
export const contactUpdate = contactCreate.omit({ id: true }).partial();

/** Deja solo dígitos y el "+" inicial: sirve para enlaces tel: y wa.me. */
export const cleanPhone = (phone: string) => {
  const plus = phone.trim().startsWith("+") ? "+" : "";
  return plus + phone.replace(/\D/g, "");
};
