/* =============================================================================
   Fajitex · Módulo PAUTA PAGA → Meta
   Cifras entregadas por la coordinación el 2026-11-09 (base: export de
   conjuntos de anuncios de Meta). NO lo genera scripts/ingesta.mjs: es un
   archivo aparte para que la ingesta no lo sobrescriba.

   Regla de este archivo: donde no hay dato real va `null`, y la vista escribe
   "[completar con dato real]". Nunca se rellena con una estimación.
   ========================================================================== */

window.FAJITEX_PAUTA_META = {
  meta: {
    modulo: 'Pauta paga · Meta',
    actualizado: '2026-11-09',
    fuente: 'Export de conjuntos de anuncios (Meta)',
    textoPendiente: '[completar con dato real]'
  },

  /* Semáforo del módulo: CPA como % del ticket. */
  umbralCpaTicket: { verde: 0.08, amarillo: 0.12 },

  /* ------------------------------------------- 1. inversión mensual ------ */
  mensual: {
    meses: [
      { mes: 'Ene', v2025: null, v2026: 15984516 },
      { mes: 'Feb', v2025: null, v2026: 11835958 },
      { mes: 'Mar', v2025: null, v2026: 10328995 },
      { mes: 'Abr', v2025: null, v2026:  8010146 },
      { mes: 'May', v2025: null, v2026: 10206426 },
      { mes: 'Jun', v2025: null, v2026: 13243075 },
      { mes: 'Jul', v2025: null, v2026: 13533089 },
      { mes: 'Ago', v2025: null, v2026: 13812049 },
      { mes: 'Sep', v2025: 13067046, v2026: 16847214 },
      { mes: 'Oct', v2025: 18727794, v2026: 15970230 }
    ],
    totales: { v2025: 151714577, v2026: 129771698, variacion: -0.145 },
    variacionOctubre: -0.147,
    notas: [
      'Sept 2026: diferencia de $458.050 entre export de campaña ($16.389.164) y de conjuntos ($16.847.214), por confirmar. La inversión mensual usa el de conjuntos; el ROAS y el CPA de septiembre mantienen el de campaña (ROAS 6,01x, CPA $38.292).',
      'Sept 2025: la suma por objetivo da $13.068.046, $1.000 por encima del total mensual cargado ($13.067.046). Por confirmar.',
      'Ene–Ago 2025 no está cargado en este repositorio, así que esos meses quedan vacíos. El total Ene–Oct 2025 es el declarado por la coordinación y no se puede verificar contra los meses.'
    ]
  },

  /* ------------------------------------------- 2. inversión por objetivo -- */
  objetivos: {
    periodos: ['Sep 2025', 'Oct 2025', 'Sep 2026', 'Oct 2026'],
    filas: [
      { objetivo: 'Compras',             valores: [7524305, 9591376, 12405467, 12721742] },
      { objetivo: 'Mensajes WhatsApp',   valores: [4834804, 6924129,  3459047,  1634973] },
      { objetivo: 'Leads B2B',           valores: [      0, 1432970,   867613,  1440704] },
      { objetivo: 'Alcance/video/otros', valores: [ 708937,  779319,   115087,   172811] }
    ],
    notas: [
      'En 2025 el indicador de Leads B2B era "leadgen.other".',
      'Sep 2026 incluye además $36.281 de leadgen.other y $30.333 de clics, ya sumados en "Alcance/video/otros" según corresponde.'
    ]
  },

  /* ------------------------------------------- 3. resultados por objetivo - */
  resultados: {
    periodos: ['Sep 2025', 'Oct 2025', 'Sep 2026', 'Oct 2026'],
    filas: [
      { metrica: 'Compras',                 valores: [  492,   541,   434,   442], formato: 'entero' },
      { metrica: 'CPA compras',             valores: [15293, 17729, 28584, 28782], formato: 'pesos' },
      { metrica: 'Conversaciones WhatsApp', valores: [ 1832,  1993,  3320,  2031], formato: 'entero' },
      { metrica: 'Costo por conversación',  valores: [ 2639,  3474,  1042,   805], formato: 'pesos' },
      { metrica: 'Leads B2B',               valores: [ null,    65,   174,   298], formato: 'entero' },
      { metrica: 'Costo por lead B2B',      valores: [ null, 22046,  4986,  4835], formato: 'pesos' }
    ],
    variacionOctubre: [
      { etiqueta: 'Compras',              valor: -0.183, direccion: 'mayorMejor' },
      { etiqueta: 'CPA',                  valor:  0.623, direccion: 'menorMejor' },
      { etiqueta: 'Inversión en compras', valor:  0.326, direccion: 'neutro' }
    ],
    nota: 'Compras = resultados de conjuntos optimizados a compra; no incluye compras atribuidas a otros objetivos.'
  },

  /* ------------------------------------------- 4. ROAS octubre ----------- */
  roasOctubre: {
    roas: null, valorConversion: null, comprasTotales: null, ticket: null, cpaPctTicket: null,
    nota: 'Se llenan cuando llegue el export a nivel campaña de octubre.'
  },

  /* ------------------------------------------- 5. octubre por categoría -- */
  categoriasOctubre: {
    totalMes: 15970230,
    tipoTicket: 'estimado con ticket de septiembre (Shopify); actualizar con octubre',
    filas: [
      { categoria: 'Short',       linea: 'B2C', inversion: 7463602, resultados: 182, tipoResultado: 'compras',
        gastoCompras: 6772019, cpa: 37209, ticket: 125000, cpaPctTicket: 0.298 },
      { categoria: 'Fajas',       linea: 'B2C', inversion: 5662296, resultados: 243, tipoResultado: 'compras',
        gastoCompras: 5618600, cpa: 23123, ticket: 220000, cpaPctTicket: 0.105 },
      { categoria: 'Cinturilla',  linea: 'B2C', inversion:  357760, resultados:  17, tipoResultado: 'compras',
        gastoCompras: 331123, cpa: 19478, ticket: null, cpaPctTicket: null },
      { categoria: 'Luxury (fajas)', linea: 'B2C', inversion: 103866, resultados: null, tipoResultado: null,
        gastoCompras: null, cpa: null, ticket: null, cpaPctTicket: null },
      { categoria: 'B2B leads (Marca Blanca + Distribuidores)', linea: 'B2B', inversion: 1440704,
        resultados: 298, tipoResultado: 'leads', gastoCompras: null, cpa: 4835, ticket: null,
        cpaPctTicket: null, noAplicaTicket: true },
      { categoria: 'WhatsApp genérico / otro', linea: 'B2C', inversion: 942002, resultados: null,
        tipoResultado: null, gastoCompras: null, cpa: null, ticket: null, cpaPctTicket: null }
    ],
    nota: 'CPA calculado solo sobre el gasto de los conjuntos de compra de cada categoría (Short $6.772.019, Fajas $5.618.600, Cinturilla $331.123), no sobre la inversión total de la categoría.'
  },

  /* ------------------------------------------- 6. conjuntos de octubre --- */
  conjuntos: {
    totalEsperado: 31,
    fuentePendiente: true,
    nota: 'El CSV de conjuntos de octubre no llegó con este encargo. Se cargaron los 10 conjuntos entregados en el texto; faltan 21 filas. El objetivo y la categoría de estos 10 se dedujeron del nombre y del tipo de resultado, no de una columna del export.',
    filas: [
      { nombre: '19/03_RET_Shorts',                              estado: null,             categoria: 'Short',      objetivo: 'Compras',  resultados: 87,   tipoResultado: 'compras',       inversion: 3133816 },
      { nombre: '19/03_RET_Fajas_A+',                            estado: 'not_delivering', categoria: 'Fajas',      objetivo: 'Compras',  resultados: 64,   tipoResultado: 'compras',       inversion: 1842979 },
      { nombre: '29/07_SHORTS_ANGULO_TRANSFORMACION-2 NC',       estado: null,             categoria: 'Short',      objetivo: 'Compras',  resultados: 33,   tipoResultado: 'compras',       inversion: 1509913 },
      { nombre: '22/09_FAJAS_ANGULO_VILLANO_OTRAS_FAJAS-2 NC',   estado: null,             categoria: 'Fajas',      objetivo: 'Compras',  resultados: 39,   tipoResultado: 'compras',       inversion: 1480500 },
      { nombre: '21/08_FAJAS_ANGULO_TRANSFORMACION',             estado: null,             categoria: 'Fajas',      objetivo: 'Compras',  resultados: 25,   tipoResultado: 'compras',       inversion: 1255056 },
      { nombre: 'Marca Blanca CP Sep 2026',                      estado: null,             categoria: 'B2B',        objetivo: 'Leads',    resultados: 241,  tipoResultado: 'leads',         inversion: 1106117 },
      { nombre: '26/12_RMK_Shorts_A+',                           estado: null,             categoria: 'Short',      objetivo: 'Compras',  resultados: 19,   tipoResultado: 'compras',       inversion:  840983 },
      { nombre: 'Shorts (mensajes)',                             estado: null,             categoria: 'Short',      objetivo: 'Mensajes', resultados: 554,  tipoResultado: 'conversaciones', inversion: 619693 },
      { nombre: '28/07_Broad_WA_Statics_01',                     estado: null,             categoria: 'WhatsApp',   objetivo: 'Mensajes', resultados: 1032, tipoResultado: 'conversaciones', inversion: 480529 },
      { nombre: '21/08_FAJAS_ANGULO_VILLANO_OTRAS_FAJAS',        estado: null,             categoria: 'Fajas',      objetivo: 'Compras',  resultados: 90,   tipoResultado: 'compras',       inversion:  343461 }
    ]
  },

  /* ------------------------------------------- 7. hallazgos -------------- */
  hallazgos: [
    'La mezcla de inversión se movió de mensajes (37% → 10%) a compras (51% → 80%) frente a oct 2025.',
    'Con 33% más de inversión en compras salen 18% menos compras (CPA +62%).',
    'Short concentra 53% del gasto de compras con CPA 61% mayor que Fajas.',
    'La retargeting 19/03_RET_Shorts usa 20% del gasto con una ventana de atribución más amplia que el resto.'
  ]
};
