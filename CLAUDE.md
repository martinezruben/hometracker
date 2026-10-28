# CLAUDE.md

Guía para Claude Code en este repositorio. Lee también `CONTEXT.md` (producto y decisiones) y `PLAN.md` (fases).

## Proyecto
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
- Escrituras siempre vía la capa de mutaciones (`src/lib/offline`): optimista → cola → envío con reintentos.
- Lecturas con caché en IndexedDB; mostrar estado de sincronización al usuario.
- Fotos: comprimir en cliente antes de subir; subir en segundo plano.

## Seguridad
- MySQL no tiene RLS: toda tabla de hogar lleva `household_id` y toda consulta debe filtrar por él tras `requireMember`. Incluir pruebas de aislamiento.
- Nunca exponer `DATABASE_URL`, claves S3/SMTP, `SESSION_SECRET` ni la clave privada VAPID al cliente.
- OTP, tokens de sesión e invitaciones se guardan solo como hash.
- El QR solo contiene `https://<dominio>/b/<uuid>`; la autorización la hace el servidor.
- No commitear secretos; usar `.env.local` (ignorado) y `.env.example`.

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
