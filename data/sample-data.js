/* =============================================================================
   Fajitex · Dashboard digital B2C
   DATOS DE EJEMPLO — cifras ilustrativas, NO son resultados reales de Fajitex.
   En la fase 2 este archivo se reemplaza por la salida de /scripts
   (Shopify, Meta Ads y el reporte manual de Kuvady).

   Se almacenan solo cifras primarias (unidades, precio, costo, descuento,
   inversión, mezcla de canal). Todo indicador derivado —ingreso bruto/neto,
   costo unitario de pauta, margen, múltiplo— se calcula en assets/app.js
   para que la fórmula viva en un solo lugar.
   ========================================================================== */

window.FAJITEX_DATA = {
  meta: {
    marca: 'Fajitex',
    unidadNegocio: 'B2C',
    moneda: 'COP',
    esEjemplo: true,
    actualizado: '2026-09-11',
    fuentes: {
      ingresos: 'Shopify (pendiente conexión)',
      pauta: 'Meta Ads (pendiente conexión)',
      leads: 'Reporte semanal manual — Kuvady (no es dato en vivo)'
    },
    fueraDeAlcance: [
      'Línea Masculina',
      'Línea Médica',
      'Accesorios',
      'Productos sin product_type en Shopify'
    ]
  },

  /* Umbrales del semáforo. Editables sin tocar el código. */
  umbrales: {
    cumplimientoIngreso:  { meta: 1.00, alerta: 0.85, direccion: 'mayorMejor' },
    cumplimientoPauta:    { meta: 1.00, alerta: 1.10, direccion: 'menorMejor' },
    margenBrutoPauta:     { meta: 0.55, alerta: 0.45, direccion: 'mayorMejor' },
    multiploInvertido:    { meta: 1.50, alerta: 1.00, direccion: 'mayorMejor' },
    margenBrutoUnitario:  { meta: 0.55, alerta: 0.45, direccion: 'mayorMejor' },
    costoUnitarioPauta:   { meta: 15000, alerta: 25000, direccion: 'menorMejor' }
  },

  /* Serie semanal compartida: ventas netas por canal, en COP.
     Semanas calendario lunes–domingo. S37 es la semana del periodo "Semana",
     así que su total coincide con el KPI hero de esa vista. El acumulado del
     mes (1–11 sep) toma los días 1–6 de S36 más toda S37: por eso no es la
     suma de semanas completas. */
  serieSemanal: [
    { semana: 'S32', rango: '3–9 ago',      pauta: 52100000, organico: 30400000, otro:  9800000 },
    { semana: 'S33', rango: '10–16 ago',    pauta: 55800000, organico: 29600000, otro: 10400000 },
    { semana: 'S34', rango: '17–23 ago',    pauta: 51200000, organico: 32900000, otro: 11100000 },
    { semana: 'S35', rango: '24–30 ago',    pauta: 59700000, organico: 33800000, otro: 10900000 },
    { semana: 'S36', rango: '31 ago–6 sep', pauta: 62400000, organico: 34100000, otro: 11600000, enMes: 'parcial' },
    { semana: 'S37', rango: '7–11 sep',     pauta: 67830884, organico: 36254438, otro: 12864478, actual: true, enMes: 'completa' }
  ],

  periodos: {
    semana: {
      etiqueta: 'Semana',
      rango: '7 – 11 sep 2026 · en curso',
      comparativo: 'vs. semana anterior',
      inversionPauta: 18500000,
      presupuestoPauta: 18000000,
      metaIngresoNeto: 110000000,
      ingresoNetoPrevio: 108100000,
      mixCanal: { pauta: 0.58, organico: 0.31, otro: 0.11 },
      leads: {
        nota: 'Reporte semanal manual. Solo cantidades, sin datos personales.',
        canales: [
          { canal: 'WhatsApp',        cantidad: 384, previo: 351 },
          { canal: 'Email marketing', cantidad: 246, previo: 262 },
          { canal: 'SMS',             cantidad: 112, previo:  98 }
        ]
      },
      categorias: [
        {
          id: 'fajas',
          nombre: 'Fajas',
          incluye: ['Fajas', 'Faja Reloj de Arena', 'Fajas Indigo', 'Mediana Compresión', 'Línea Luxury', 'Postquirúrgico'],
          unidades: 412, precioVenta: 190000, costoUnitario: 76000, descuento: 7828000,
          notas: 'Reloj de Arena concentra el 41% de las unidades. El costo unitario de pauta se disparó por la subasta de retargeting; conviene mover presupuesto a públicos fríos antes del pico de quincena.',
          codigos: [
            { codigo: 'FAJITEX15',   usos: 86, monto: 3240000 },
            { codigo: 'VIP20',       usos: 31, monto: 1910000 },
            { codigo: 'MOLDEA10',    usos: 54, monto: 1780000 },
            { codigo: 'ENVIOGRATIS', usos: 42, monto:  898000 }
          ]
        },
        {
          id: 'short',
          nombre: 'Short',
          incluye: ['Short', 'Short Luxury'],
          unidades: 268, precioVenta: 100000, costoUnitario: 46000, descuento: 3216000,
          notas: 'Short Luxury sostiene el ticket, pero el descuento promedio subió a 12% por acumulación de MOLDEA10 con envío gratis.',
          codigos: [
            { codigo: 'SHORT12',     usos: 48, monto: 1340000 },
            { codigo: 'MOLDEA10',    usos: 39, monto: 1020000 },
            { codigo: 'ENVIOGRATIS', usos: 27, monto:  856000 }
          ]
        },
        {
          id: 'cinturilla',
          nombre: 'Cinturilla',
          incluye: ['Chaleco y Cinturilla'],
          unidades: 196, precioVenta: 80000, costoUnitario: 35200, descuento: 1254400,
          notas: 'La categoría más eficiente de la semana: menor descuento aplicado y el mejor margen unitario. Buen candidato para subir inversión.',
          codigos: [
            { codigo: 'CINTU10',     usos: 33, monto: 690000 },
            { codigo: 'MOLDEA10',    usos: 21, monto: 402000 },
            { codigo: 'ENVIOGRATIS', usos:  9, monto: 162400 }
          ]
        },
        {
          id: 'brasier',
          nombre: 'Brasier',
          incluye: ['Brasier', 'Bra Luxury'],
          unidades: 141, precioVenta: 70000, costoUnitario: 43000, descuento: 1381800,
          notas: 'Margen unitario en zona crítica: BRA20 se está usando sobre un producto que ya tiene el costo más alto de la matriz. Revisar la vigencia del código.',
          codigos: [
            { codigo: 'BRA20',    usos: 41, monto: 812000 },
            { codigo: 'VIP20',    usos: 18, monto: 394800 },
            { codigo: 'MOLDEA10', usos: 12, monto: 175000 }
          ]
        }
      ]
    },

    mes: {
      etiqueta: 'Acumulado del mes',
      rango: '1 – 11 sep 2026',
      comparativo: 'vs. mismo corte de agosto',
      inversionPauta: 31200000,
      presupuestoPauta: 30000000,
      metaIngresoNeto: 195000000,
      ingresoNetoPrevio: 181400000,
      mixCanal: { pauta: 0.61, organico: 0.29, otro: 0.10 },
      leads: {
        nota: 'Suma de los reportes semanales manuales del mes. Solo cantidades, sin datos personales.',
        canales: [
          { canal: 'WhatsApp',        cantidad: 612, previo: 574 },
          { canal: 'Email marketing', cantidad: 401, previo: 388 },
          { canal: 'SMS',             cantidad: 178, previo: 165 }
        ]
      },
      categorias: [
        {
          id: 'fajas',
          nombre: 'Fajas',
          incluye: ['Fajas', 'Faja Reloj de Arena', 'Fajas Indigo', 'Mediana Compresión', 'Línea Luxury', 'Postquirúrgico'],
          unidades: 731, precioVenta: 190000, costoUnitario: 76000, descuento: 13892900,
          notas: 'Sostiene el 62% del ingreso neto del mes. El costo unitario de pauta acumulado sigue por encima del umbral: es la palanca más rentable si se corrige.',
          codigos: [
            { codigo: 'FAJITEX15',   usos: 152, monto: 5760000 },
            { codigo: 'VIP20',       usos:  58, monto: 3520000 },
            { codigo: 'MOLDEA10',    usos:  97, monto: 3190000 },
            { codigo: 'ENVIOGRATIS', usos:  71, monto: 1422900 }
          ]
        },
        {
          id: 'short',
          nombre: 'Short',
          incluye: ['Short', 'Short Luxury'],
          unidades: 452, precioVenta: 100000, costoUnitario: 46000, descuento: 6328000,
          notas: 'Descuento acumulado del 14%, tres puntos por encima del mes pasado. El margen unitario aguanta, pero la tendencia va a la baja.',
          codigos: [
            { codigo: 'SHORT12',     usos: 94, monto: 2640000 },
            { codigo: 'MOLDEA10',    usos: 77, monto: 2010000 },
            { codigo: 'ENVIOGRATIS', usos: 52, monto: 1678000 }
          ]
        },
        {
          id: 'cinturilla',
          nombre: 'Cinturilla',
          incluye: ['Chaleco y Cinturilla'],
          unidades: 318, precioVenta: 80000, costoUnitario: 35200, descuento: 2289600,
          notas: 'Mejor margen unitario del acumulado con el menor descuento aplicado. Volumen bajo frente a Fajas: hay espacio para crecer sin castigar el margen.',
          codigos: [
            { codigo: 'CINTU10',     usos: 61, monto: 1260000 },
            { codigo: 'MOLDEA10',    usos: 38, monto:  731600 },
            { codigo: 'ENVIOGRATIS', usos: 17, monto:  298000 }
          ]
        },
        {
          id: 'brasier',
          nombre: 'Brasier',
          incluye: ['Brasier', 'Bra Luxury'],
          unidades: 240, precioVenta: 70000, costoUnitario: 43000, descuento: 2856000,
          notas: 'Categoría en rojo todo el mes: 17% de descuento promedio sobre el producto de menor margen. Decisión pendiente sobre BRA20.',
          codigos: [
            { codigo: 'BRA20',    usos: 78, monto: 1680000 },
            { codigo: 'VIP20',    usos: 33, monto:  812000 },
            { codigo: 'MOLDEA10', usos: 24, monto:  364000 }
          ]
        }
      ]
    }
  }
};
