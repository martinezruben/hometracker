import {
  boolean,
  char,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// Todas las fechas se guardan en UTC (el pool usa timezone "Z").
const id = () => char("id", { length: 36 }).primaryKey(); // UUID v4 generado en el cliente
const ts = (name: string) => datetime(name, { mode: "date", fsp: 3 });
const createdAt = () => ts("created_at").notNull().default(sql`CURRENT_TIMESTAMP(3)`);
const updatedAt = () =>
  ts("updated_at").notNull().default(sql`CURRENT_TIMESTAMP(3)`).$onUpdate(() => new Date());

/** Columnas comunes de las entidades que pertenecen a un hogar. */
const householdScoped = () => ({
  id: id(),
  householdId: char("household_id", { length: 36 })
    .notNull()
    .references(() => households.id),
  createdBy: char("created_by", { length: 36 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: ts("deleted_at"), // borrado lógico
});

// ───────────── Identidad y hogares ─────────────

export const users = mysqlTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

/** Códigos OTP de 6 dígitos (se guarda solo el hash). */
export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    codeHash: char("code_hash", { length: 64 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("otp_email_idx").on(t.email, t.createdAt)],
);

/** Sesiones: se guarda el hash SHA-256 del token de la cookie. */
export const sessions = mysqlTable(
  "sessions",
  {
    id: char("id", { length: 64 }).primaryKey(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: varchar("user_agent", { length: 255 }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const households = mysqlTable("households", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  createdBy: char("created_by", { length: 36 }),
  createdAt: createdAt(),
});

export const householdMembers = mysqlTable(
  "household_members",
  {
    householdId: char("household_id", { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["admin", "member", "viewer"]).notNull().default("member"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.householdId, t.userId] }), index("hm_user_idx").on(t.userId)],
);

export const invitations = mysqlTable(
  "invitations",
  {
    id: id(),
    householdId: char("household_id", { length: 36 })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    role: mysqlEnum("role", ["admin", "member", "viewer"]).notNull().default("member"),
    email: varchar("email", { length: 255 }),
    expiresAt: ts("expires_at").notNull(),
    acceptedAt: ts("accepted_at"),
    createdBy: char("created_by", { length: 36 }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("inv_token_uq").on(t.tokenHash)],
);

// ───────────── Cajas y fotos ─────────────

export const boxes = mysqlTable(
  "boxes",
  {
    ...householdScoped(),
    name: varchar("name", { length: 160 }).notNull(),
    location: varchar("location", { length: 160 }),
    notes: text("notes"),
  },
  (t) => [index("boxes_hh_idx").on(t.householdId, t.deletedAt)],
);

export const boxItems = mysqlTable(
  "box_items",
  {
    ...householdScoped(),
    boxId: char("box_id", { length: 36 })
      .notNull()
      .references(() => boxes.id),
    title: varchar("title", { length: 200 }).notNull(),
    notes: text("notes"),
  },
  (t) => [index("box_items_box_idx").on(t.boxId)],
);

/** Fotos de cualquier entidad (caja, ítem, equipo, lista…). El archivo vive en el storage. */
export const photos = mysqlTable(
  "photos",
  {
    ...householdScoped(),
    entityType: mysqlEnum("entity_type", [
      "box",
      "box_item",
      "appliance",
      "list_item",
      "document",
      "expense",
    ]).notNull(),
    entityId: char("entity_id", { length: 36 }).notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    thumbKey: varchar("thumb_key", { length: 500 }),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: int("size_bytes"),
    width: int("width"),
    height: int("height"),
    caption: varchar("caption", { length: 300 }),
  },
  (t) => [index("photos_entity_idx").on(t.entityType, t.entityId)],
);

// ───────────── Equipos y mantenimientos ─────────────

export const contacts = mysqlTable(
  "contacts",
  {
    ...householdScoped(),
    name: varchar("name", { length: 160 }).notNull(),
    category: varchar("category", { length: 80 }), // plomero, electricista, proveedor…
    phone: varchar("phone", { length: 40 }),
    email: varchar("email", { length: 255 }),
    rating: int("rating"), // 1-5
    notes: text("notes"),
  },
  (t) => [index("contacts_hh_idx").on(t.householdId, t.deletedAt)],
);

export const appliances = mysqlTable(
  "appliances",
  {
    ...householdScoped(),
    name: varchar("name", { length: 160 }).notNull(),
    brand: varchar("brand", { length: 120 }),
    model: varchar("model", { length: 120 }),
    serial: varchar("serial", { length: 120 }),
    location: varchar("location", { length: 160 }),
    purchaseDate: datetime("purchase_date", { mode: "date" }),
    warrantyUntil: datetime("warranty_until", { mode: "date" }),
    manualKey: varchar("manual_key", { length: 500 }),
    notes: text("notes"),
  },
  (t) => [index("appliances_hh_idx").on(t.householdId, t.deletedAt)],
);

export const maintenancePlans = mysqlTable(
  "maintenance_plans",
  {
    ...householdScoped(),
    applianceId: char("appliance_id", { length: 36 })
      .notNull()
      .references(() => appliances.id),
    title: varchar("title", { length: 200 }).notNull(),
    intervalValue: int("interval_value").notNull(),
    intervalUnit: mysqlEnum("interval_unit", ["day", "week", "month", "year"]).notNull(),
    nextDue: ts("next_due").notNull(),
    remindDaysBefore: int("remind_days_before").notNull().default(7),
    assignedTo: char("assigned_to", { length: 36 }),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
  },
  (t) => [
    index("mp_appliance_idx").on(t.applianceId),
    index("mp_due_idx").on(t.active, t.nextDue), // consulta del cron de recordatorios
  ],
);

export const maintenanceLogs = mysqlTable(
  "maintenance_logs",
  {
    ...householdScoped(),
    applianceId: char("appliance_id", { length: 36 })
      .notNull()
      .references(() => appliances.id),
    planId: char("plan_id", { length: 36 }).references(() => maintenancePlans.id),
    doneAt: ts("done_at").notNull(),
    cost: decimal("cost", { precision: 12, scale: 2, mode: "number" }),
    providerId: char("provider_id", { length: 36 }).references(() => contacts.id),
    notes: text("notes"),
  },
  (t) => [index("ml_appliance_idx").on(t.applianceId, t.doneAt)],
);

// ───────────── Listas y tareas ─────────────

export const lists = mysqlTable(
  "lists",
  {
    ...householdScoped(),
    name: varchar("name", { length: 160 }).notNull(),
    type: mysqlEnum("type", ["shopping", "sale", "general"]).notNull().default("general"),
  },
  (t) => [index("lists_hh_idx").on(t.householdId, t.deletedAt)],
);

export const listItems = mysqlTable(
  "list_items",
  {
    ...householdScoped(),
    listId: char("list_id", { length: 36 })
      .notNull()
      .references(() => lists.id),
    title: varchar("title", { length: 200 }).notNull(),
    quantity: varchar("quantity", { length: 40 }),
    price: decimal("price", { precision: 12, scale: 2, mode: "number" }),
    status: mysqlEnum("status", ["pending", "done", "available", "sold"]).notNull().default("pending"),
    checked: boolean("checked").notNull().default(false),
    notes: text("notes"),
  },
  (t) => [index("li_list_idx").on(t.listId)],
);

export const tasks = mysqlTable(
  "tasks",
  {
    ...householdScoped(),
    title: varchar("title", { length: 200 }).notNull(),
    notes: text("notes"),
    dueAt: ts("due_at"),
    repeatRule: varchar("repeat_rule", { length: 120 }), // RRULE simple
    assignedTo: char("assigned_to", { length: 36 }),
    doneAt: ts("done_at"),
  },
  (t) => [index("tasks_hh_idx").on(t.householdId, t.doneAt, t.dueAt)],
);

// ───────────── Documentos y gastos ─────────────

export const documents = mysqlTable(
  "documents",
  {
    ...householdScoped(),
    kind: mysqlEnum("kind", ["invoice", "receipt", "contract", "warranty", "other"]).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    issuedAt: datetime("issued_at", { mode: "date" }),
    expiresAt: datetime("expires_at", { mode: "date" }),
    amount: decimal("amount", { precision: 12, scale: 2, mode: "number" }),
    fileKey: varchar("file_key", { length: 500 }),
    providerId: char("provider_id", { length: 36 }).references(() => contacts.id),
    applianceId: char("appliance_id", { length: 36 }).references(() => appliances.id),
    notes: text("notes"),
  },
  (t) => [index("docs_hh_idx").on(t.householdId, t.deletedAt), index("docs_exp_idx").on(t.expiresAt)],
);

export const expenses = mysqlTable(
  "expenses",
  {
    ...householdScoped(),
    title: varchar("title", { length: 200 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    spentAt: datetime("spent_at", { mode: "date" }).notNull(),
    category: varchar("category", { length: 80 }),
    receiptKey: varchar("receipt_key", { length: 500 }),
    providerId: char("provider_id", { length: 36 }).references(() => contacts.id),
    notes: text("notes"),
  },
  (t) => [index("exp_hh_idx").on(t.householdId, t.spentAt)],
);

// ───────────── Notificaciones ─────────────

export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: id(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpointHash: char("endpoint_hash", { length: 64 }).notNull(), // SHA-256 del endpoint
    endpoint: text("endpoint").notNull(),
    p256dh: varchar("p256dh", { length: 255 }).notNull(),
    auth: varchar("auth", { length: 255 }).notNull(),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("push_endpoint_uq").on(t.endpointHash), index("push_user_idx").on(t.userId)],
);

/** Recordatorios programados; el cron envía los que tienen fire_at <= ahora y sent_at nulo. */
export const reminders = mysqlTable(
  "reminders",
  {
    id: id(),
    householdId: char("household_id", { length: 36 })
      .notNull()
      .references(() => households.id),
    userId: char("user_id", { length: 36 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: char("entity_id", { length: 36 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 500 }),
    url: varchar("url", { length: 300 }),
    fireAt: ts("fire_at").notNull(),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("rem_due_idx").on(t.sentAt, t.fireAt),
    uniqueIndex("rem_dedupe_uq").on(t.userId, t.entityType, t.entityId, t.fireAt),
  ],
);
