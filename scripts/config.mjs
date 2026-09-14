/* =============================================================================
   Fajitex · Configuración de la ingesta (fase 2)

   Este archivo concentra TODAS las reglas de negocio que pueden cambiar sin
   tocar el código. Si mañana Shopify corrige una categoría o llega el archivo
   de costos de Luxury, se edita aquí y se vuelve a correr la ingesta.
   ========================================================================== */

/* Mapeo de categoría. La clave es el valor tal como viene en la columna
   `categoria` del export de Shopify; se compara normalizado (sin tildes,
   en minúsculas, sin espacios de más). */
export const MAPEO_CATEGORIA = {
  Fajas: [
    'Fajas', 'Faja Reloj de Arena', 'Fajas Indigo', 'Mediana Compresión',
    'Línea Luxury', 'Postquirúrgico', 'Body Sculptor'
  ],
  Short: ['Short', 'Short Luxury', 'Panty Moldeador'],
  Cinturilla: ['Chaleco y Cinturilla'],
  Brasier: ['Brasier', 'Bra Luxury']
};

/* Referencias mal etiquetadas en Shopify. Se excluyen del dashboard completo,
   no solo de Fajas: son líneas fuera del alcance B2C de esta versión.
   Excepción codificada a mano a propósito — no se espera a que Shopify lo
   corrija. El monto excluido se reporta en el informe de ingesta. */
export const REFERENCIAS_EXCLUIDAS = {
  '026950': 'Línea Masculina, llega etiquetada como Fajas en el export',
  '092961': 'Línea Médica, llega etiquetada como Fajas en el export'
};

/* Términos que mandan un SKU al bucket "Sin clasificar" en vez de a una
   categoría. NUNCA se descartan en silencio ni se les asume categoría.
   Se busca tanto en el valor de `categoria` de Shopify como en la
   descripción del archivo de costos (`Desc. item`). */
export const TERMINOS_SIN_CLASIFICAR = [
  { termino: 'trusa', motivo: 'Mapeo a categoría sin confirmar' }
];

/* -------------------------------------------------------------- Meta Ads -- */

/* Campañas B2B confirmadas. Se restan del total de inversión B2C. */
export const CAMPANAS_B2B = [
  'B2B | Sep 2026 | CP Formulario | Colombia | Pub Medico y distribuidores',
  'Mensajes a Wpp Yure | Sector Médico y Estético | Sep 2026'
];

/* Campañas cuya clasificación B2B/B2C no está confirmada. SÍ entran al total,
   pero el dashboard las marca junto al KPI de inversión. No se esconden. */
export const CAMPANAS_PENDIENTES = [
  'Mensajes a Wpp | Sector Médico y Estético | Sep 2026 Campaña'
];

/* Campañas ya nombradas por categoría: su gasto se asigna directo, sin
   prorratear. El resto del gasto se reparte a prorrata de unidades vendidas. */
export const CAMPANAS_POR_CATEGORIA = {
  '🟢ABO_COL_PRO_(Winners)_Shorts_26': 'Short',
  '🟢CBO_COL_PRO_SHORTS': 'Short'
};

/* ------------------------------------------------------------ SKU ↔ costo -- */

/* Cómo sacar referencia / color / talla de un SKU de Shopify para cruzarlo
   con el archivo de costos.
   OJO: este es el punto más frágil del cruce. El default asume que la
   referencia es el primer grupo de 6 dígitos del SKU y que color y talla, si
   vienen, van separados por "-" o "/". Si el formato real es otro, se ajusta
   aquí y la ingesta reporta cuántos SKU quedaron sin referencia legible. */
export const SKU = {
  referencia: /(\d{6})/,
  separador: /[-_/|]/,
  /* Posición de color y talla en los segmentos después de la referencia.
     null = el SKU no los trae y el cruce caerá al promedio por referencia. */
  posicionColor: 1,
  posicionTalla: 2
};

/* Referencias que empiezan por estos dígitos son línea Luxury: hoy no están
   en el archivo de costos de la financiera. Sirve para que la nota de
   cobertura diga por qué falta, en vez de un genérico "sin costo". */
export const PREFIJOS_LUXURY = ['2', '5'];

/* --------------------------------------------------------------- Metas ---- */

/* Metas comerciales. Mientras no las entregue el área, quedan en null y el
   dashboard muestra el KPI sin semáforo de cumplimiento en vez de inventarlo. */
export const METAS = {
  ingresoNetoSemana: null,
  ingresoNetoMes: null,
  presupuestoPautaSemana: null,
  presupuestoPautaMes: null
};

export const CATEGORIAS = ['Fajas', 'Short', 'Cinturilla', 'Brasier'];
export const SIN_CLASIFICAR = 'Sin clasificar';
