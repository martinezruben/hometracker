# CONTEXT.md

Contexto de producto y decisiones de HomeTracker. Fuente de verdad para el "por qué". El "cómo/cuándo" está en `PLAN.md`; las reglas de código en `CLAUDE.md`.

## Visión
Un solo lugar para que una familia lleve todo lo del hogar: qué hay en cada caja, cuándo toca mantener cada equipo, qué falta comprar, qué papeles y contratos existen y a quién llamar.

## Usuarios
- Varias personas por hogar (pareja/familia), inicialmente en **Android**.
- Roles: admin, miembro, solo lectura.
- Idioma: **español** únicamente por ahora.

## Funcionalidades clave (por prioridad)
1. **Cajas con QR** — crear una caja, subir fotos y texto de su contenido, generar un QR imprimible; al escanearlo se abre la vista de la caja (fotos + textos).
2. **Equipos y mantenimientos** — ficha del equipo/electrodoméstico, planes recurrentes, historial, próximo mantenimiento y **notificaciones push** de recordatorio.
3. **Listas** — súper, compras, y listas con fotos (p. ej. "cosas sin uso para vender" con precio/estado).
4. **Pendientes/tareas** — asignables, con fecha y repetición.
5. **Documentos** — facturas, recibos, contratos, garantías, con vencimientos.
6. **Contactos y proveedores**, **compras/gastos**.

## Requisitos no funcionales
- **Abrir rápido**: app shell en caché, lecturas desde caché local.
- **Guardar cambios al reconectar**: cola de mutaciones con reintentos (offline-light, no offline total).
- Multiusuario con datos aislados por hogar (RLS).
- Instalable como PWA; notificaciones vía Web Push.
- Costo bajo (planes gratuitos al inicio).

## Decisiones (resumen)
| Decisión | Valor |
|---|---|
| Plataforma inicial | Android; iOS más adelante |
| Frontend | Next.js + TypeScript + Tailwind |
| Backend | Supabase (Auth, Postgres, Storage, Realtime, Edge Functions, pg_cron) |
| Offline | Service worker + IndexedDB; cola de cambios; LWW por `updated_at` |
| Push | Web Push (VAPID) |
| Hosting | Vercel / Cloudflare Pages |
| QR | URL `https://<dominio>/b/<uuid>`, requiere login |

## Notas sobre iOS (para la Fase 6)
- Push solo con PWA instalada en pantalla de inicio, iOS 16.4+, permiso pedido con gesto del usuario.
- Escanear el QR con la cámara nativa abre Safari, no la PWA; por eso la vista de caja es una ruta web normal con login.
- Sin sync en segundo plano; alternativa de respaldo: Capacitor o recordatorios por correo.

## Glosario
- **Hogar (household)**: unidad que agrupa miembros y datos.
- **Caja (box)**: contenedor físico con QR y contenido documentado.
- **Equipo (appliance)**: electrodoméstico o sistema del hogar con mantenimiento.
- **Plan de mantenimiento**: regla de recurrencia asociada a un equipo.

## Estado actual
Repositorio recién inicializado; solo documentación (`PLAN.md`, `CLAUDE.md`, `CONTEXT.md`). Siguiente paso: **Fase 0 — Base**.

## Preguntas abiertas
- Dominio definitivo (los QR impresos dependen de él).
- Login: magic link vs Google.
- Formato de etiquetas QR (A4 o térmica).
- Moneda y formato de fecha.
