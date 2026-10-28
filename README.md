# HomeTracker

PWA en español para gestionar el hogar: cajas con QR, equipos y mantenimientos, listas, documentos y más. iPhone primero.

- Plan: [`PLAN.md`](PLAN.md) · Contexto: [`CONTEXT.md`](CONTEXT.md) · Guía para Claude: [`CLAUDE.md`](CLAUDE.md)

## Desarrollo

```bash
cp .env.example .env.local
npm install
# MySQL 8 local con una base 'hometracker' y usuario ht/ht (ver .env.example)
npm run db:migrate
npm run dev
```

Scripts: `lint`, `typecheck`, `test`, `build`, `db:generate`, `db:migrate`, `db:studio`.

## Probar en iPhone
Abre la URL en Safari → Compartir → **Añadir a pantalla de inicio**. Las notificaciones push solo funcionan con la app instalada (iOS 16.4+).
