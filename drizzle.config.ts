import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "mysql://ht:ht@localhost:3306/hometracker" },
});
