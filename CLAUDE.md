# CLAUDE.md

Guía para Claude Code en este repositorio. Lee también `CONTEXT.md` (producto y decisiones) y `PLAN.md` (fases).

## Proyecto
No uses tipos globales generados por `next build` (p. ej. `LayoutProps`): la CI hace typecheck antes del build.

Antes de escribir código de Next.js lee la guía correspondiente en `node_modules/next/dist/docs/` (esta versión difiere de lo habitual; ver `AGENTS.md`).

HomeTracker: PWA en español para gestionar el hogar (cajas con QR, equipos y mantenimientos, listas, tareas, documentos, contactos, gastos). Multiusuario por "hogar". iPhone primero (PWA instalada); Android compatible.

## Stack
Next.js (App Router) + TypeScript + Tailwind · MySQL 8 + Drizzle ORM (`mysql2`) · auth propia (OTP + sesiones) · almacenamiento S3 compatible · service worker propio en `public/sw.js` · Dexie (IndexedDB) · Web Push (VAPID) · Vitest + Playwright.

## Reglas de trabajo
- Trabajar en la rama indicada por la sesión; no abrir PR salvo que se pida.
- Seguir `PLAN.md`: una fase a la vez; marcar `[x]` lo completado.
- Prioridad: **Cajas con QR** y luego **Mantenimientos + push**.
- Cambios pequeños y commits descriptivos en español o inglés, consistentes con el historial.
- No inventar dependencias ni servicios sin justificarlo; preguntar si cambia una decisión de `CONTEXT.md`.

## Convenciones de código
- TypeScript estricto; sin `any` salvo justificación.
- Componentes en `src/components`, lógica de datos en `src/lib`. Rutas en `src/app`.
- Todo texto visible en español, centralizado (p. ej. `src/lib/i18n/es.ts`), no disperso.
- IDs de entidades generados en el cliente (UUID v4) para soportar creación offline.
- Borrado lógico (`deleted_at`); nunca borrar filas directamente desde el cliente.
- Fechas en UTC en BD; mostrar en zona horaria local.
- Mobile-first: diseñar para pantallas de ~360 px, objetivos táctiles ≥ 44 px.

## iOS / Safari
- Probar siempre pensando en iPhone: sin BarcodeDetector (usar `@zxing/browser`), sin Background Sync, push solo con PWA instalada.
- Login por OTP de 6 dígitos, nunca depender de enlaces que abran Safari.
- Incluir metas `apple-mobile-web-app-*`, `apple-touch-icon` y respetar safe-area (`env(safe-area-inset-*)`).
- Subir fotos con `<input type="file" accept="image/*" capture>`.
- La URL base sale de `NEXT_PUBLIC_APP_URL` (dominio pendiente); nunca hardcodearla.

## Offline y sincronización
- Escrituras del cliente siempre con `mutate()` (`src/lib/offline/outbox.ts`): envía si hay red; si no (o hay cola previa) guarda en IndexedDB y `SyncManager` la vacía en orden. Los 4xx no se encolan (HttpError); los 5xx/red sí.
- Tras `mutate`, solo `router.refresh()` si `navigator.onLine` y no quedó en cola; la UI muestra lo pendiente con `useOutbox()`.
- Los endpoints de escritura deben ser idempotentes por `id` generado en el cliente (los reintentos son normales).
- Para que lo pendiente se vea al instante sin conexión, los datos de la cola se superponen a los del servidor con funciones puras (`src/lib/offline/overlay.ts`, con tests); para controles (checkbox) añade además estado local optimista, que se descarta cuando llegan datos nuevos del servidor.
- Para probar offline de verdad usa el build de producción (`next build && next start`), no `next dev`.
- Lecturas con caché en IndexedDB; mostrar estado de sincronización al usuario.
- Fotos: comprimir en cliente antes de subir; subir en segundo plano.

## Seguridad
- MySQL no tiene RLS: toda tabla de hogar lleva `household_id` y toda consulta debe filtrar por él tras `requireMember`. Incluir pruebas de aislamiento.
- Nunca exponer `DATABASE_URL`, claves S3/SMTP, `SESSION_SECRET` ni la clave privada VAPID al cliente.
- OTP, tokens de sesión e invitaciones se guardan solo como hash.
- El QR solo contiene `https://<dominio>/b/<uuid>` (caja) o `/e/<uuid>` (equipo); la autorización la hace el servidor.
- No commitear secretos; usar `.env.local` (ignorado) y `.env.example`.

## Auth y acceso
- Páginas: `requireUser()` / `requireActiveHousehold()` / `requireMember()` (redirigen). Route Handlers: `requireApiUser()` / `requireApiMember()` (lanzan 401/403; capturar con `handleError`).
- El `householdId` de una consulta sale de `requireMember`, nunca directamente del cuerpo de la petición.
- Pruebas de integración con MySQL: `DATABASE_URL=mysql://ht:ht@localhost:3306/hometracker npm test` (sin esa variable se omiten).
- En desarrollo sin `SMTP_URL`, el código OTP se imprime en la consola del servidor.

## Documentos y contactos
- Los archivos de documentos se suben a `/api/documents/<id>/file` (PDF o imagen, máx. 4 MB) y se sirven solo por esa ruta autenticada; los metadatos usan `mutate()` y funcionan offline, el archivo requiere conexión.
- Antes de vincular un proveedor o equipo a un documento hay que validar que sea del mismo hogar (`validateLinks`).

## Búsqueda y exportación
- `globalSearch` (`src/lib/search/data.ts`) reutiliza las listas de cada módulo, que ya filtran por hogar; mínimo 2 letras y comodines `%`/`_` escapados. Un módulo nuevo debe añadirse ahí.
- `exportHousehold` (`src/lib/export/data.ts`) debe incluir toda tabla nueva con `household_id`.
- `SyncManager` refresca los datos cada minuto si la app está visible y no hay cambios pendientes.

## Equipos
- Un proveedor recibido en cualquier endpoint se valida con `validateLinks(householdId, providerId)` antes de guardarlo.
- El manual del equipo usa `uploadManual` y `/api/appliances/<id>/manual` (mismo patrón que documentos).

## Gastos
- Importes en `DECIMAL(12,2)` (number en Drizzle); moneda con `NEXT_PUBLIC_CURRENCY` (por defecto USD). El resumen mensual usa rangos `[inicio, fin)` en UTC (`src/lib/expenses/month.ts`).
- Los recibos usan el mismo patrón que los documentos (`uploadAttachment`, máx. 4 MB, ruta autenticada).

## Mantenimientos
- La lógica de fechas vive en `src/lib/maintenance/schedule.ts` (puro, con tests). Las fechas "solo día" se guardan como medianoche UTC y se muestran con `formatDate`.
- `completePlan` registra el mantenimiento y reprograma en una transacción, idempotente por el `id` del registro.
- Los recordatorios los genera `runReminders` (`src/lib/reminders/run.ts`) desde `next_due - remind_days_before`: filas únicas por (usuario, tipo, plan, momento), envío como máximo una vez (se reclama la fila antes de enviar) y se libera si todos los envíos fallan por error transitorio. Se corre desde `/api/cron/reminders` (Bearer `CRON_SECRET`).
- Push: el service worker siempre muestra una notificación (iOS lo exige). El permiso se pide solo con un gesto del usuario y, en iPhone, solo con la app instalada.

## Archivos y fotos
- Las fotos se comprimen en el cliente (`src/lib/image.ts`: 1600 px + miniatura 400 px, JPEG) y se suben a `/api/photos` (multipart, idempotente por `id`).
- Se sirven solo por `/api/files/<id>` (autoriza por membresía); nunca exponer URLs directas del bucket.
- Storage: `src/lib/storage` (disco local sin `S3_BUCKET`; S3 compatible con él). Las llaves siempre `householdId/...`.
- Para consultar una entidad por id desde un usuario usa funciones tipo `getBoxAccess(userId, id)` (una consulta con join a membresía) y responde 404 si es null.

## Base de datos
- Esquema en `src/db/schema.ts` (Drizzle). Cambios solo con migraciones: `npm run db:generate` y `npm run db:migrate` (SQL en `db/migrations/`, se commitea).
- IDs `CHAR(36)` UUID, fechas `DATETIME(3)` en UTC, importes `DECIMAL(12,2)`, charset utf8mb4.
- Local: MySQL/MariaDB con `DATABASE_URL=mysql://ht:ht@localhost:3306/hometracker`.

## Comandos
```
npm run dev        # desarrollo
npm run build      # build de producción
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run db:generate # genera migración desde el esquema
npm run db:migrate  # aplica migraciones
npm run e2e        # Playwright (pendiente de configurar)
```

## Definition of done
Tipos, lint y tests en verde · aislamiento por hogar verificado · funciona en iPhone real · funciona offline-light · `PLAN.md` actualizado.
