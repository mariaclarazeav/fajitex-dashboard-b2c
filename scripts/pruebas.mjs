#!/usr/bin/env node
/* =============================================================================
   Pruebas del pipeline de ingesta contra scripts/fixtures/.

       node scripts/pruebas.mjs

   Los fixtures están armados para disparar cada regla de negocio: si alguien
   cambia el mapeo, las exclusiones o el prorrateo sin querer, esto falla.
   ========================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = join(RAIZ, 'data', '.prueba-salida.js');

let ok = 0, falla = 0;
const prueba = (nombre, fn) => {
  try { fn(); console.log(`  ✓ ${nombre}`); ok++; }
  catch (e) { console.log(`  ✗ ${nombre}\n      ${e.message}`); falla++; }
};
const igual = (a, b, msg) => {
  const cerca = typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.5 : a === b;
  if (!cerca) throw new Error(`${msg || ''} — esperado ${b}, obtenido ${a}`);
};
const cierto = (v, msg) => { if (!v) throw new Error(msg); };

execFileSync(process.execPath, [join(RAIZ, 'scripts', 'ingesta.mjs')], {
  env: { ...process.env, FAJITEX_ENTRADA: 'scripts/fixtures', FAJITEX_SALIDA: 'data/.prueba-salida.js' },
  stdio: 'pipe'
});

globalThis.window = {};
new Function(readFileSync(TEMP, 'utf8').replace('window.FAJITEX_DATA', 'globalThis.window.FAJITEX_DATA'))();
const D = globalThis.window.FAJITEX_DATA;
const semana = D.periodos.semana;
const cat = n => semana.categorias.find(c => c.nombre === n);

console.log('\nIngesta · reglas de negocio\n');

prueba('excluye 026950 y 092961 de todas las categorías', () => {
  const refs = semana.categorias.flatMap(c => c.cobertura.referenciasSinCosto.map(r => r.referencia));
  cierto(!refs.includes('026950') && !refs.includes('092961'), 'aparecen referencias excluidas');
  igual(D.calidad.excluidas.unidades, 7, 'unidades excluidas');
});

prueba('Trusa va a Sin clasificar, no se descarta ni se asume categoría', () => {
  const m = semana.sinClasificar.motivos.map(x => x.motivo).join(' ');
  cierto(m.includes('sin confirmar'), 'falta el motivo de Trusa');
  cierto(semana.sinClasificar.unidades > 0, 'el bucket quedó vacío');
});

prueba('una categoría sin mapeo cae en Sin clasificar con su motivo', () => {
  const m = semana.sinClasificar.motivos.map(x => x.motivo).join(' ');
  cierto(m.includes('Accesorios'), 'no reporta el valor sin mapear');
});

prueba('Panty Moldeador suma a Short y Body Sculptor/Bra Luxury al bucket correcto', () => {
  cierto(cat('Short').incluye.includes('Panty Moldeador'), 'falta Panty Moldeador en Short');
  cierto(cat('Fajas').incluye.includes('Body Sculptor'), 'falta Body Sculptor en Fajas');
  cierto(cat('Brasier').unidades >= 6, 'Bra Luxury no sumó a Brasier');
});

prueba('las 2 campañas B2B quedan fuera del total B2C', () => {
  cierto(semana.inversionPauta.excluidoB2B > 0, 'no excluyó nada');
  igual(semana.inversionPauta.excluidoB2B, 2056000, 'gasto B2B excluido');
});

prueba('la campaña sin confirmar entra al total pero queda marcada', () => {
  const p = semana.inversionPauta.campanasPendientes;
  igual(p.length, 1, 'cantidad de campañas pendientes');
  cierto(p[0].nombre.includes('Mensajes a Wpp |'), 'no es la campaña esperada');
  cierto(!p[0].nombre.includes('Yure'), 'confundió la campaña Yure (B2B) con la pendiente');
  cierto(p[0].gasto > 0 && semana.inversionPauta.meta > p[0].gasto, 'no está dentro del total');
});

prueba('las campañas nombradas por categoría van directo a Short', () => {
  cierto(cat('Short').pauta.directo > 0, 'Short no recibió gasto directo');
  ['Fajas', 'Cinturilla', 'Brasier'].forEach(n =>
    igual(cat(n).pauta.directo, 0, `${n} no debería tener gasto directo`));
});

prueba('el resto del gasto se prorratea por unidades vendidas', () => {
  const porUnidad = ['Fajas', 'Cinturilla', 'Brasier']
    .map(n => cat(n).pauta.prorrateado / cat(n).unidades);
  cierto(Math.max(...porUnidad) - Math.min(...porUnidad) < 1,
    'el prorrateo no es proporcional a las unidades');
});

prueba('el reparto de pauta suma exactamente la inversión del periodo', () => {
  const suma = semana.categorias.reduce((a, c) => a + c.pauta.total, 0);
  igual(suma, semana.inversionPauta.total, 'suma repartida');
});

prueba('Meta + Google componen el total de inversión', () => {
  igual(semana.inversionPauta.meta + semana.inversionPauta.google,
        semana.inversionPauta.total, 'total de inversión');
  cierto(semana.inversionPauta.google > 0, 'no leyó el gasto de Google');
});

prueba('el gasto de una campaña se prorratea por días dentro de la ventana', () => {
  /* Las filas de Meta cubren 07–11 sep y la semana cierra el 10: 4 de 5 días. */
  igual(semana.inversionPauta.meta, 8168000, 'gasto Meta en la ventana');
});

prueba('Google Ads: ignora el encabezado de adorno y la fila de totales', () => {
  igual(semana.inversionPauta.google, 810000, 'gasto Google 7–10 sep');
});

prueba('las unidades sin costo no entran al margen pero sí a las unidades', () => {
  const f = cat('Fajas');
  igual(f.unidades, 12, 'unidades totales de Fajas');
  igual(f.cobertura.unidadesConCosto, 9, 'unidades con costo');
  igual(f.cobertura.pct, 0.75, 'cobertura');
});

prueba('la cobertura señala que lo que falta es línea Luxury', () => {
  const f = cat('Fajas');
  cierto(f.cobertura.luxuryPendiente, 'no marcó Luxury pendiente');
  cierto(f.cobertura.referenciasSinCosto.every(r => r.luxury), 'hay refs sin costo que no son Luxury');
});

prueba('una categoría con cobertura completa reporta 100%', () => {
  igual(cat('Short').cobertura.pct, 1, 'cobertura de Short');
});

prueba('el margen se calcula sobre el mismo subconjunto que tiene costo', () => {
  const f = cat('Fajas');
  /* Unidades con costo: 017001 4u a 76.000 + 3u a 78.000, 018220 2u a 68.000.
     Costo ponderado = (304.000 + 234.000 + 136.000) / 9 = 74.888,89
     Precio de esas mismas 9 unidades = 1.670.000 / 9 = 185.555,56
     Margen = (185.555,56 − 74.888,89) / 185.555,56 = 0,59640
     Las 3 unidades Luxury sin costo no entran a ninguno de los dos lados. */
  cierto(Math.abs(f.margenBrutoUnitario - 0.59640) < 0.0005,
    `margen ${f.margenBrutoUnitario}`);
});

prueba('la atribución por canal se marca como no disponible, no se inventa', () => {
  igual(D.atribucion.disponible, false, 'atribución');
  cierto(D.atribucion.faltante.length > 20, 'no explica qué falta');
  cierto(!semana.mixCanal, 'inventó una mezcla de canal');
});

prueba('la serie semanal usa el mismo alcance que el KPI hero', () => {
  const hero = semana.categorias.reduce((a, c) => a + c.ingresoNeto, 0);
  const s = D.serieSemanal.find(x => x.actual);
  igual(s.total, hero, 'total de la semana actual');
  cierto(s.sinClasificar > 0, 'no reporta Sin clasificar aparte');
});

prueba('los códigos de descuento de una categoría suman su descuento', () => {
  for (const c of semana.categorias) {
    const suma = c.codigos.reduce((a, k) => a + k.monto, 0);
    igual(suma, c.descuento, `códigos de ${c.nombre}`);
  }
});

prueba('el ingreso neto de cada categoría es bruto menos descuento', () => {
  for (const c of semana.categorias) igual(c.ingresoNeto, c.ingresoBruto - c.descuento, c.nombre);
});

prueba('marca los datos como reales, no de ejemplo', () => {
  igual(D.meta.esEjemplo, false, 'esEjemplo');
  cierto(D.meta.origen.archivos.length >= 4, 'no registró los archivos de origen');
});

prueba('deja avisos de calidad para todo lo que quedó incompleto', () => {
  const t = D.calidad.avisos.map(a => a.titulo).join(' | ');
  ['atribución', 'Cobertura', 'sin clasificar', 'metas', 'Leads']
    .forEach(x => cierto(t.toLowerCase().includes(x.toLowerCase()), `falta aviso sobre ${x}`));
});

try { unlinkSync(TEMP); } catch {}
console.log(`\n  ${ok} pasaron · ${falla} fallaron\n`);
process.exit(falla ? 1 : 0);
