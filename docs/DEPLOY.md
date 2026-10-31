# DEPLOY.md — Notificaciones push en el servidor (Contabo)

Sitio: https://home.noxutech.com. En un VPS no hay Vercel Cron: el cron del sistema llama a la app.

## 1. Variables de entorno (en el proceso de la app)
```
NEXT_PUBLIC_APP_URL=https://home.noxutech.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=...              # solo servidor, nunca en el repo
VAPID_SUBJECT=mailto:tu-correo@ejemplo.com
CRON_SECRET=...                    # openssl rand -hex 32
```
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` se incrusta en el build: tras cambiarla hay que volver a ejecutar `npm run build` y reiniciar la app (pm2/systemd).

## 2. Cron del sistema (`crontab -e` del usuario que corre la app)
Horas en UTC (el servidor de Contabo suele estar en UTC; comprobar con `date`).
```
# Avisos diarios (mantenimientos, garantías, pendientes) — 13:00 UTC
0 13 * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://home.noxutech.com/api/cron/reminders >> /var/log/ht-cron.log 2>&1
# Resumen semanal — lunes 01:00 UTC (domingo por la noche en América)
0 1 * * 1   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "https://home.noxutech.com/api/cron/reminders?job=weekly" >> /var/log/ht-cron.log 2>&1
```
Define `CRON_SECRET=...` en la primera línea del crontab (o sustitúyelo por el valor). Los avisos de "Mis pendientes" se envían el mismo día; para que lleguen a las 8:00 hora local, ajusta la hora del cron a esa zona (p. ej. `0 13` UTC = 8:00 en Colombia/Perú/Ecuador) o corre el cron cada hora.

## 3. Comprobar
1. `curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" https://home.noxutech.com/api/cron/reminders` → 200 con el resumen. `503 push_not_configured` = faltan claves VAPID; `401` = secreto incorrecto.
2. En el iPhone (iOS 16.4+): abrir el sitio en Safari → Compartir → **Añadir a pantalla de inicio** → abrir desde el icono → Más → Recordatorios → **Activar recordatorios** (aceptar el permiso).
3. Botón de prueba de la pantalla Recordatorios (`/api/push/test`): debe llegar la notificación con la app cerrada.
4. Si no llega: Ajustes del iPhone → Notificaciones → HomeTracker activado; revisar `/var/log/ht-cron.log`.
