# PLAN.md — HomeTracker (PWA para el hogar)

Plan maestro. Se actualiza al cerrar cada fase (marcar `[x]`).

## 1. Objetivo

PWA en español para que varias personas gestionen el hogar: cajas con QR, equipos y mantenimientos, listas, pendientes, documentos, contactos/proveedores y compras. Abre rápido y guarda cambios al reconectar. Dispositivos iniciales: **iPhone (iOS 16.4+, PWA instalada)**; Android funciona con el mismo código.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataformas | **iPhone primero** (Safari/PWA instalada, iOS 16.4+); Android compatible |
| Dominio | Pendiente; se usa variable `NEXT_PUBLIC_APP_URL` hasta tenerlo (los QR dependen de él) |
| Offline | "Offline-light": app shell en caché + lecturas cacheadas + **cola de cambios** que se sincroniza al reconectar. No se exige uso 100% offline. |
| Login | **Código OTP de 6 dígitos por correo** (no magic link: en iOS el enlace abre Safari y la sesión no pasa a la PWA instalada) |
| Idioma | Solo español (`es`). Textos centralizados para poder i18n más adelante. |
| Prioridad | 1) Cajas con QR, 2) Equipos y mantenimientos con recordatorios push |
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Base de datos | **MySQL 8** (utf8mb4) con **Drizzle ORM** + `mysql2`; migraciones en `db/migrations/` |
| Backend | Next.js (Route Handlers / Server Actions) sobre MySQL; sin Supabase |
| Auth | Propia: OTP de 6 dígitos por correo (SMTP) + sesión en cookie httpOnly (hash en tabla `sessions`) |
| Archivos | Almacenamiento S3 compatible (URLs firmadas); la BD solo guarda las llaves |
| Tiempo real | Sondeo (polling) / revalidación al enfocar la app; SSE si hace falta |
| Recordatorios | Cron externo (Vercel Cron / Cloud Scheduler) → endpoint protegido con `CRON_SECRET` → `web-push` |
| Push | Web Push (VAPID) con `web-push`; **en iPhone solo funciona con la PWA instalada en pantalla de inicio** |
| Hosting | Vercel (o Cloud Run) para la app; MySQL gestionado aparte (Cloud SQL, Railway, Aiven…), HTTPS |
| Offline técnico | Service worker propio (`public/sw.js`; Serwist se evalúa si crece) + IndexedDB (Dexie) para cola y caché de lectura |

## 3. Arquitectura

```
Android Chrome / PWA instalada
  ├─ UI Next.js (React, Tailwind)
  ├─ Service Worker: caché app shell, push, background sync (cuando exista)
  ├─ IndexedDB (Dexie): caché de lectura + cola de mutaciones
  └─ fetch ──► Next.js (Route Handlers / Server Actions)
                ├─ Auth OTP + sesiones (cookie httpOnly)
                ├─ Autorización por hogar en cada consulta (capa `requireMember`)
                ├─ Drizzle ──► MySQL 8
                ├─ S3 compatible (fotos, PDFs) con URLs firmadas
                └─ /api/cron/reminders (cron externo) → Web Push
```

### Sincronización offline
- Toda escritura pasa por una capa `mutations` que: (1) aplica optimista en IndexedDB, (2) encola, (3) envía al servidor cuando hay red, (4) reintenta con backoff.
- IDs generados en el cliente (UUID v4) para crear offline sin conflictos.
- Resolución de conflictos: *last-write-wins* por campo con `updated_at`; borrado lógico (`deleted_at`).
- Fotos: se comprimen en cliente, se guardan como Blob en IndexedDB y se suben en segundo plano.

### Seguridad
- MySQL no tiene RLS: toda consulta pasa por helpers que exigen `household_id` y membresía del usuario (`requireMember`); nunca se consulta una tabla de hogar sin ese filtro. Pruebas automáticas de aislamiento entre hogares.
- Archivos en rutas `household_id/...` con URLs firmadas de corta duración.
- QR contiene solo URL con el id de la caja (`/b/<uuid>`); la vista exige login y pertenencia al hogar. No hay datos en el QR.
- La BD nunca se expone al navegador. Claves (VAPID, S3, SMTP, `SESSION_SECRET`) solo en el servidor.
- OTP y tokens se guardan como hash; límite de intentos por código y de envíos por correo.

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
src/lib/auth/       OTP, sesiones, requireMember
src/lib/offline/    Dexie, cola de mutaciones, sync
src/lib/push/       registro de suscripción
src/sw/             service worker
db/migrations/      SQL generado por Drizzle
src/db/             schema.ts y cliente MySQL
src/app/api/cron/   recordatorios
public/             manifest, iconos
docs/               notas técnicas
```

## 6. Fases

### Fase 0 — Base (≈1 semana)
- [x] Next.js + TS + Tailwind + ESLint + Vitest (Playwright y Prettier pendientes)
- [x] Esquema MySQL (Drizzle) con 20 tablas y migración inicial aplicada
- [x] Capa de acceso `requireMember` / `requireApiMember` y pruebas de aislamiento entre hogares
- [x] Auth propia (OTP por correo + sesiones) + creación de hogar + invitar miembros por enlace
- [x] PWA: manifest, iconos (apple-touch-icon), service worker, instalable en iPhone (Añadir a pantalla de inicio); *pendiente*: pantalla guía de instalación
- [x] Layout móvil (barra inferior), tema claro/oscuro
- [ ] CI (lint, tipos, tests) y deploy preview

### Fase 1 — Cajas con QR (≈1–2 semanas) ★
- [x] CRUD de cajas, ubicación y notas
- [x] Captura de fotos con cámara, compresión y miniaturas
- [x] Elementos de texto por caja; búsqueda por contenido
- [x] Generación de QR por caja + etiquetas imprimibles (SVG; hoja con todas en `/boxes/labels`, una en `/b/<id>/label`)
- [x] Ruta `/b/<id>`: vista de contenido (fotos + texto); redirige a login y vuelve
- [x] Escáner QR dentro de la app (`@zxing/browser`, `/scan`); la cámara nativa del iPhone abre Safari
- [x] Offline-light: cola de cambios en IndexedDB (cajas, ítems, fotos), páginas y fotos visitadas en caché

### Fase 2 — Equipos y mantenimientos + push (≈1–2 semanas) ★
- [ ] CRUD de equipos con fotos, garantía y manual (PDF)
- [ ] Planes de mantenimiento recurrentes; cálculo de próximo vencimiento
- [ ] Registrar mantenimiento realizado (costo, proveedor, notas) y recalcular
- [ ] Vista "Próximos mantenimientos" y calendario
- [ ] Suscripción Web Push + pantalla de permisos (botón con gesto del usuario, solo en PWA instalada iOS)
- [ ] Endpoint `/api/cron/reminders` (cron diario) y recordatorio N días antes
- [ ] QR opcional por equipo

### Fase 3 — Listas y pendientes (≈1 semana)
- [ ] Listas (súper, venta, general) con ítems, fotos, precio y estado vendido
- [ ] Tareas con asignado, fecha, repetición y notificación
- [ ] Actualización entre miembros (polling/revalidación)

### Fase 4 — Documentos, contactos y gastos (≈1–2 semanas)
- [ ] Documentos (facturas, recibos, contratos, garantías) con vencimientos
- [ ] Contactos/proveedores vinculados a equipos, documentos y gastos
- [ ] Compras/gastos con recibo y resumen mensual

### Fase 5 — Pulido (≈1 semana)
- [ ] Búsqueda global, dashboard, exportación de datos
- [ ] Mejoras de sync (reintentos, indicador de estado, resolución de conflictos)
- [ ] Rendimiento (Lighthouse PWA ≥ 90), accesibilidad, respaldos

### Fase 6 — Android y extras (futuro)
- [ ] Probar en Android; Background Sync donde exista
- [ ] Si el push en iPhone no es fiable: Capacitor o respaldo por correo

## 7. Calidad
- Tests unitarios (Vitest) para cálculo de mantenimientos y cola de sync.
- E2E (Playwright) para flujos: crear caja → QR → abrir; crear equipo → plan → recordatorio.
- Pruebas manuales en iPhone real (PWA instalada) en cada fase; Safari no soporta Background Sync: la cola se vacía al abrir la app y en eventos `online`.
- Definition of done: tipos OK, lint OK, tests OK, RLS probada, funciona offline-light.

## 8. Riesgos
| Riesgo | Mitigación |
|---|---|
| Sincronización offline compleja | Alcance "offline-light", IDs de cliente, LWW, borrado lógico |
| Push en iOS (solo PWA instalada, sin sync en segundo plano) | Probar en iPhone real desde la Fase 2; respaldo por correo para vencimientos críticos |
| Sesión Safari vs PWA instalada separadas | Login por OTP dentro de la PWA |
| Crecimiento de fotos | Compresión en cliente, miniaturas, límites por hogar |
| Fuga entre hogares (sin RLS en MySQL) | Capa única de acceso con filtro de hogar + pruebas automatizadas |
| QR cambia de dominio | Dominio propio estable desde el inicio |

## 9. Costos estimados
Vercel gratis para empezar; MySQL gestionado ≈ 5–15 USD/mes (Railway/Aiven) o Cloud SQL ≈ 10+ USD/mes; almacenamiento S3/R2 de centavos; SMTP (Resend/SES) gratis a bajo volumen; dominio ≈ 12 USD/año.

## 10. Pendientes por definir
- Proveedor de MySQL (Cloud SQL, Railway, Aiven, VPS propio) y de correo/almacenamiento.
- Dominio definitivo (afecta los QR impresos); lo dará el usuario más adelante.
- Moneda y formato de fecha por defecto.
- Tamaño de etiqueta QR (hoja A4 de etiquetas o impresora térmica).
