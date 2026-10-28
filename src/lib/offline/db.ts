import Dexie, { type Table } from "dexie";

/** Qué representa el cambio pendiente; la UI lo usa para mostrarlo de forma optimista. */
export type OutboxMeta = {
  op:
    | "box-create"
    | "box-update"
    | "box-delete"
    | "item-add"
    | "item-delete"
    | "photo-add"
    | "photo-delete"
    | "appliance-create"
    | "appliance-update"
    | "appliance-delete"
    | "plan-add"
    | "plan-update"
    | "plan-delete"
    | "plan-complete"
    | "list-create"
    | "list-update"
    | "list-delete"
    | "list-clear"
    | "list-item-add"
    | "list-item-update"
    | "list-item-delete"
    | "task-add"
    | "task-complete"
    | "task-update"
    | "task-delete"
    | "contact-create"
    | "contact-update"
    | "contact-delete"
    | "document-create"
    | "document-update"
    | "document-delete";
  contactId?: string;
  documentId?: string;
  listId?: string;
  taskId?: string;
  /** Contenido del cambio, para mostrarlo de forma optimista. */
  data?: Record<string, unknown>;
  /** Entidad dueña de la foto (caja, equipo…). */
  entityId?: string;
  applianceId?: string;
  planId?: string;
  boxId?: string;
  itemId?: string;
  photoId?: string;
  title?: string;
  name?: string;
  location?: string | null;
};

export type OutboxItem = {
  seq?: number;
  kind: "json" | "photo";
  url: string;
  method: string;
  body?: unknown;
  /** Solo para kind "photo": campos del formulario + archivos ya comprimidos. */
  photo?: { fields: Record<string, string>; file: Blob; thumb: Blob };
  meta: OutboxMeta;
  createdAt: number;
  attempts: number;
  /** Si el servidor rechazó el cambio (4xx) queda aquí y no se reintenta. */
  error?: string;
};

class HomeTrackerDb extends Dexie {
  outbox!: Table<OutboxItem, number>;
  constructor() {
    super("hometracker");
    this.version(1).stores({ outbox: "++seq, createdAt" });
  }
}

let db: HomeTrackerDb | undefined;
/** Perezoso: IndexedDB solo existe en el navegador. */
export const getDb = () => (db ??= new HomeTrackerDb());
