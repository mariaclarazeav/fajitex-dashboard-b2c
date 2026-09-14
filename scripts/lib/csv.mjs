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

/* El punto significa cosas opuestas según el archivo: en el export de Google
   "179.090 COP" son ciento setenta y nueve mil, y en el de Meta "3.731262" es
   un CTR con seis decimales. Decidirlo valor por valor es imposible, así que se
   decide UNA VEZ por archivo, mirando el conjunto de sus números. */
export function detectarFormato(valores) {
  const muestra = valores
    .map(v => limpiarNumero(v))
    .filter(v => v && /\d/.test(v));

  /* 1. Si algún valor trae los dos separadores, manda el último que aparece. */
  for (const v of muestra) {
    const c = v.lastIndexOf(','), p = v.lastIndexOf('.');
    if (c !== -1 && p !== -1) return c > p ? 'coma' : 'punto';
  }
  /* 2. Coma con 1 o 2 decimales al final: decimal a la colombiana. */
  if (muestra.some(v => /,\d{1,2}$/.test(v))) return 'coma';
  /* 3. Punto con 1-2 decimales al final, o con 4 o más: decimal a la inglesa. */
  if (muestra.some(v => /\.\d{1,2}$/.test(v) || /\.\d{4,}/.test(v))) return 'punto';
  /* 4. Solo puntos con grupos exactos de 3: separador de miles. */
  if (muestra.some(v => /\.\d{3}$/.test(v))) return 'coma';
  return 'punto';
}

function limpiarNumero(valor) {
  if (valor == null) return '';
  return String(valor)
    .normalize('NFKC')                    /* el espacio duro de "179.090 COP" */
    .replace(/\s/g, '')
    .replace(/[$€]/g, '').replace(/COP/gi, '').replace(/%/g, '')
    .trim();
}

/* Devuelve null si no hay número, nunca 0: un 0 inventado se confundiría con
   un dato real. `formato` viene de detectarFormato() sobre el mismo archivo. */
export function numero(valor, formato) {
  let s = limpiarNumero(valor);
  if (s === '' || s === '-' || s === '--') return null;

  s = formato === 'coma'
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(/,/g, '');

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* Fechas: ISO (2026-09-11), d/m/aaaa y m/d/aaaa. Devuelve 'YYYY-MM-DD'. */
const MESES_ES = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11,
  dic: 12, diciembre: 12
};

export function fecha(valor) {
  if (!valor) return null;
  const s = String(valor).normalize('NFKC').trim();

  /* Google exporta "mié, 1 jul 2026": se quita el día de la semana y se
     traduce el mes, porque Date() no entiende abreviaturas en español. */
  const esp = normalizar(s).replace(/^[a-z]{3,10}\.?,\s*/, '')
    .match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (esp && MESES_ES[esp[2]]) return iso(+esp[3], MESES_ES[esp[2]], +esp[1]);

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
