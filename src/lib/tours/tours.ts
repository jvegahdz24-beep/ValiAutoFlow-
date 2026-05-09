import type { TourDefinition } from './types'

/**
 * All available guided tours.
 * Tours are ordered by importance and map to specific views.
 */
export const TOURS: TourDefinition[] = [
  // ============================================================
  // WELCOME TOUR - First-time experience
  // ============================================================
  {
    id: 'welcome',
    name: 'Bienvenido a ValiAutoFlow',
    description: 'Conoce las funcionalidades principales del sistema',
    view: null,
    autoStartForDemo: true,
    steps: [
      {
        id: 'welcome-start',
        target: '[data-tour="sidebar-logo"]',
        title: 'Bienvenido a ValiAutoFlow',
        content: 'Tu Sistema Operativo Comercial Cognitivo. Aqui gestionas leads, conversaciones, campanas y agentes de IA desde un solo lugar. Te guiaremos por las funciones principales.',
        position: 'right',
      },
      {
        id: 'welcome-sidebar',
        target: '[data-tour="sidebar-nav"]',
        title: 'Menu de Navegacion',
        content: 'Usa el sidebar para moverte entre todas las secciones del sistema: Dashboard, Conversaciones, Leads, Pipeline, Agentes, Marketing y mas. Cada seccion tiene datos y herramientas especificas.',
        position: 'right',
      },
      {
        id: 'welcome-dashboard',
        target: '[data-tour="dashboard-view"]',
        title: 'Dashboard Principal',
        content: 'Aqui ves el resumen de tu operacion comercial: leads activos, conversaciones en progreso, ingresos estimados y metricas clave. Todo en tiempo real.',
        position: 'bottom',
        switchToView: 'dashboard',
      },
      {
        id: 'welcome-notifications',
        target: '[data-tour="notification-center"]',
        title: 'Centro de Notificaciones',
        content: 'Recibe alertas de leads calientes, recordatorios de citas, reportes de campanas y detecciones de deriva cognitiva. Las notificaciones te mantienen informado de lo importante.',
        position: 'bottom',
      },
      {
        id: 'welcome-status',
        target: '[data-tour="system-status"]',
        title: 'Estado del Sistema',
        content: 'El indicador verde confirma que tus agentes cognitivos estan activos y procesando conversaciones. Siempre puedes verificar el estado desde aqui.',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // DASHBOARD TOUR
  // ============================================================
  {
    id: 'dashboard',
    name: 'Tour del Dashboard',
    description: 'Explora las metricas y KPIs de tu operacion',
    view: 'dashboard',
    autoStartForDemo: false,
    steps: [
      {
        id: 'dash-overview',
        target: '[data-tour="dashboard-view"]',
        title: 'Vista General del Dashboard',
        content: 'Este es tu centro de comando. Aqui ves en tiempo real cuantos leads tienes, como van tus conversaciones, el valor de tu pipeline y la actividad de tus agentes de IA.',
        position: 'bottom',
        switchToView: 'dashboard',
      },
      {
        id: 'dash-stats',
        target: '[data-tour="dashboard-stats"]',
        title: 'Estadisticas Clave',
        content: 'Las tarjetas superiores muestran tus KPIs principales: leads totales, leads calientes, conversaciones activas e ingresos estimados. Los numeros se actualizan con cada interaccion.',
        position: 'bottom',
      },
      {
        id: 'dash-charts',
        target: '[data-tour="dashboard-charts"]',
        title: 'Graficos y Tendencias',
        content: 'Los graficos muestran tendencias de leads, conversion por etapa, distribucion de temperatura y rendimiento de agentes. Usa estos insights para tomar decisiones comerciales.',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // CONVERSATIONS TOUR
  // ============================================================
  {
    id: 'conversations',
    name: 'Tour de Conversaciones',
    description: 'Aprende a gestionar las conversaciones con leads',
    view: 'conversations',
    autoStartForDemo: false,
    steps: [
      {
        id: 'conv-list',
        target: '[data-tour="conversations-list"]',
        title: 'Lista de Conversaciones',
        content: 'Aqui ves todas las conversaciones activas y pasadas con tus leads. Cada conversacion muestra el nombre del contacto, la etapa actual, el canal y un preview del ultimo mensaje.',
        position: 'right',
        switchToView: 'conversations',
      },
      {
        id: 'conv-detail',
        target: '[data-tour="conversation-detail"]',
        title: 'Detalle de Conversacion',
        content: 'Al seleccionar una conversacion, ves el historial completo de mensajes. Los mensajes del lead aparecen a la izquierda, las respuestas de JHON (tu agente de IA) a la derecha. Puedes tomar el control en cualquier momento.',
        position: 'left',
      },
      {
        id: 'conv-stage',
        target: '[data-tour="conversation-stage"]',
        title: 'Etapa Cognitiva',
        content: 'Cada conversacion tiene una etapa detectada por el motor cognitivo: Exploracion, Interes, Intencion o Cierre. JHON adapta automaticamente su estrategia segun la etapa.',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // LEADS TOUR
  // ============================================================
  {
    id: 'leads',
    name: 'Tour de Leads',
    description: 'Descubre como gestionar y calificar tus leads',
    view: 'leads',
    autoStartForDemo: false,
    steps: [
      {
        id: 'leads-table',
        target: '[data-tour="leads-table"]',
        title: 'Tabla de Leads',
        content: 'Aqui ves todos tus leads con su informacion clave: nombre, temperatura (cold/warm/hot), arquetipo cognitivo, score y estado. Usa los filtros para encontrar leads especificos.',
        position: 'bottom',
        switchToView: 'leads',
      },
      {
        id: 'leads-temperature',
        target: '[data-tour="leads-temperature"]',
        title: 'Temperatura del Lead',
        content: 'La temperatura indica la intencion de compra: Cold (recien llegado), Warm (mostrando interes) o Hot (listo para cerrar). JHON detecta automaticamente la temperatura segun el comportamiento.',
        position: 'bottom',
      },
      {
        id: 'leads-archetype',
        target: '[data-tour="leads-archetype"]',
        title: 'Arquetipo Cognitivo',
        content: 'Cada lead tiene un arquetipo que define como JHON debe comunicarse: Decisivo (directo), Cauteloso (necesita confianza), Analitico (quiere datos), Impulsivo (decision rapida) o Social (busca conexion).',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // PIPELINE TOUR
  // ============================================================
  {
    id: 'pipeline',
    name: 'Tour del Pipeline',
    description: 'Visualiza tu embudo de ventas',
    view: 'pipeline',
    autoStartForDemo: false,
    steps: [
      {
        id: 'pipe-board',
        target: '[data-tour="pipeline-board"]',
        title: 'Tablero de Pipeline',
        content: 'Tu pipeline visual muestra los deals en cada etapa. Los deals se mueven de izquierda a derecha a medida que avanzan en el proceso de venta. El valor total del pipeline se calcula automaticamente.',
        position: 'bottom',
        switchToView: 'pipeline',
      },
      {
        id: 'pipe-deal',
        target: '[data-tour="pipeline-deal"]',
        title: 'Tarjeta de Deal',
        content: 'Cada deal muestra el nombre del lead, el valor estimado y la probabilidad de cierre. Haz clic para ver los detalles completos y el historial de la negociacion.',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // AGENTS TOUR (7 Carnales)
  // ============================================================
  {
    id: 'agents',
    name: 'Tour de Agentes (7 Carnales)',
    description: 'Conoce a los 7 agentes cognitivos del sistema',
    view: 'agents',
    autoStartForDemo: false,
    steps: [
      {
        id: 'agent-list',
        target: '[data-tour="agents-list"]',
        title: 'Los 7 Carnales',
        content: 'ValiAutoFlow opera con 7 agentes cognitivos especializados, cada uno con una funcion critica en el proceso comercial. Juntos forman un sistema de ventas autonomo con validacion humana.',
        position: 'bottom',
        switchToView: 'agents',
      },
      {
        id: 'agent-jhon',
        target: '[data-tour="agent-jhon"]',
        title: 'JHON - Closer Cognitivo',
        content: 'El agente principal. JHON maneja las conversaciones de ventas con personalidad restringida: nunca presiona, siempre confirma, y cierra con empatia. Aplica psicologia comercial basada en el arquetipo del lead.',
        position: 'bottom',
      },
      {
        id: 'agent-orchestrator',
        target: '[data-tour="agent-orchestrator"]',
        title: 'ORCHESTRATOR - Router Maestro',
        content: 'Dirige cada conversacion al agente correcto segun la intencion detectada. Si un lead pregunta por precios, lo manda a JHON. Si necesita seguimiento, al FOLLOWUP. Es el cerebro de la operacion.',
        position: 'bottom',
      },
      {
        id: 'agent-others',
        target: '[data-tour="agents-list"]',
        title: 'Memory, FollowUp, Observability, Routing, ToolOS',
        content: 'Los otros 5 agentes completan el ecosistema: MEMORY gestiona contexto historico, FOLLOWUP ejecuta secuencias automaticas, OBSERVABILITY vigila calidad y detecta alucinaciones, ROUTING asigna leads, y TOOLOS ejecuta acciones (agendar, enviar, consultar).',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // MARKETING TOUR
  // ============================================================
  {
    id: 'marketing',
    name: 'Tour de Marketing',
    description: 'Explora las campanas y segmentacion',
    view: 'marketing',
    autoStartForDemo: false,
    steps: [
      {
        id: 'mkt-overview',
        target: '[data-tour="marketing-view"]',
        title: 'Centro de Marketing',
        content: 'Aqui gestionas tus campanas de WhatsApp, segmentas tu audiencia y mides resultados. MARK, tu agente de marketing, puede sugerir campanas basadas en patrones de comportamiento.',
        position: 'bottom',
        switchToView: 'marketing',
      },
      {
        id: 'mkt-campaigns',
        target: '[data-tour="marketing-campaigns"]',
        title: 'Campanas Activas',
        content: 'Ves tus campanas en curso con estadisticas en tiempo real: enviados, entregados, abiertos, clickeados y conversiones. El ROI se calcula automaticamente.',
        position: 'bottom',
      },
      {
        id: 'mkt-segments',
        target: '[data-tour="marketing-segments"]',
        title: 'Segmentos',
        content: 'Crea segmentos dinamicos basados en tags, etapa, score o tiempo sin interaccion. Los segmentos se actualizan automaticamente cuando los leads cambian de estado.',
        position: 'bottom',
      },
    ],
  },

  // ============================================================
  // CONFIG TOUR
  // ============================================================
  {
    id: 'config',
    name: 'Tour de Configuracion',
    description: 'Personaliza el sistema para tu negocio',
    view: 'config',
    autoStartForDemo: false,
    steps: [
      {
        id: 'cfg-wizard',
        target: '[data-tour="config-view"]',
        title: 'ConfigWizard',
        content: 'Aqui configuras todo el sistema para tu negocio: tipo de negocio, horarios, productos, formula de leads y politicas de ventas. La configuracion afecta como JHON se comporta con tus clientes.',
        position: 'bottom',
        switchToView: 'config',
      },
      {
        id: 'cfg-policies',
        target: '[data-tour="config-policies"]',
        title: 'Politicas de Ventas',
        content: 'Define reglas que JHON siempre respeta: no presionar, maximo 2 preguntas por turno, confirmar antes de agendar, no mostrar precios temprano. Estas reglas son inquebrantables.',
        position: 'bottom',
      },
    ],
  },
]

/**
 * Get a tour by ID
 */
export function getTour(tourId: string): TourDefinition | undefined {
  return TOURS.find(t => t.id === tourId)
}

/**
 * Get tours available for a specific view
 */
export function getToursForView(view: ViewType): TourDefinition[] {
  return TOURS.filter(t => t.view === view || t.view === null)
}

/**
 * Get tours that should auto-start for demo users
 */
export function getAutoStartTours(): TourDefinition[] {
  return TOURS.filter(t => t.autoStartForDemo)
}
