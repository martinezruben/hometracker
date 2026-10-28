# DESIGN.md — Reglas de diseño de HomeTracker

Fuente: `docs/design/HomeTracker_iOS.pdf` (6 pantallas: Inicio, Cajas, Detalle de caja, Equipos, Listas, Recordatorios).
**Estas reglas son obligatorias para toda pantalla nueva o modificada.** Si algo no está cubierto aquí, se deriva del mismo lenguaje visual
(iOS, tarjetas blancas redondeadas sobre fondo degradado azul claro, azul real como color de acción) y se documenta en este archivo.

## 1. Principios
- Estilo **iOS**: grandes títulos en negrita, tarjetas blancas con radio generoso y sombra muy suave, controles redondos y táctiles.
- Una sola acción primaria por pantalla, en **azul real**. Acciones secundarias en azul de texto ("Ver todo", "+ Agregar").
- Estados siempre legibles con **color + texto** (nunca solo color): Vencido (rojo), Pronto (ámbar), Al día (verde).
- Mobile-first (390 px), respetar safe-areas, objetivos táctiles ≥ 44 px, contraste AA (la CI lo verifica con axe en claro y oscuro).

## 2. Tokens
| Token | Valor de referencia | Uso |
|---|---|---|
| Fondo de pantalla | degradado vertical `#dbe6fb → #f6f8fd` (arriba azul muy claro, abajo casi blanco) | `body` |
| Mini tarjeta | `#eef2fb` (oscuro `#1b2847`), radio 16 px | estadísticas y formularios dentro de una tarjeta (`bg-tile`) |
| Tarjeta | `#ffffff`, radio 20–24 px, sombra `0 4px 16px rgb(15 27 61 / .06)` | tarjetas y filas |
| Texto principal | azul marino `#0f1b3d` | títulos y datos |
| Texto secundario | gris azulado `#64708f` | subtítulos, metadatos |
| Primario | azul real `#1d4ed8` (degradado a `#2563eb`) | botón principal, pestaña central, enlaces, cantidades |
| Neutro oscuro | `#0f172a` | chip seleccionado, botón "+" flotante, botón de filtro |
| Vencido | texto `#b91c1c`, fondo `#fee2e2`, barra `#ef4444` | |
| Pronto | texto `#b45309`, fondo `#fef3c7`, barra `#f59e0b` | |
| Al día | texto `#047857`, fondo `#d1fae5`, barra `#10b981` | |
| Pasteles de ilustración | azul `#dbeafe`, naranja `#ffedd5`, verde `#d1fae5`, lila `#ede9fe` | portadas de caja, iconos de tipo |
| Radios | chips y pills completos; tarjetas 20–24 px; iconos 12–14 px | |
| Tipografía | sans redondeada de peso alto (Manrope/Plus Jakarta Sans); título grande 32 px/800; sección 20 px/800; cuerpo 15–16 px/600; metadato 13 px/500 | |
| Modo oscuro | mismo lenguaje con fondo `#0b1220`, tarjetas `#111a2e`, azul claro `#60a5fa` para acciones; conservar contraste AA | |

## 3. Componentes
- **Barra inferior flotante** (píldora blanca, sombra, margen lateral): 5 posiciones — Inicio, Cajas, **botón central circular azul con icono de escaneo QR (elevado, abre `/scan`)**, Equipos, Listas. La pestaña activa lleva una píldora azul claro detrás del icono y la etiqueta en azul. "Más/Ajustes" se abre desde el avatar de Inicio.
- **Cabecera de pantalla**: título grande a la izquierda, subtítulo con conteos ("23 cajas · 412 objetos"), a la derecha botón redondo azul "+" (crear) o avatares de miembros.
- **Buscador**: campo blanco redondeado con lupa; en Inicio con botón de filtros oscuro a la derecha.
- **Chips de filtro**: píldoras blancas; la seleccionada va en oscuro (`Todas`, `Garaje · 8`).
- **Banner de escaneo**: tarjeta azul con degradado, icono QR en cuadro translúcido, "Escanea una caja / Apunta al QR y ve qué hay dentro", chevron.
- **Fila con icono**: tile 44 px de color pastel con icono lineal, título en negrita, subtítulo gris, valor/estado a la derecha.
- **Estado con barra**: etiqueta de color ("En 2 días", "Vencido", "Al día") y mini barra de progreso del mismo color; en equipos, texto "cada 3 meses".
- **Tarjeta de caja** (rejilla de 2 columnas): panel pastel con ilustración de caja y pill "N.º 07", nombre en negrita, ubicación en gris, cantidad de objetos en azul a la derecha.
- **Detalle de caja**: hero pastel con ilustración y botones circulares flotantes (volver, cámara, más), puntos de carrusel de fotos; hoja blanca con esquinas superiores redondeadas; etiqueta "CAJA N.º 07" en azul, título, ubicación con pin, miniatura del QR, tres estadísticas (objetos, fotos, actualizada), botón azul "Imprimir etiqueta" a ancho completo, sección "Contenido" con "+ Agregar".
- **Equipos**: tres tarjetas de resumen (Vencidos / Pronto / Al día con punto de color y número grande); mes con enlace "Calendario"; tira semanal de píldoras con día seleccionado en azul y puntos de color bajo los días con mantenimientos; tarjetas de mantenimiento con icono, equipo, "tarea · lugar", chip de fecha y barra.
- **Listas**: control segmentado (Pendientes / Súper / Para vender) en píldora blanca con la activa en azul; tarjeta de resumen con anillo ("3/8", "Esta semana · 5 pendientes · 2 son para hoy") y botón de filtro; encabezados de grupo en mayúsculas pequeñas (HOY, ESTA SEMANA); filas con casilla circular, título, subtítulo (hora · categoría / 🔁 recurrencia / "2 de 4 pasos"), chip "Urgente" y avatar de la persona asignada; completadas en verde, tachadas, "Hecho por X"; botón flotante oscuro "+ Pendiente".
- **Inicio**: saludo ("Buenas noches, Rubén") con avatar degradado y campana con punto rojo; tarjeta **Salud del hogar** (arco 0–100, etiqueta "Muy bien", "3 tareas esta semana", ilustración isométrica de casa); accesos rápidos en píldoras (Cajas, Equipos, Documentos); sección "Próximos" con "Ver todo".
- **Recordatorios (onboarding de notificaciones)**: vista previa de notificación, campana en círculo blanco, título "Nunca olvides un mantenimiento", lista con interruptores (Mantenimientos · 3 días antes; Garantías y pagos · 30 y 7 días antes; Mis pendientes · el mismo día 8:00 a. m.; Resumen semanal · domingos por la noche), botón azul "Activar recordatorios" y enlace "Ahora no".

## 4. Datos que el diseño exige (no existen aún)
| Elemento del diseño | Requiere |
|---|---|
| "N.º 07" en cajas | número correlativo por hogar (`boxes.number`) |
| Color/ilustración por caja | `boxes.color` (azul, naranja, verde, lila) |
| Contenido con categoría y cantidad ("×6", "Eléctrico · con 2 baterías") | `box_items.quantity`, `box_items.category`, `box_items.notes` visible |
| "Actualizada hoy" | `boxes.updated_at` ya existe (actualizarlo al tocar contenido/fotos) |
| Filtros por ubicación con conteo | agrupación por `boxes.location` |
| Saludo y avatares | `users.name` (pedirlo en el alta) y color de avatar derivado del id |
| Salud del hogar (0–100) | función pura sobre mantenimientos vencidos/pronto, pendientes vencidos y garantías por vencer |
| Tira semanal y calendario | consulta de eventos por día (mantenimientos, pendientes, vencimientos) |
| "Urgente", hora y pasos en pendientes | `tasks.urgent`, `tasks.dueTime`, subtareas (`task_steps`) |
| Interruptores de recordatorios | tabla `notification_prefs` (por usuario y tipo) que consulta el cron |
| Resumen semanal | nuevo tipo de recordatorio (domingo por la noche) |

## 5. Implementación (estado)
- Tokens en `src/app/globals.css` (claro y oscuro): `bg-brand`, `card`, `text-link`, `text-muted`, estados `text-late|soon|ok` con `bg-*-bg` y `bg-*-bar`, pasteles `--tint-*`/`--on-tint-*`.
- Componentes: `src/components/ui/` (`Avatar`, `IconTile`, `PageHeader`, `Chip`, `StatusPill`/`StatusBar`) e iconos lineales en `src/components/icons.tsx`. Emojis no se usan como iconos en pantallas nuevas.
- `BottomNav` ya es la barra flotante con botón central de escaneo; Ajustes se abre desde el avatar de Inicio.
- Inicio ya sigue el diseño: saludo (`Greeting`, según la hora del dispositivo) con avatar y campana, buscador con filtros, `HealthCard` (puntaje `healthScore` de `src/lib/home/health.ts`: parte de 100 y resta por mantenimientos/pendientes/documentos vencidos, con tope por categoría), accesos rápidos y `UpcomingRow` (`/upcoming` lista todo). El nombre de la persona se pide al crear el hogar y se edita en Más.
- Cajas ya sigue el diseño: número correlativo por hogar (`boxes.number`, único y asignado con reintento si hay concurrencia), color pastel (`boxes.color`, editable), objetos con cantidad y categoría (`box_items.quantity/category`), `BoxCard` en rejilla, filtros por ubicación con conteo, banner de escaneo y detalle con portada/carrusel, QR, estadísticas y contenido. La caja se marca como actualizada al cambiar contenido o fotos.
- Las pantallas se van migrando una a una (ver Fase 6 de `PLAN.md`); mientras tanto heredan tarjetas, colores y tipografía por los tokens.

## 6. Cómo aplicarlo
1. Estas reglas viven en el código como tokens en `src/app/globals.css` y componentes en `src/components/ui/`; no usar colores sueltos.
2. Textos siempre en `src/lib/i18n/es.ts`.
3. Cada pantalla rediseñada debe seguir pasando axe (claro y oscuro) y las pruebas end-to-end.
4. Orden de trabajo en `PLAN.md`, Fase 6.
