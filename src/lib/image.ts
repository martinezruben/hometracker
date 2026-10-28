// Compresión de fotos en el cliente (ahorra datos y espacio). iOS Safari no codifica WebP: se usa JPEG.

export type CompressedImage = { blob: Blob; width: number; height: number };

async function resize(file: Blob, maxDim: number, quality: number): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo comprimir"))), "image/jpeg", quality),
  );
  return { blob, width, height };
}

export const compressPhoto = (file: Blob) => resize(file, 1600, 0.8);
export const makeThumbnail = (file: Blob) => resize(file, 400, 0.7);
