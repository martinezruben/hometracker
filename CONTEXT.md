# CONTEXT.md

Contexto de producto y decisiones de HomeTracker. Fuente de verdad para el "por qué". El "cómo/cuándo" está en `PLAN.md`; las reglas de código en `CLAUDE.md`.

## Visión
Un solo lugar para que una familia lleve todo lo del hogar: qué hay en cada caja, cuándo toca mantener cada equipo, qué falta comprar, qué papeles y contratos existen y a quién llamar.

## Usuarios
- Varias personas por hogar (pareja/familia), inicialmente en **iPhone** (Android compatible).
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
- Multiusuario con datos aislados por hogar (filtro obligatorio por `household_id` en servidor; MySQL no tiene RLS).
- Instalable como PWA; notificaciones vía Web Push.
- Costo bajo (planes gratuitos al inicio).

## Decisiones (resumen)
| Decisión | Valor |
|---|---|
| Plataforma inicial | **iPhone** (iOS 16.4+, PWA instalada); Android compatible |
| Login | OTP de 6 dígitos por correo (evita el salto Safari → PWA) |
| Dominio | Pendiente; `NEXT_PUBLIC_APP_URL` |
| Frontend | Next.js + TypeScript + Tailwind |
| Base de datos | MySQL 8 + Drizzle ORM (decisión del usuario: no Supabase) |
| Backend | Next.js Route Handlers/Server Actions; auth propia OTP; archivos en S3 compatible |
| Offline | Service worker + IndexedDB; cola de cambios; LWW por `updated_at` |
| Push | Web Push (VAPID) |
| Hosting | Vercel / Cloudflare Pages |
| QR | URL `https://<dominio>/b/<uuid>`, requiere login |

## Notas sobre iOS (aplican desde ya)
- Push solo con PWA instalada en pantalla de inicio, iOS 16.4+, permiso pedido con gesto del usuario.
- Escanear el QR con la cámara nativa abre Safari, no la PWA; por eso la vista de caja es una ruta web normal con login.
- Sin sync en segundo plano ni BarcodeDetector en Safari; la cola offline se vacía al abrir la app y en eventos `online`.
- Safari y la PWA instalada no comparten sesión: por eso el login es por código OTP, no por enlace.
- Alternativa de respaldo: Capacitor o recordatorios por correo.

## Glosario
- **Hogar (household)**: unidad que agrupa miembros y datos.
- **Caja (box)**: contenedor físico con QR y contenido documentado.
- **Equipo (appliance)**: electrodoméstico o sistema del hogar con mantenimiento.
- **Plan de mantenimiento**: regla de recurrencia asociada a un equipo.

## Estado actual
**Fases 0 a 4 completas** y de la **Fase 5** ya están la búsqueda global, la exportación de datos (JSON, solo administradores) y el refresco automático entre miembros (cada minuto con la app visible). CI verde en GitHub Actions contra MySQL 8. Pendiente: dashboard, QR por equipo, manual en PDF, proveedor en el registro de mantenimiento, Playwright dentro del repo, auditoría de accesibilidad y rendimiento (Lighthouse), limpieza programada de archivos de borrados lógicos. **Sin validar en hardware real**: push en iPhone y driver S3; falta elegir hosting, proveedor de MySQL/correo/S3 y dominio.

## Preguntas abiertas
- Proveedor de MySQL, de correo (SMTP) y de almacenamiento S3.
- Dominio definitivo (lo dará el usuario; los QR impresos dependen de él).
- Formato de etiquetas QR (A4 o térmica).
- Moneda y formato de fecha.
