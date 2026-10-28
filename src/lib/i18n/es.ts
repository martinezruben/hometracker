export const es = {
  app: {
    name: "HomeTracker",
    description: "Todo lo de tu hogar en un solo lugar",
  },
  nav: {
    home: "Inicio",
    boxes: "Cajas",
    appliances: "Equipos",
    more: "Más",
  },
  home: {
    title: "Inicio",
    welcome: "Bienvenido a tu hogar",
    nextMaintenance: "Próximos mantenimientos",
    nextMaintenanceEmpty: "Aún no hay mantenimientos programados.",
    recentBoxes: "Cajas recientes",
    recentBoxesEmpty: "Aún no has creado cajas.",
  },
  boxes: {
    title: "Cajas",
    empty: "Crea una caja, sube fotos de su contenido e imprime su QR.",
  },
  appliances: {
    title: "Equipos",
    empty: "Registra tus equipos y programa sus mantenimientos.",
  },
  more: {
    title: "Más",
    comingSoon: "Próximamente",
    items: ["Listas", "Pendientes", "Documentos", "Contactos", "Gastos"],
  },
  sync: {
    offline: "Sin conexión. Los cambios se guardarán al reconectar.",
  },
} as const;
