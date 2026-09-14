#!/usr/bin/env node
/* =============================================================================
   Fajitex · Ingesta de datos reales (fase 2)

   Lee los CSV que la coordinadora deja en data/entrada/ y genera
   data/dashboard-data.js, que es el archivo que carga el dashboard.

       node scripts/ingesta.mjs

   No llama a ninguna API: la carga es manual por ahora.

   Principio de todo el archivo: lo que no se puede calcular con las columnas
   disponibles se marca como no disponible y se explica por qué. Nunca se
   rellena con un supuesto.
   ========================================================================== */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsearCSV, aObjetos, columna, numero, detectarFormato, fecha, semanaISO, normalizar } from './lib/csv.mjs';
import {
  partirSKU, esLuxury, clasificar, indexarCostos, buscarCosto,
  clasificarCampana, repartirPauta, gastoEnVentana
} from './lib/reglas.mjs';
import { MAPEO_CATEGORIA, METAS, CATEGORIAS, SIN_CLASIFICAR, REFERENCIAS_EXCLUIDAS, ATIPICOS, MER, CAMPANAS_POR_CATEGORIA } from './config.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
/* El directorio de entrada y el de salida se pueden redirigir para poder
   probar el pipeline contra scripts/fixtures/ sin tocar los datos reales. */
const ENTRADA = resolve(RAIZ, process.env.FAJITEX_ENTRADA || 'data/entrada');
const SALIDA = resolve(RAIZ, process.env.FAJITEX_SALIDA || 'data/dashboard-data.js');

const avisos = [];
const aviso = (nivel, titulo, detalle) => avisos.push({ nivel, titulo, detalle });

/* ===================================================== 1. LEER ARCHIVOS === */

function leerEntrada(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const archivos = readdirSync(dir).filter(f => /\.(csv|tsv|txt)$/i.test(f));
  const encontrados = { ventas: [], meta: [], google: [], costos: [], desconocidos: [] };

  for (const nombre of archivos) {
    const filas = parsearCSV(readFileSync(join(dir, nombre), 'utf8'));
    if (!filas.length) continue;
    const cabecera = filas.map(f => f.map(normalizar).join('|')).slice(0, 8).join(' ');
    const tiene = (...t) => t.every(x => cabecera.includes(normalizar(x)));

    if (tiene('sku', 'unidades_vendidas'))                 encontrados.ventas.push({ nombre, filas });
    else if (tiene('nombre de la campana', 'importe gastado')) encontrados.meta.push({ nombre, filas });
    else if (tiene('valor de conv'))                       encontrados.google.push({ nombre, filas });
    else if (tiene('referencia', 'costo prom'))            encontrados.costos.push({ nombre, filas });
    else encontrados.desconocidos.push(nombre);
  }
  return encontrados;
}

/* Detecta el formato numérico mirando todas las celdas del archivo. */
function formatoDe(archivos, columnas) {
  const muestra = [];
  for (const { filas } of archivos) {
    /* Se exigen TODAS las columnas clave, igual que al cargar: con una sola,
       una fila de adorno como "Intervalo de fechas: ..." pasa por encabezado. */
    for (const o of aObjetos(filas, columnas)) {
      for (const v of Object.values(o)) if (muestra.length < 4000) muestra.push(v);
    }
  }
  return detectarFormato(muestra);
}

/* ================================================== 2. COSTOS POR SKU ==== */

function cargarCostos(archivos) {
  const filas = [];
  const fmt = formatoDe(archivos, ['Referencia']);
  for (const { filas: brutas } of archivos) {
    for (const o of aObjetos(brutas, ['Referencia'])) {
      filas.push({
        referencia: String(columna(o, 'Referencia') || '').trim(),
        talla: columna(o, 'Detalle ext. 2 (talla)', 'talla') || '',
        color: columna(o, 'Detalle ext. 1 (color)', 'color') || '',
        descripcion: columna(o, 'Desc. item', 'descripcion') || '',
        costo: numero(columna(o, 'Promedio de Costo prom. unit.', 'Costo prom. unit.', 'costo'), fmt)
      });
    }
  }
  return { filas, indice: indexarCostos(filas) };
}

/* ================================================== 3. VENTAS SHOPIFY ==== */

function cargarVentas(archivos, costos) {
  const lineas = [];
  const excluidas = { unidades: 0, ingresoBruto: 0, porReferencia: {} };
  let sinReferencia = 0, sinFecha = 0, sinUnidadesConIngreso = 0, vacias = 0;
  const fmt = formatoDe(archivos, ['sku', 'unidades_vendidas']);

  for (const { filas: brutas } of archivos) {
    for (const o of aObjetos(brutas, ['sku', 'unidades_vendidas'])) {
      const f = fecha(columna(o, 'fecha'));
      const sku = String(columna(o, 'sku') || '').trim();
      const unidades = numero(columna(o, 'unidades_vendidas'), fmt) || 0;
      const ingresoBruto = numero(columna(o, 'ingreso_bruto'), fmt) || 0;
      if (!f) { sinFecha++; continue; }

      /* Una fila sin unidades pero con ingreso es un ajuste o un cambio: su
         plata es real y no se puede tirar. Solo se descartan las filas
         completamente en cero. */
      if (unidades <= 0 && ingresoBruto === 0) { vacias++; continue; }
      if (unidades <= 0) sinUnidadesConIngreso++;

      const { referencia, color, talla } = partirSKU(sku);
      if (!referencia) sinReferencia++;

      const descripcion = referencia ? costos.indice.descripciones.get(referencia) : null;
      const clase = clasificar({
        categoria: columna(o, 'categoria'), referencia, descripcion
      });

      if (clase.excluida) {
        excluidas.unidades += unidades;
        excluidas.ingresoBruto += ingresoBruto;
        excluidas.porReferencia[referencia] =
          (excluidas.porReferencia[referencia] || 0) + unidades;
        continue;
      }

      lineas.push({
        fecha: f, semana: semanaISO(f), sku, referencia, color, talla,
        bucket: clase.bucket, motivo: clase.motivo,
        unidades, ingresoBruto,
        /* Shopify exporta el descuento en negativo. Se guarda siempre como
           magnitud positiva para que ingreso neto = bruto − descuento. */
        descuento: Math.abs(numero(columna(o, 'descuento_aplicado'), fmt) || 0),
        codigo: String(columna(o, 'codigo_descuento') || '').trim(),
        costo: buscarCosto(costos.indice, { referencia, color, talla })
      });
    }
  }

  if (sinUnidadesConIngreso) aviso('medio', 'Filas con ingreso y cero unidades',
    `${sinUnidadesConIngreso} líneas traen ingreso pero 0 unidades (ajustes o cambios). Su ingreso sí entra a los totales; sus unidades, no. Por eso el ingreso por unidad de esas filas no cuadra.`);
  if (sinFecha) aviso('medio', 'Filas sin fecha legible', `${sinFecha} líneas del export de Shopify se descartaron porque la columna fecha no se pudo interpretar.`);
  if (sinReferencia) aviso('alto', 'SKU sin referencia legible', `${sinReferencia} líneas no dejaron extraer una referencia de 6 dígitos del SKU. Esas unidades cuentan en el total pero no cruzan con costos. Ajusta el patrón en scripts/config.mjs → SKU.referencia.`);
  return { lineas, excluidas };
}

/* ======================================================= 4. PAUTA ======== */

function cargarMeta(archivos) {
  const campanas = [];
  const fmt = formatoDe(archivos, ['Nombre de la campaña']);

  for (const { filas: brutas } of archivos) {
    for (const o of aObjetos(brutas, ['Nombre de la campaña'])) {
      const nombre = String(columna(o, 'Nombre de la campaña') || '').trim();
      if (!nombre) continue;
      const desde = fecha(columna(o, 'Inicio del informe'));
      const hasta = fecha(columna(o, 'Fin del informe')) || desde;
      const gasto = numero(columna(o, 'Importe gastado (COP)', 'Importe gastado'), fmt);
      if (!desde || gasto == null) continue;

      campanas.push({
        nombre, desde, hasta, gasto,
        clics: numero(columna(o, 'Clics (todos)'), fmt),
        impresiones: numero(columna(o, 'Impresiones'), fmt),
        ctr: numero(columna(o, 'CTR (todos)'), fmt),
        compras: numero(columna(o, 'Compras'), fmt),
        roasPlataforma: numero(columna(o, 'ROAS de compras'), fmt),
        costoPorResultado: numero(columna(o, 'Costo por resultados'), fmt),
        indicadorResultado: columna(o, 'Indicador de resultado') || null,
        clase: clasificarCampana(nombre)
      });
    }
  }
  return campanas;
}

/* Lectura semanal de Meta, en las semanas que reporta Meta (miércoles a
   martes), no en semanas ISO: reagruparlas inventaría precisión que el
   archivo no tiene. */
function lecturaPauta(campanas) {
  const porSemana = new Map();

  for (const c of campanas) {
    if (c.clase.tipo === 'b2b') continue;              // el B2B no es lectura B2C
    const k = c.desde + '|' + c.hasta;
    if (!porSemana.has(k)) {
      porSemana.set(k, {
        desde: c.desde, hasta: c.hasta,
        gasto: 0, compras: 0, clics: 0, impresiones: 0,
        valorCompras: 0, pendiente: 0
      });
    }
    const s = porSemana.get(k);
    s.gasto += c.gasto;
    s.compras += c.compras || 0;
    s.clics += c.clics || 0;
    s.impresiones += c.impresiones || 0;
    /* El ROAS que reporta Meta es por campaña; para agregarlo por semana hay
       que volverlo plata (ROAS × gasto) y recomponer el ratio al final. */
    if (c.roasPlataforma != null) s.valorCompras += c.roasPlataforma * c.gasto;
    if (c.clase.pendiente) s.pendiente += c.gasto;
  }

  const semanas = [...porSemana.values()]
    .sort((a, b) => a.desde < b.desde ? -1 : 1)
    .map(s => ({
      desde: s.desde, hasta: s.hasta,
      gasto: s.gasto,
      compras: s.compras,
      cpa: s.compras > 0 ? s.gasto / s.compras : null,
      ctr: s.impresiones > 0 ? s.clics / s.impresiones : null,
      roasPlataforma: s.gasto > 0 ? s.valorCompras / s.gasto : null,
      clics: s.clics, impresiones: s.impresiones,
      gastoPendiente: s.pendiente
    }));

  /* Atípicos por valla de Tukey sobre el CPA. */
  const cpas = semanas.map(s => s.cpa).filter(v => v != null).sort((a, b) => a - b);
  let limite = null, mediana = null;
  if (cpas.length >= 4) {
    const q = p => {
      const i = (cpas.length - 1) * p, b = Math.floor(i), r = i - b;
      return cpas[b] + (cpas[b + 1] !== undefined ? (cpas[b + 1] - cpas[b]) * r : 0);
    };
    mediana = q(0.5);
    limite = q(0.75) + ATIPICOS.k * (q(0.75) - q(0.25));
    semanas.forEach(s => { s.fueraDeRango = s.cpa != null && s.cpa > limite; });
  }

  return {
    semanas, mediana, limite, k: ATIPICOS.k,
    nota: 'Semanas tal como las reporta Meta (miércoles a martes), no semanas ISO.',
    totales: {
      gasto: semanas.reduce((a, s) => a + s.gasto, 0),
      compras: semanas.reduce((a, s) => a + s.compras, 0),
      clics: semanas.reduce((a, s) => a + s.clics, 0),
      impresiones: semanas.reduce((a, s) => a + s.impresiones, 0)
    }
  };
}

function cargarGoogle(archivos) {
  const dias = [];
  const fmt = formatoDe(archivos, ['Fecha', 'Coste']);
  for (const { filas: brutas } of archivos) {
    for (const o of aObjetos(brutas, ['Fecha', 'Coste'])) {
      const f = fecha(columna(o, 'Fecha'));
      const coste = numero(columna(o, 'Coste'), fmt);
      if (!f || coste == null) continue;
      dias.push({
        fecha: f, coste,
        conversiones: numero(columna(o, 'Conversiones'), fmt),
        valorConversion: numero(columna(o, 'Valor de conv.', 'Valor de conversion'), fmt),
        clics: numero(columna(o, 'Clics'), fmt)
      });
    }
  }
  return dias;
}

/* Inversión B2C de una ventana de fechas, ya sin las campañas B2B. */
function inversionEnVentana(campanas, google, desde, hasta) {
  let meta = 0, excluidoB2B = 0;
  const directoPorCategoria = {};
  const pendientes = [];

  for (const c of campanas) {
    const gasto = gastoEnVentana({ desde: c.desde, hasta: c.hasta, gasto: c.gasto }, desde, hasta);
    if (gasto <= 0) continue;

    if (c.clase.tipo === 'b2b') { excluidoB2B += gasto; continue; }

    meta += gasto;
    if (c.clase.tipo === 'categoria') {
      directoPorCategoria[c.clase.categoria] = (directoPorCategoria[c.clase.categoria] || 0) + gasto;
    }
    if (c.clase.pendiente) {
      const y = pendientes.find(p => p.nombre === c.nombre);
      if (y) y.gasto += gasto; else pendientes.push({ nombre: c.nombre, gasto });
    }
  }

  const googleGasto = google
    .filter(d => d.fecha >= desde && d.fecha <= hasta)
    .reduce((a, d) => a + d.coste, 0);

  const gastoDirecto = directoPorCategoria;
  const gastoGeneral = meta + googleGasto
    - Object.values(directoPorCategoria).reduce((a, v) => a + v, 0);

  return {
    total: meta + googleGasto,
    meta, google: googleGasto, excluidoB2B,
    campanasPendientes: pendientes,
    gastoDirecto, gastoGeneral,
    /* Para la dona: reparto de la INVERSIÓN por plataforma, no de las ventas. */
    plataformas: [
      { nombre: 'Meta Ads', valor: meta },
      { nombre: 'Google Ads', valor: googleGasto }
    ].filter(p => p.valor > 0)
  };
}

/* ================================================= 5. AGREGAR PERIODO ==== */

function armarPeriodo({ lineas, campanas, google, etiqueta, rango, comparativo, desde, hasta, metaIngreso, presupuesto }) {
  const enVentana = lineas.filter(l => l.fecha >= desde && l.fecha <= hasta);

  const buckets = {};
  const asegurar = n => (buckets[n] ||= {
    nombre: n, unidades: 0, ingresoBruto: 0, descuento: 0,
    unidadesConCosto: 0, costoPonderado: 0, ingresoBrutoConCosto: 0,
    niveles: { 1: 0, 2: 0, 3: 0 }, sinCosto: {}, codigos: {}, motivos: {}
  });

  for (const l of enVentana) {
    const b = asegurar(l.bucket);
    b.unidades += l.unidades;
    b.ingresoBruto += l.ingresoBruto;
    b.descuento += l.descuento;
    if (l.motivo) b.motivos[l.motivo] = (b.motivos[l.motivo] || 0) + l.unidades;

    if (l.costo) {
      b.unidadesConCosto += l.unidades;
      b.costoPonderado += l.costo.costo * l.unidades;
      b.ingresoBrutoConCosto += l.ingresoBruto;
      b.niveles[l.costo.nivel] += l.unidades;
    } else if (l.referencia) {
      b.sinCosto[l.referencia] = (b.sinCosto[l.referencia] || 0) + l.unidades;
    }

    const codigo = l.codigo || '(sin código)';
    b.codigos[codigo] ||= { codigo, usos: 0, monto: 0 };
    b.codigos[codigo].usos += 1;
    b.codigos[codigo].monto += l.descuento;
  }

  const unidadesPorCategoria = {};
  CATEGORIAS.forEach(c => { unidadesPorCategoria[c] = buckets[c] ? buckets[c].unidades : 0; });

  const inversion = inversionEnVentana(campanas, google, desde, hasta);
  const { reparto } = repartirPauta({
    gastoDirecto: inversion.gastoDirecto,
    gastoGeneral: inversion.gastoGeneral,
    unidadesPorCategoria
  });

  const categorias = CATEGORIAS.map(nombre => {
    const b = buckets[nombre] || asegurar(nombre);
    const ingresoNeto = b.ingresoBruto - b.descuento;
    const cubierto = b.unidadesConCosto > 0;
    const costoPromedio = cubierto ? b.costoPonderado / b.unidadesConCosto : null;
    /* El precio se toma del mismo subconjunto de unidades que tiene costo:
       mezclar el precio de todas las unidades con el costo de solo algunas
       daría un margen inflado. */
    const precioCubierto = cubierto ? b.ingresoBrutoConCosto / b.unidadesConCosto : null;

    const sinCosto = Object.entries(b.sinCosto)
      .map(([referencia, unidades]) => ({ referencia, unidades, luxury: esLuxury(referencia) }))
      .sort((a, x) => x.unidades - a.unidades);

    return {
      id: normalizar(nombre).replace(/\s+/g, '-'),
      nombre,
      incluye: MAPEO_CATEGORIA[nombre],
      unidades: b.unidades,
      ingresoBruto: b.ingresoBruto,
      descuento: b.descuento,
      ingresoNeto,
      precioVenta: b.unidades > 0 ? b.ingresoBruto / b.unidades : 0,
      costoUnitario: costoPromedio,
      margenBrutoUnitario: cubierto && precioCubierto > 0
        ? (precioCubierto - costoPromedio) / precioCubierto
        : null,
      cobertura: {
        unidadesConCosto: b.unidadesConCosto,
        unidadesTotales: b.unidades,
        pct: b.unidades > 0 ? b.unidadesConCosto / b.unidades : null,
        niveles: b.niveles,
        referenciasSinCosto: sinCosto.slice(0, 12),
        luxuryPendiente: sinCosto.some(s => s.luxury)
      },
      pauta: reparto[nombre],
      codigos: Object.values(b.codigos).sort((a, x) => x.monto - a.monto),
      notas: null
    };
  });

  const sc = buckets[SIN_CLASIFICAR];
  const ingresoNeto = categorias.reduce((a, c) => a + c.ingresoNeto, 0);

  /* MER medido contra el ingreso real de Shopify, no contra el valor de
     conversión que reporta cada plataforma. Es la única lectura que no
     sobreestima: las plataformas se atribuyen ventas que se solapan entre sí. */
  const baseMer = MER.base === 'meta' ? inversion.meta : inversion.total;
  const mer = {
    base: MER.base,
    etiquetaBase: MER.base === 'meta' ? 'inversión Meta' : 'inversión total en pauta',
    valor: baseMer > 0 ? ingresoNeto / baseMer : null,
    inversionBase: baseMer,
    valorTotal: inversion.total > 0 ? ingresoNeto / inversion.total : null,
    inversionTotal: inversion.total
  };

  return {
    etiqueta, rango, comparativo, desde, hasta,
    mer,
    inversionPauta: inversion,
    presupuestoPauta: presupuesto,
    metaIngresoNeto: metaIngreso,
    ingresoNetoPrevio: null,
    categorias,
    sinClasificar: sc ? {
      unidades: sc.unidades,
      ingresoNeto: sc.ingresoBruto - sc.descuento,
      motivos: Object.entries(sc.motivos).map(([motivo, unidades]) => ({ motivo, unidades }))
                 .sort((a, b2) => b2.unidades - a.unidades)
    } : { unidades: 0, ingresoNeto: 0, motivos: [] },
    leads: null
  };
}

/* ========================================================== 6. MAIN ====== */

function main() {
  const entrada = leerEntrada(ENTRADA);
  const total = entrada.ventas.length + entrada.meta.length + entrada.google.length + entrada.costos.length;

  if (total === 0) {
    console.error('\n  No hay archivos que procesar en data/entrada/.\n');
    console.error('  Deja ahí los CSV y vuelve a correr: node scripts/ingesta.mjs');
    console.error('  Formatos esperados en scripts/README.md\n');
    process.exit(1);
  }
  if (entrada.desconocidos.length) {
    aviso('medio', 'Archivos no reconocidos',
      `No se pudo identificar el tipo de: ${entrada.desconocidos.join(', ')}. Revisa que el encabezado tenga las columnas esperadas.`);
  }
  if (!entrada.ventas.length) {
    console.error('\n  Falta el export de ventas de Shopify: sin él no hay dashboard.\n');
    process.exit(1);
  }

  const costos = cargarCostos(entrada.costos);
  if (!entrada.costos.length) {
    aviso('alto', 'Sin archivo de costos', 'No hay archivo de costos en data/entrada/: ninguna categoría va a tener margen. Las unidades y el ingreso sí se calculan.');
  }

  const { lineas, excluidas } = cargarVentas(entrada.ventas, costos);
  if (!lineas.length) {
    console.error('\n  El export de Shopify no dejó ninguna línea de venta utilizable.\n');
    process.exit(1);
  }

  const campanas = cargarMeta(entrada.meta);
  const google = cargarGoogle(entrada.google);
  if (!entrada.meta.length) aviso('alto', 'Sin datos de Meta Ads', 'No hay export de Meta en data/entrada/: la inversión en pauta queda incompleta.');

  /* Solo las 4 categorías: es el mismo alcance que el KPI hero. Lo que cae en
     "Sin clasificar" se reporta aparte, nunca sumado por dentro. */
  const enCategoria = l => CATEGORIAS.includes(l.bucket);

  /* --- ventanas de tiempo, a partir de la última fecha con ventas --- */
  const fechas = lineas.map(l => l.fecha).sort();
  const ultima = fechas[fechas.length - 1];
  const sem = semanaISO(ultima);
  const inicioMes = ultima.slice(0, 8) + '01';

  const semanaPrevia = semanaISO(restarDias(sem.lunes, 1));
  const netoEn = (d, h) => lineas.filter(l => enCategoria(l) && l.fecha >= d && l.fecha <= h)
    .reduce((a, l) => a + l.ingresoBruto - l.descuento, 0);

  const periodos = {
    semana: armarPeriodo({
      lineas, campanas, google,
      etiqueta: 'Semana', rango: `${dia(sem.lunes)} – ${dia(ultima)}`,
      comparativo: 'vs. semana anterior',
      desde: sem.lunes, hasta: ultima,
      metaIngreso: METAS.ingresoNetoSemana, presupuesto: METAS.presupuestoPautaSemana
    }),
    mes: armarPeriodo({
      lineas, campanas, google,
      etiqueta: 'Acumulado del mes', rango: `${dia(inicioMes)} – ${dia(ultima)}`,
      comparativo: 'vs. periodo anterior',
      desde: inicioMes, hasta: ultima,
      metaIngreso: METAS.ingresoNetoMes, presupuesto: METAS.presupuestoPautaMes
    })
  };
  periodos.semana.ingresoNetoPrevio = netoEn(semanaPrevia.lunes, semanaPrevia.domingo) || null;

  /* --- serie de las últimas 6 semanas --- */
  const porSemana = new Map();
  for (const l of lineas) {
    const k = l.semana.clave;
    if (!porSemana.has(k)) porSemana.set(k, { ...l.semana, total: 0, unidades: 0, sinClasificar: 0 });
    const s = porSemana.get(k);
    const neto = l.ingresoBruto - l.descuento;
    if (enCategoria(l)) { s.total += neto; s.unidades += l.unidades; }
    else s.sinClasificar += neto;
  }
  const serieSemanal = [...porSemana.values()].sort((a, b) => a.lunes < b.lunes ? -1 : 1).slice(-6)
    .map(s => ({
      semana: s.etiqueta, clave: s.clave,
      rango: `${dia(s.lunes)}–${dia(s.domingo)}`,
      total: s.total, unidades: s.unidades, sinClasificar: s.sinClasificar,
      actual: s.clave === sem.clave,
      enMes: s.domingo >= inicioMes ? (s.lunes >= inicioMes ? 'completa' : 'parcial') : null
    }));

  /* --- lectura semanal de pauta (Meta) --- */
  const pauta = lecturaPauta(campanas);

  /* --- la dona ya no reparte ventas sino INVERSIÓN entre plataformas --- */
  const atribucion = {
    disponible: false,
    modo: 'inversion',
    motivo: 'El export de ventas de Shopify no trae canal por pedido, así que el ingreso no se puede repartir entre pauta, orgánico y otro.',
    faltante: 'Para abrir el ingreso por canal hace falta una columna de canal por pedido en el export de Shopify (canal de venta, o utm_source/utm_medium).',
    seniales: {
      googleValorConversion: google.reduce((a, d) => a + (d.valorConversion || 0), 0) || null,
      metaValorCompras: pauta.semanas.reduce((a, s) => a + (s.roasPlataforma || 0) * s.gasto, 0) || null,
      /* Ingreso neto de TODO el rango cargado, para poder contrastarlo con lo
         que se atribuyen las plataformas, que también cubre todo el rango. */
      ingresoNetoRango: null
    }
  };

  /* El valor de conversión de las plataformas cubre todo el archivo, así que
     se compara contra el ingreso neto de todo el archivo, no contra el mes. */
  const netoTotal = lineas.filter(enCategoria)
    .reduce((a, l) => a + l.ingresoBruto - l.descuento, 0);
  atribucion.seniales.ingresoNetoRango = netoTotal;

  aviso('alto', 'Sin atribución por canal',
    'El ingreso no se puede abrir por origen: la dona muestra el reparto de la inversión entre plataformas, y el margen bruto de pauta y el múltiplo invertido quedan sin dato. ' + atribucion.faltante);
  const sumaPlataformas = (atribucion.seniales.googleValorConversion || 0) +
                          (atribucion.seniales.metaValorCompras || 0);
  if (netoTotal > 0 && sumaPlataformas > netoTotal) {
    aviso('alto', 'Las plataformas se atribuyen más ventas de las que hubo',
      `Meta y Google suman ${Math.round(sumaPlataformas / netoTotal * 100)}% del ingreso neto real entre las dos. Por eso el KPI hero usa MER (ingreso real ÷ inversión) y el ROAS de plataforma solo aparece en la lectura de pauta, marcado como dato reportado por Meta.`);
  }

  if (!METAS.ingresoNetoSemana && !METAS.ingresoNetoMes) {
    aviso('medio', 'Sin metas comerciales',
      'No hay meta de ingreso ni presupuesto de pauta en scripts/config.mjs → METAS. El KPI se muestra sin semáforo de cumplimiento.');
  }
  const sinVentas = CATEGORIAS.filter(c =>
    periodos.mes.categorias.find(x => x.nombre === c).unidades === 0);
  if (sinVentas.length) {
    aviso('medio', 'Categorías sin ventas en el periodo',
      `${sinVentas.join(', ')} no tienen unidades en los archivos cargados. Aparecen en cero, no ocultas.`);
  }

  const refsExcluidasVistas = Object.keys(excluidas.porReferencia);
  if (!refsExcluidasVistas.length) {
    aviso('medio', 'Las referencias excluidas no aparecen en esta carga',
      `${Object.keys(REFERENCIAS_EXCLUIDAS).join(' y ')} no salen en el export de Shopify de este periodo, así que la exclusión no cambió ningún número. La regla sigue activa para cargas futuras.`);
  }

  /* Las campañas que config.mjs asigna directo a una categoría pueden no
     existir en este export. Si además hay campañas cuyo nombre sí menciona una
     categoría, se listan como candidatas para que alguien las confirme: no se
     asignan solas, porque adivinar el mapeo por el nombre es justo lo que no
     se debe hacer. */
  const nombresConGasto = new Set(campanas.filter(c => c.gasto > 0).map(c => c.nombre));
  const configuradas = Object.keys(CAMPANAS_POR_CATEGORIA);
  const configuradasAusentes = configuradas.filter(n => !nombresConGasto.has(n));

  const candidatas = new Map();
  for (const c of campanas) {
    if (c.clase.tipo !== 'general' || !c.gasto) continue;
    const n = normalizar(c.nombre);
    for (const [clave, categoria] of [['short', 'Short'], ['cinturilla', 'Cinturilla'],
                                      ['brasier', 'Brasier'], ['faja', 'Fajas'],
                                      ['luxury', 'Fajas'], ['quirurg', 'Fajas']]) {
      if (n.includes(clave)) {
        const e = candidatas.get(categoria) || { gasto: 0, campanas: new Set() };
        e.gasto += c.gasto; e.campanas.add(c.nombre);
        candidatas.set(categoria, e);
        break;
      }
    }
  }

  if (configuradasAusentes.length) {
    aviso('medio', 'Campañas por categoría configuradas que no están en el archivo',
      `${configuradasAusentes.join(' · ')} no aparecen con gasto en este export, así que todo el presupuesto se prorrateó por unidades.`);
  }
  if (candidatas.size) {
    const detalle = [...candidatas].map(([cat, e]) =>
      `${cat}: ${e.campanas.size} campañas, ${Math.round(e.gasto).toLocaleString('es-CO')} COP`).join(' · ');
    aviso('alto', 'Hay campañas que parecen nombradas por categoría',
      `${detalle}. No se asignaron directo porque el mapeo no está confirmado: hoy ese gasto se prorratea por unidades. Si se confirma, se agregan a scripts/config.mjs → CAMPANAS_POR_CATEGORIA y el costo unitario de pauta por categoría cambia.`);
  }

  aviso('medio', 'Leads sin fuente',
    'El reporte semanal manual de Kuvady no está entre los archivos de entrada; el bloque de leads queda vacío.');

  if (pauta.semanas.some(s2 => s2.fueraDeRango)) {
    const fuera = pauta.semanas.filter(s2 => s2.fueraDeRango);
    aviso('alto', 'Semanas de pauta fuera de rango',
      `${fuera.map(s2 => dia(s2.desde)).join(' y ')}: el CPA se sale de la valla estadística (Q3 + ${ATIPICOS.k}·IQR = ${Math.round(pauta.limite).toLocaleString('es-CO')}) frente a una mediana de ${Math.round(pauta.mediana).toLocaleString('es-CO')}. Están resaltadas en la lectura de pauta.`);
  }

  const hayCostos = costos.filas.length > 0;
  for (const p of Object.values(periodos)) {
    for (const c of p.categorias) {
      /* Si no hay archivo de costos, la cobertura es 0 en todo: ya lo dice el
         aviso general y repetirlo por categoría solo hace ruido. */
      if (hayCostos && c.unidades > 0 && c.cobertura.pct != null && c.cobertura.pct < 1) {
        const luxury = c.cobertura.luxuryPendiente ? ' — línea Luxury pendiente de costeo' : '';
        aviso('alto', `Cobertura de costo incompleta · ${c.nombre} (${p.etiqueta})`,
          `Margen calculado sobre ${(c.cobertura.pct * 100).toFixed(0)}% de las unidades${luxury}.`);
      }
    }
    if (p.sinClasificar.unidades > 0) {
      aviso('alto', `Unidades sin clasificar (${p.etiqueta})`,
        `${p.sinClasificar.unidades} unidades quedaron fuera de las 4 categorías: ${p.sinClasificar.motivos.map(m => m.motivo).join('; ')}.`);
    }
  }
  if (excluidas.unidades > 0) {
    aviso('medio', 'Referencias excluidas a propósito',
      `${excluidas.unidades} unidades de ${Object.keys(excluidas.porReferencia).join(', ')} se dejaron fuera del dashboard (Línea Masculina y Línea Médica mal etiquetadas en Shopify).`);
  }

  const salida = {
    meta: {
      marca: 'Fajitex', unidadNegocio: 'B2C', moneda: 'COP',
      esEjemplo: false,
      generado: new Date().toISOString().slice(0, 16).replace('T', ' '),
      ultimaFechaConVentas: ultima,
      origen: {
        modo: 'Carga manual de archivos — sin conexión API',
        archivos: [...entrada.ventas, ...entrada.meta, ...entrada.google, ...entrada.costos].map(a => a.nombre)
      },
      fuentes: {
        ingresos: 'Export de Shopify por SKU',
        pauta: `Meta Ads${google.length ? ' + Google Ads' : ''}`,
        costos: entrada.costos.length ? 'Archivo de costos por SKU (financiera)' : 'No entregado',
        leads: 'No entregado en esta carga'
      },
      fueraDeAlcance: Object.entries(REFERENCIAS_EXCLUIDAS).map(([r, m]) => `${r} — ${m}`)
    },
    umbrales: Object.assign(
      JSON.parse(readFileSync(join(RAIZ, 'data', 'umbrales.json'), 'utf8')),
      METAS.merObjetivo
        ? { mer: { meta: METAS.merObjetivo, alerta: METAS.merAlerta || METAS.merObjetivo * 0.8, direccion: 'mayorMejor' } }
        : {}
    ),
    calidad: { avisos, excluidas, hayCostos: costos.filas.length > 0 },
    atribucion,
    pauta,
    serieSemanal,
    periodos
  };

  const cabecera = `/* =============================================================================
   Fajitex · Dashboard digital B2C — DATOS REALES
   Generado por scripts/ingesta.mjs el ${salida.meta.generado}.
   NO editar a mano: se sobrescribe en la siguiente corrida.
   Archivos de origen: ${salida.meta.origen.archivos.join(', ') || '—'}
   ========================================================================== */\n\n`;

  writeFileSync(SALIDA, cabecera + 'window.FAJITEX_DATA = ' + JSON.stringify(salida, null, 2) + ';\n');
  informe(salida);
}

function informe(d) {
  const cop = v => v == null ? '—' : '$' + Math.round(v).toLocaleString('es-CO');
  console.log('\n  Ingesta completada → data/dashboard-data.js');
  console.log('  Archivos leídos: ' + (d.meta.origen.archivos.join(', ') || '—'));

  for (const [clave, p] of Object.entries(d.periodos)) {
    const neto = p.categorias.reduce((a, c) => a + c.ingresoNeto, 0);
    console.log(`\n  ${p.etiqueta} (${p.rango})`);
    console.log(`    Ingreso neto      ${cop(neto)}`);
    console.log(`    Inversión pauta   ${cop(p.inversionPauta.total)}  (Meta ${cop(p.inversionPauta.meta)} · Google ${cop(p.inversionPauta.google)} · B2B excluido ${cop(p.inversionPauta.excluidoB2B)})`);
    for (const c of p.categorias) {
      const cob = c.cobertura.pct == null ? 'sin unidades' : `cobertura ${(c.cobertura.pct * 100).toFixed(0)}%`;
      const margen = c.margenBrutoUnitario == null ? 'margen n/d' : `margen ${(c.margenBrutoUnitario * 100).toFixed(1)}%`;
      console.log(`      ${c.nombre.padEnd(12)} ${String(c.unidades).padStart(6)} u · ${cop(c.ingresoNeto).padStart(14)} · ${margen} · ${cob}`);
    }
    if (p.sinClasificar.unidades) console.log(`      ${SIN_CLASIFICAR.padEnd(12)} ${String(p.sinClasificar.unidades).padStart(6)} u · ${cop(p.sinClasificar.ingresoNeto)}`);
  }

  console.log(`\n  Avisos de calidad de datos: ${d.calidad.avisos.length}`);
  for (const a of d.calidad.avisos) {
    console.log(`    [${a.nivel === 'alto' ? '!' : '·'}] ${a.titulo}`);
    console.log(`        ${a.detalle}`);
  }
  console.log('');
}

const dia = f => {
  const [, m, d] = f.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${+d} ${meses[+m - 1]}`;
};
const restarDias = (f, n) => {
  const d = new Date(f + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

main();
