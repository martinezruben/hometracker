"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { newId } from "@/lib/uuid";
import { buttonCls, inputCls } from "@/components/ui";

export function NewBoxForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const id = newId();
    const res = await fetch("/api/boxes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name, location: location || null, notes: notes || null }),
    });
    if (res.ok) {
      router.replace(`/b/${id}`);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(es.auth.genericError);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.boxes.nameLabel}</span>
        <input className={inputCls} required maxLength={160} placeholder={es.boxes.namePlaceholder}
          value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.boxes.locationLabel}</span>
        <input className={inputCls} maxLength={160} placeholder={es.boxes.locationPlaceholder}
          value={location} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted">{es.boxes.notesLabel}</span>
        <textarea className={`${inputCls} py-3`} rows={3} maxLength={5000}
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className={buttonCls} disabled={busy || !name.trim()}>{es.boxes.create}</button>
    </form>
  );
}
