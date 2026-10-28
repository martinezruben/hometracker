export type PrefType = "maintenance" | "warranty" | "tasks" | "weekly";

export const PREF_TYPES: PrefType[] = ["maintenance", "warranty", "tasks", "weekly"];

/** Valores por defecto cuando la persona no ha elegido nada. */
export const PREF_DEFAULTS: Record<PrefType, boolean> = { maintenance: true, warranty: true, tasks: true, weekly: false };

/** Tipo de preferencia que gobierna cada tipo de recordatorio. */
export const prefForReminder = (entityType: string): PrefType | null =>
  entityType === "maintenance" || entityType === "maintenance_due"
    ? "maintenance"
    : entityType === "document_expiring"
      ? "warranty"
      : entityType === "task_due"
        ? "tasks"
        : entityType === "weekly"
          ? "weekly"
          : null;

export const isEnabled = (stored: Map<string, boolean> | undefined, type: PrefType) => stored?.get(type) ?? PREF_DEFAULTS[type];
