import { z } from "zod";
import { parseDateOnly } from "@/lib/maintenance/schedule";

export const uuid = z.string().uuid();
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(parseDateOnly(s).getTime()))
  .transform(parseDateOnly);
const text = (max: number) => z.string().trim().max(max).nullish();

export const DOCUMENT_KINDS = ["invoice", "receipt", "contract", "warranty", "other"] as const;

export const documentCreate = z.object({
  id: uuid.optional(),
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string().trim().min(1).max(200),
  issuedAt: dateOnly.nullish(),
  expiresAt: dateOnly.nullish(),
  amount: z.number().min(0).max(99_999_999).nullish(),
  providerId: uuid.nullish(),
  applianceId: uuid.nullish(),
  notes: text(5000),
});
export const documentUpdate = documentCreate.omit({ id: true }).partial();

/** Tamaño máximo por archivo (los límites de cuerpo de las plataformas serverless rondan los 4,5 MB). */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;
export const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const mimeFromKey = (key: string) =>
  ({ pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", webp: "image/webp" })[key.split(".").pop() ?? ""] ??
  "application/octet-stream";
