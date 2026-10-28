import { compressPhoto } from "@/lib/image";
import { DOC_TYPES, MAX_DOC_BYTES } from "./schemas";

export type UploadResult = "ok" | "too_large" | "bad_file" | "error";

/** Sube un adjunto (documento o recibo). Las imágenes se comprimen; los PDF van tal cual (máx. 4 MB). */
export async function uploadAttachment(url: string, file: File): Promise<UploadResult> {
  if (!(file.type in DOC_TYPES)) return "bad_file";
  let body: Blob = file;
  if (file.type.startsWith("image/")) {
    try {
      body = (await compressPhoto(file)).blob;
    } catch {
      return "bad_file";
    }
  }
  if (body.size > MAX_DOC_BYTES) return "too_large";
  const form = new FormData();
  form.set("file", new File([body], file.type === "application/pdf" ? "documento.pdf" : "documento.jpg", { type: body.type }));
  try {
    const res = await fetch(url, { method: "POST", body: form });
    if (res.ok) return "ok";
    if (res.status === 413) return "too_large";
    return res.status === 400 ? "bad_file" : "error";
  } catch {
    return "error";
  }
}

export const uploadDocumentFile = (docId: string, file: File) => uploadAttachment(`/api/documents/${docId}/file`, file);
export const uploadReceipt = (expenseId: string, file: File) => uploadAttachment(`/api/expenses/${expenseId}/receipt`, file);
