/* =============================================================================
   Reglas de negocio de la ingesta: categorización, cruce SKU × costo y
   reparto de la inversión en pauta.
   ========================================================================== */

import { normalizar } from './csv.mjs';
import {
  MAPEO_CATEGORIA, REFERENCIAS_EXCLUIDAS, TERMINOS_SIN_CLASIFICAR,
  CAMPANAS_B2B, CAMPANAS_PENDIENTES, CAMPANAS_POR_CATEGORIA,
  SKU, PREFIJOS_LUXURY, CATEGORIAS, SIN_CLASIFICAR
} from '../config.mjs';

/* Índice invertido: valor normalizado de Shopify → categoría del dashboard. */
const INDICE_CATEGORIA = new Map();
for (const [categoria, valores] of Object.entries(MAPEO_CATEGORIA)) {
  valores.forEach(v => INDICE_CATEGORIA.set(normalizar(v), categoria));
}

/* ------------------------------------------------------------- SKU -------- */

export function partirSKU(sku) {
  const s = String(sku || '').trim();
  const m = s.match(SKU.referencia);
  const referencia = m ? m[1] : null;

  let color = null, talla = null;
  if (referencia) {
    const resto = s.slice(s.indexOf(referencia) + referencia.length);
    const partes = resto.split(SKU.separador).map(p => p.trim()).filter(Boolean);
    if (SKU.posicionColor != null) color = partes[SKU.posicionColor - 1] || null;
    if (SKU.posicionTalla != null) talla = partes[SKU.posicionTalla - 1] || null;
  }
  return { referencia, color, talla };
}

export function esLuxury(referencia) {
  return referencia != null && PREFIJOS_LUXURY.includes(String(referencia)[0]);
}

/* ------------------------------------------------------ categorización ---- */

/* Devuelve { bucket, motivo }. `bucket` es una de las 4 categorías,
   SIN_CLASIFICAR, o null cuando la referencia está excluida del dashboard.
   Nunca descarta en silencio: todo caso raro cae en SIN_CLASIFICAR. */
export function clasificar({ categoria, referencia, descripcion }) {
  if (referencia && REFERENCIAS_EXCLUIDAS[referencia]) {
    return { bucket: null, motivo: REFERENCIAS_EXCLUIDAS[referencia], excluida: true };
  }

  const texto = normalizar([categoria, descripcion].filter(Boolean).join(' '));
  for (const { termino, motivo } of TERMINOS_SIN_CLASIFICAR) {
    if (texto.includes(normalizar(termino))) {
      return { bucket: SIN_CLASIFICAR, motivo };
    }
  }

  const directa = INDICE_CATEGORIA.get(normalizar(categoria));
  if (directa) return { bucket: directa, motivo: null };

  return {
    bucket: SIN_CLASIFICAR,
    motivo: categoria
      ? `Valor "${categoria}" sin mapeo en config.mjs`
      : 'Fila sin categoría en el export de Shopify'
  };
}

/* ------------------------------------------------------- costos por SKU --- */

/* Tres niveles de agregación, de más específico a más general. */
export function indexarCostos(filas) {
  const exacto = new Map();        // referencia|color|talla
  const porTalla = new Map();      // referencia|talla
  const porReferencia = new Map(); // referencia
  const descripciones = new Map(); // referencia → Desc. item

  const acumular = (mapa, clave, costo) => {
    if (!mapa.has(clave)) mapa.set(clave, { suma: 0, n: 0 });
    const a = mapa.get(clave); a.suma += costo; a.n++;
  };

  for (const f of filas) {
    if (f.costo == null || !f.referencia) continue;
    const ref = String(f.referencia).trim();
    const color = normalizar(f.color), talla = normalizar(f.talla);
    acumular(exacto, `${ref}|${color}|${talla}`, f.costo);
    acumular(porTalla, `${ref}|${talla}`, f.costo);
    acumular(porReferencia, ref, f.costo);
    if (f.descripcion && !descripciones.has(ref)) descripciones.set(ref, f.descripcion);
  }

  const promediar = mapa => new Map([...mapa].map(([k, v]) => [k, v.suma / v.n]));
  return {
    exacto: promediar(exacto),
    porTalla: promediar(porTalla),
    porReferencia: promediar(porReferencia),
    descripciones
  };
}

/* Busca en cascada. Devuelve null si no hay ninguna coincidencia: esa unidad
   queda fuera del promedio ponderado, nunca se le inventa un costo. */
export function buscarCosto(indice, { referencia, color, talla }) {
  if (!referencia) return null;
  const ref = String(referencia).trim();
  const c = normalizar(color), t = normalizar(talla);

  let v = indice.exacto.get(`${ref}|${c}|${t}`);
  if (v != null) return { costo: v, nivel: 1, detalle: 'referencia + color + talla' };

  v = indice.porTalla.get(`${ref}|${t}`);
  if (v != null) return { costo: v, nivel: 2, detalle: 'promedio de referencia + talla' };

  v = indice.porReferencia.get(ref);
  if (v != null) return { costo: v, nivel: 3, detalle: 'promedio general de la referencia' };

  return null;
}

/* --------------------------------------------------------------- pauta ---- */

const normalizarNombre = n => normalizar(n).replace(/\s+/g, ' ');
const SET_B2B = new Set(CAMPANAS_B2B.map(normalizarNombre));
const SET_PENDIENTES = new Set(CAMPANAS_PENDIENTES.map(normalizarNombre));
const MAPA_CATEGORIA_CAMPANA = new Map(
  Object.entries(CAMPANAS_POR_CATEGORIA).map(([n, c]) => [normalizarNombre(n), c])
);

export function clasificarCampana(nombre) {
  const n = normalizarNombre(nombre);
  if (SET_B2B.has(n)) return { tipo: 'b2b' };
  if (MAPA_CATEGORIA_CAMPANA.has(n)) {
    return { tipo: 'categoria', categoria: MAPA_CATEGORIA_CAMPANA.get(n), pendiente: SET_PENDIENTES.has(n) };
  }
  return { tipo: 'general', pendiente: SET_PENDIENTES.has(n) };
}

/* Reparte la inversión entre las 4 categorías:
   - lo que ya viene nombrado por categoría se asigna directo;
   - el resto se prorratea a prorrata de unidades vendidas del periodo.
   Las unidades de "Sin clasificar" NO participan del prorrateo: repartir
   inversión sobre un bucket que no es una categoría inflaría su costo de
   pauta y ensuciaría las 4 categorías reales. */
export function repartirPauta({ gastoDirecto, gastoGeneral, unidadesPorCategoria }) {
  const totalUnidades = CATEGORIAS.reduce((a, c) => a + (unidadesPorCategoria[c] || 0), 0);
  const reparto = {};

  for (const c of CATEGORIAS) {
    const unidades = unidadesPorCategoria[c] || 0;
    const prorrateado = totalUnidades > 0 ? gastoGeneral * (unidades / totalUnidades) : 0;
    const directo = gastoDirecto[c] || 0;
    reparto[c] = {
      directo,
      prorrateado,
      total: directo + prorrateado,
      unidades,
      costoUnitarioPauta: unidades > 0 ? (directo + prorrateado) / unidades : null
    };
  }
  return { reparto, totalUnidades, sinProrratear: totalUnidades === 0 ? gastoGeneral : 0 };
}

/* Reparte el gasto de una fila que cubre un rango de fechas entre los días
   que caen dentro de una ventana. Asume gasto diario uniforme dentro del
   rango reportado — es la única repartición posible con estas columnas. */
export function gastoEnVentana({ desde, hasta, gasto }, ventanaDesde, ventanaHasta) {
  if (gasto == null) return 0;
  const a = new Date(desde + 'T00:00:00Z'), b = new Date(hasta + 'T00:00:00Z');
  const va = new Date(ventanaDesde + 'T00:00:00Z'), vb = new Date(ventanaHasta + 'T00:00:00Z');

  const totalDias = Math.floor((b - a) / 86400000) + 1;
  if (totalDias <= 0) return 0;

  const ini = a > va ? a : va, fin = b < vb ? b : vb;
  const dias = Math.floor((fin - ini) / 86400000) + 1;
  if (dias <= 0) return 0;

  return gasto * (dias / totalDias);
}
