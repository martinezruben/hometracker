import { and, eq, isNull, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { listAppliances } from "@/lib/appliances/data";
import { listBoxes } from "@/lib/boxes/data";
import { listContacts } from "@/lib/contacts/data";
import { listDocuments } from "@/lib/documents/data";

const { tasks, lists, listItems, expenses } = schema;
const LIMIT = 8;

export type SearchHit = { id: string; title: string; subtitle?: string; href: string };
export type SearchResults = Record<"boxes" | "appliances" | "lists" | "tasks" | "documents" | "contacts" | "expenses", SearchHit[]>;

export const likePattern = (q: string) => `%${q.trim().replace(/[%_\\]/g, "\\$&")}%`;

/** Busca en todo el hogar. Cada módulo ya filtra por `householdId`; aquí solo se unifica el formato. */
export async function globalSearch(householdId: string, rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim().slice(0, 100);
  const empty: SearchResults = { boxes: [], appliances: [], lists: [], tasks: [], documents: [], contacts: [], expenses: [] };
  if (q.length < 2) return empty;
  const p = likePattern(q);

  const [boxes, appliances, contacts, documents, taskRows, listRows, itemRows, expenseRows] = await Promise.all([
    listBoxes(householdId, q),
    listAppliances(householdId, q),
    listContacts(householdId, q),
    listDocuments(householdId, { q }),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt), or(like(tasks.title, p), like(tasks.notes, p))))
      .limit(LIMIT),
    db
      .select()
      .from(lists)
      .where(and(eq(lists.householdId, householdId), isNull(lists.deletedAt), like(lists.name, p)))
      .limit(LIMIT),
    db
      .select({ item: listItems, listName: lists.name })
      .from(listItems)
      .innerJoin(lists, eq(lists.id, listItems.listId))
      .where(
        and(
          eq(listItems.householdId, householdId),
          isNull(listItems.deletedAt),
          isNull(lists.deletedAt),
          or(like(listItems.title, p), like(listItems.notes, p)),
        ),
      )
      .limit(LIMIT),
    db
      .select()
      .from(expenses)
      .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt), or(like(expenses.title, p), like(expenses.category, p))))
      .limit(LIMIT),
  ]);

  const listHits = new Map<string, SearchHit>();
  for (const l of listRows) listHits.set(l.id, { id: l.id, title: l.name, href: `/lists/${l.id}` });
  for (const { item, listName } of itemRows) {
    if (!listHits.has(item.listId)) listHits.set(item.listId, { id: item.listId, title: listName, subtitle: item.title, href: `/lists/${item.listId}` });
  }

  return {
    boxes: boxes.slice(0, LIMIT).map((b) => ({ id: b.id, title: b.name, subtitle: b.location ?? undefined, href: `/b/${b.id}` })),
    appliances: appliances.slice(0, LIMIT).map((a) => ({ id: a.id, title: a.name, subtitle: [a.brand, a.model].filter(Boolean).join(" · ") || undefined, href: `/appliances/${a.id}` })),
    lists: [...listHits.values()].slice(0, LIMIT),
    tasks: taskRows.map((t) => ({ id: t.id, title: t.title, subtitle: t.doneAt ? "Hecho" : undefined, href: "/lists" })),
    documents: documents.slice(0, LIMIT).map((d) => ({ id: d.id, title: d.title, href: `/documents/${d.id}` })),
    contacts: contacts.slice(0, LIMIT).map((c) => ({ id: c.id, title: c.name, subtitle: c.category ?? undefined, href: `/contacts/${c.id}` })),
    expenses: expenseRows.map((e) => ({ id: e.id, title: e.title, subtitle: e.category ?? undefined, href: `/expenses/${e.id}` })),
  };
}
