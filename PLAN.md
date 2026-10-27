# PLAN.md — HomeTracker (PWA para el hogar)

Plan maestro. Se actualiza al cerrar cada fase (marcar `[x]`).

## 1. Objetivo

PWA en español para que varias personas gestionen el hogar: cajas con QR, equipos y mantenimientos, listas, pendientes, documentos, contactos/proveedores y compras. Abre rápido y guarda cambios al reconectar. Dispositivos iniciales: **Android** (iOS queda como compatibilidad futura).

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataformas | Android (Chrome) primero; iOS después (push solo con PWA instalada, iOS 16.4+) |
| Offline | "Offline-light": app shell en caché + lecturas cacheadas + **cola de cambios** que se sincroniza al reconectar. No se exige uso 100% offline. |
| Idioma | Solo español (`es`). Textos centralizados para poder i18n más adelante. |
| Prioridad | 1) Cajas con QR, 2) Equipos y mantenimientos con recordatorios push |
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Backend | Supabase: Postgres, Auth, Storage, Realtime, Edge Functions, `pg_cron` |
| Push | Web Push (VAPID) con `web-push`; funciona en Android sin instalar, mejor instalada |
| Hosting | Vercel (o Cloudflare Pages), HTTPS |
| Offline técnico | Service worker (Serwist) + IndexedDB (Dexie) para cola y caché de lectura |

## 3. Arquitectura

```
Android Chrome / PWA instalada
  ├─ UI Next.js (React, Tailwind)
  ├─ Service Worker: caché app shell, push, background sync (cuando exista)
  ├─ IndexedDB (Dexie): caché de lectura + cola de mutaciones
  └─ Supabase JS client ──► Supabase
                             ├─ Auth (email magic link / Google)
                             ├─ Postgres + RLS por household
                             ├─ Storage (fotos, PDFs) con URLs firmadas
                             ├─ Realtime (cambios entre miembros)
                             └─ pg_cron → Edge Function "send-reminders" → Web Push
```

### Sincronización offline
- Toda escritura pasa por una capa `mutations` que: (1) aplica optimista en IndexedDB, (2) encola, (3) envía a Supabase cuando hay red, (4) reintenta con backoff.
- IDs generados en el cliente (UUID v4) para crear offline sin conflictos.
- Resolución de conflictos: *last-write-wins* por campo con `updated_at`; borrado lógico (`deleted_at`).
- Fotos: se comprimen en cliente, se guardan como Blob en IndexedDB y se suben en segundo plano.

### Seguridad
- RLS en todas las tablas: acceso solo si el usuario es miembro del `household_id`.
- Storage con rutas `household_id/...` y políticas equivalentes.
- QR contiene solo URL con el id de la caja (`/b/<uuid>`); la vista exige login y pertenencia al hogar. No hay datos en el QR.
- Claves privadas (VAPID, service role) solo en variables de entorno del servidor.

## 4. Modelo de datos (inicial)

Todas las tablas: `id uuid pk`, `household_id`, `created_at`, `updated_at`, `created_by`, `deleted_at`.

- `households`, `household_members(user_id, role: admin|member|viewer)`, `invitations`
- `boxes(name, location, notes, qr_code)` · `box_items(box_id, title, notes)` · `photos(entity_type, entity_id, storage_path, caption)`
- `appliances(name, brand, model, serial, purchase_date, warranty_until, location, manual_path, notes)`
- `maintenance_plans(appliance_id, title, interval_value, interval_unit, next_due, remind_days_before, assigned_to)`
- `maintenance_logs(appliance_id, plan_id, done_at, cost, provider_id, notes)`
- `lists(name, type: shopping|sale|general)` · `list_items(list_id, title, qty, price, status, checked)`
- `tasks(title, due_at, repeat_rule, assigned_to, done_at)`
- `documents(kind: invoice|receipt|contract|warranty, title, issued_at, expires_at, amount, file_path, provider_id)`
- `contacts(name, category, phone, email, rating, notes)`
- `expenses(title, amount, date, category, receipt_path, provider_id)`
- `push_subscriptions(user_id, endpoint, keys, user_agent)` · `reminders(entity_type, entity_id, fire_at, sent_at)`

## 5. Estructura del repo (objetivo)

```
src/app/            rutas (App Router) — (auth), boxes, appliances, lists, tasks, docs, contacts
src/components/     UI reutilizable
src/lib/supabase/   clientes, tipos generados
src/lib/offline/    Dexie, cola de mutaciones, sync
src/lib/push/       registro de suscripción
src/sw/             service worker
supabase/migrations/ SQL versionado + políticas RLS
supabase/functions/send-reminders/
public/             manifest, iconos
docs/               notas técnicas
```

## 6. Fases

### Fase 0 — Base (≈1 semana)
- [ ] Next.js + TS + Tailwind + ESLint/Prettier + Vitest + Playwright
- [ ] Proyecto Supabase, migraciones iniciales, RLS de households
- [ ] Auth (magic link) + creación de hogar + invitar miembros por enlace
- [ ] PWA: manifest, iconos, service worker, instalable en Android
- [ ] Layout móvil (barra inferior), tema claro/oscuro
- [ ] CI (lint, tipos, tests) y deploy preview

### Fase 1 — Cajas con QR (≈1–2 semanas) ★
- [ ] CRUD de cajas, ubicación y notas
- [ ] Captura de fotos con cámara, compresión y miniaturas
- [ ] Elementos de texto por caja; búsqueda por contenido
- [ ] Generación de QR por caja + hoja de etiquetas imprimible (PDF)
- [ ] Ruta `/b/<id>`: vista de contenido (fotos + texto); redirige a login y vuelve
- [ ] Escáner QR dentro de la app (BarcodeDetector con respaldo `zxing`)
- [ ] Offline-light: ver cajas cacheadas y crear/editar en cola

### Fase 2 — Equipos y mantenimientos + push (≈1–2 semanas) ★
- [ ] CRUD de equipos con fotos, garantía y manual (PDF)
- [ ] Planes de mantenimiento recurrentes; cálculo de próximo vencimiento
- [ ] Registrar mantenimiento realizado (costo, proveedor, notas) y recalcular
- [ ] Vista "Próximos mantenimientos" y calendario
- [ ] Suscripción Web Push + pantalla de permisos
- [ ] Edge Function `send-reminders` con `pg_cron` (diario) y recordatorio N días antes
- [ ] QR opcional por equipo

### Fase 3 — Listas y pendientes (≈1 semana)
- [ ] Listas (súper, venta, general) con ítems, fotos, precio y estado vendido
- [ ] Tareas con asignado, fecha, repetición y notificación
- [ ] Realtime entre miembros

### Fase 4 — Documentos, contactos y gastos (≈1–2 semanas)
- [ ] Documentos (facturas, recibos, contratos, garantías) con vencimientos
- [ ] Contactos/proveedores vinculados a equipos, documentos y gastos
- [ ] Compras/gastos con recibo y resumen mensual

### Fase 5 — Pulido (≈1 semana)
- [ ] Búsqueda global, dashboard, exportación de datos
- [ ] Mejoras de sync (reintentos, indicador de estado, resolución de conflictos)
- [ ] Rendimiento (Lighthouse PWA ≥ 90), accesibilidad, respaldos

### Fase 6 — iOS (futuro)
- [ ] Probar push en iPhone real con PWA instalada; guía de instalación in-app
- [ ] Si falla: envolver con Capacitor o respaldo por correo

## 7. Calidad
- Tests unitarios (Vitest) para cálculo de mantenimientos y cola de sync.
- E2E (Playwright) para flujos: crear caja → QR → abrir; crear equipo → plan → recordatorio.
- Pruebas manuales en Android real en cada fase.
- Definition of done: tipos OK, lint OK, tests OK, RLS probada, funciona offline-light.

## 8. Riesgos
| Riesgo | Mitigación |
|---|---|
| Sincronización offline compleja | Alcance "offline-light", IDs de cliente, LWW, borrado lógico |
| Push poco fiable | Respaldo por correo para vencimientos críticos |
| Crecimiento de fotos | Compresión en cliente, miniaturas, límites por hogar |
| Fuga entre hogares | RLS + pruebas automatizadas de políticas |
| QR cambia de dominio | Dominio propio estable desde el inicio |

## 9. Costos estimados
Supabase y Vercel gratis para empezar; Supabase Pro ≈ 25 USD/mes si crecen las fotos; dominio ≈ 12 USD/año.

## 10. Pendientes por definir
- Dominio definitivo (afecta los QR impresos).
- Método de login preferido (magic link vs Google).
- Moneda y formato de fecha por defecto.
- Tamaño de etiqueta QR (hoja A4 de etiquetas o impresora térmica).
