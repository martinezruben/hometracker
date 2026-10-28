import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

function createPool() {
  // Durante `next build` no hay base de datos: el pool no conecta hasta la primera consulta.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  const url = process.env.DATABASE_URL ?? (building ? "mysql://build@localhost/build" : undefined);
  if (!url) throw new Error("Falta DATABASE_URL");
  return mysql.createPool({
    uri: url,
    timezone: "Z", // fechas en UTC
    connectionLimit: 10,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
}

// Singleton para evitar abrir un pool por recarga en desarrollo.
const pool = (globalForDb.pool ??= createPool());
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
