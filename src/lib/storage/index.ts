import "server-only";
import { Readable } from "node:stream";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** Almacenamiento de archivos. La BD solo guarda la llave; el acceso lo autoriza la app. */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; contentType?: string } | null>;
  remove(key: string): Promise<void>;
}

/** Evita salir del directorio base con llaves maliciosas. */
export function safeKey(key: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(key) || key.includes("..")) {
    throw new Error("Llave de archivo inválida");
  }
  return key;
}

export function localStorageDriver(baseDir: string): Storage {
  const full = (key: string) => path.join(baseDir, safeKey(key));
  return {
    async put(key, body) {
      const file = full(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },
    async get(key) {
      try {
        const buf = await readFile(full(key));
        return { body: new Blob([new Uint8Array(buf)]).stream() };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async remove(key) {
      await rm(full(key), { force: true });
    },
  };
}

export function s3Driver(): Storage {
  const bucket = process.env.S3_BUCKET!;
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        }
      : undefined,
  });
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: safeKey(key), Body: body, ContentType: contentType }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
        if (!res.Body) return null;
        return {
          body: Readable.toWeb(res.Body as Readable) as ReadableStream<Uint8Array>,
          contentType: res.ContentType,
        };
      } catch (err) {
        if ((err as { name?: string }).name === "NoSuchKey") return null;
        throw err;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
    },
  };
}

let instance: Storage | undefined;

/** S3 si hay `S3_BUCKET`; si no, disco local (`STORAGE_DIR`; en desarrollo por defecto `.storage`). */
export function getStorage(): Storage {
  if (!instance) {
    if (process.env.S3_BUCKET) instance = s3Driver();
    else if (process.env.NODE_ENV === "production" && !process.env.STORAGE_DIR) {
      throw new Error("Falta S3_BUCKET (o STORAGE_DIR para disco local)");
    } else instance = localStorageDriver(path.resolve(process.env.STORAGE_DIR ?? ".storage"));
  }
  return instance;
}
