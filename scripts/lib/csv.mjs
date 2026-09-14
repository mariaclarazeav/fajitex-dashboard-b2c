/* =============================================================================
   Lectura de CSV sin dependencias.
   Los exports de Shopify, Meta y Google no vienen homogéneos: cambian el
   separador, el formato de número y a veces traen filas de basura antes del
   encabezado. Todo eso se resuelve aquí.
   ========================================================================== */

/* Parser CSV completo: comillas dobles, comillas escapadas ("") y saltos de
   línea dentro de un campo entrecomillado. */
export function parsearCSV(texto, separador) {
  const limpio = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const sep = separador || detectarSeparador(limpio);
  const filas = [];
  let campo = '', fila = [], enComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++; } else { enComillas = false; }
      } else { campo += c; }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === sep) {
      fila.push(campo); campo = '';
    } else if (c === '\n') {
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.map(f => f.map(v => v.trim())).filter(f => f.some(v => v !== ''));
}

function detectarSeparador(texto) {
  const primera = texto.split('\n').find(l => l.trim() !== '') || '';
  const cuenta = s => (primera.match(new RegExp('\\' + s, 'g')) || []).length;
  return [',', ';', '\t'].sort((a, b) => cuenta(b) - cuenta(a))[0];
}

export function normalizar(v) {
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/* Convierte las filas en objetos, buscando el encabezado real: Google Ads y
   Meta a veces meten título y rango de fechas antes de la tabla. */
export function aObjetos(filas, columnasClave) {
  const claves = columnasClave.map(normalizar);
  let iEncabezado = filas.findIndex(f => {
    const n = f.map(normalizar);
    return claves.every(c => n.some(v => v === c || v.includes(c)));
  });
  if (iEncabezado === -1) iEncabezado = 0;

  const encabezado = filas[iEncabezado];
  return filas.slice(iEncabezado + 1)
    .filter(f => f.length && !esFilaDeTotales(f))
    .map(f => {
      const o = {};
      encabezado.forEach((col, i) => { o[col] = f[i] === undefined ? '' : f[i]; });
      return o;
    });
}

/* Google Ads cierra el export con "Total: ..." — no es un dato. */
function esFilaDeTotales(fila) {
  const primera = normalizar(fila[0]);
  return primera.startsWith('total') || primera.startsWith('totales');
}

/* Busca una columna por nombre aproximado: los encabezados traen unidades y
   paréntesis que cambian entre exports ("Coste" vs "Coste (COP)"). */
export function columna(objeto, ...candidatos) {
  const llaves = Object.keys(objeto);
  for (const cand of candidatos) {
    const n = normalizar(cand);
    const exacta = llaves.find(k => normalizar(k) === n);
    if (exacta) return objeto[exacta];
  }
  for (const cand of candidatos) {
    const n = normalizar(cand);
    const parcial = llaves.find(k => normalizar(k).includes(n));
    if (parcial) return objeto[parcial];
  }
  return undefined;
}

/* Números en formato colombiano ("1.234.567,89"), inglés ("1,234,567.89") o
   plano. Devuelve null si no hay número, nunca 0 — un 0 inventado se
   confundiría con un dato real. */
export function numero(valor) {
  if (valor == null) return null;
  let s = String(valor).trim();
  if (s === '' || s === '-' || s === '--') return null;
  s = s.replace(/\s/g, '').replace(/[$€]/g, '').replace(/COP/gi, '').replace(/%/g, '');

  const tieneComa = s.includes(','), tienePunto = s.includes('.');
  if (tieneComa && tienePunto) {
    /* El separador decimal es el último que aparece. */
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (tieneComa) {
    /* "1,234" con 3 dígitos tras la coma es separador de miles. */
    s = /,\d{3}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (tienePunto && /\.\d{3}$/.test(s) && s.split('.').length > 1 && !/^\d+\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* Fechas: ISO (2026-09-11), d/m/aaaa y m/d/aaaa. Devuelve 'YYYY-MM-DD'. */
export function fecha(valor) {
  if (!valor) return null;
  const s = String(valor).trim();

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) {
    let [, a, b, anio] = m;
    /* Si el primero pasa de 12 es día; si no, se asume d/m (formato local). */
    const dia = +a, mes = +b;
    return mes > 12 ? iso(+anio, dia, mes) : iso(+anio, mes, dia);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function iso(anio, mes, dia) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/* Semana ISO (lunes a domingo) de una fecha 'YYYY-MM-DD'. */
export function semanaISO(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00Z');
  const dia = (d.getUTCDay() + 6) % 7;               // lunes = 0
  const lunes = new Date(d); lunes.setUTCDate(d.getUTCDate() - dia);
  const domingo = new Date(lunes); domingo.setUTCDate(lunes.getUTCDate() + 6);

  const jueves = new Date(lunes); jueves.setUTCDate(lunes.getUTCDate() + 3);
  const iniAnio = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((jueves - iniAnio) / 86400000 + 1) / 7);

  return {
    clave: `${jueves.getUTCFullYear()}-W${String(numero).padStart(2, '0')}`,
    etiqueta: `S${numero}`,
    lunes: lunes.toISOString().slice(0, 10),
    domingo: domingo.toISOString().slice(0, 10)
  };
}

export function diasEntre(desde, hasta) {
  const a = new Date(desde + 'T00:00:00Z'), b = new Date(hasta + 'T00:00:00Z');
  return Math.floor((b - a) / 86400000) + 1;
}
