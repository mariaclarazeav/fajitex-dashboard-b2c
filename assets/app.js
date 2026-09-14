/* =============================================================================
   Fajitex · Dashboard digital B2C
   Toda cifra derivada se calcula aquí a partir de las cifras primarias de
   /data/sample-data.js. En la fase 2 solo cambia el origen de esos datos.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.FAJITEX_DATA;
  var css = getComputedStyle(document.documentElement);
  var color = function (n) { return css.getPropertyValue(n).trim(); };

  var PALETA = {
    canal:   [color('--canal-1'), color('--canal-2'), color('--canal-3')],
    linea:   color('--linea-total'),
    fill:    { meta: color('--st-meta-fill'), alerta: color('--st-alerta-fill'), critico: color('--st-critico-fill') },
    grid:    color('--hairline'),
    tinta:   color('--tinta-suave'),
    superficie: color('--superficie')
  };

  var ETIQUETA_ESTADO = { meta: 'En meta', alerta: 'Alerta', critico: 'Crítico', nd: 'Sin dato' };
  var CANALES = ['Pauta digital', 'Orgánico/Directo', 'Otro'];

  /* ------------------------------------------------------------ formato --- */
  var nfPesos    = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  var nfEntero   = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  var nfDecimal1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nfDecimal2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function pesos(v)     { return nfPesos.format(Math.round(v)); }
  /* Bajo 100 mil, "$0,0 M" no dice nada: se muestra la cifra en pesos. */
  function millones(v) {
    if (v == null) return '—';
    return Math.abs(v) < 100000 ? pesos(v) : '$' + nfDecimal1.format(v / 1e6) + ' M';
  }
  function entero(v)    { return nfEntero.format(Math.round(v)); }
  function pct(v, dec)  { return (dec ? nfDecimal1.format(v * 100) : nfEntero.format(Math.round(v * 100))) + '%'; }
  function conSigno(v)  { return (v >= 0 ? '+' : '−') + nfDecimal1.format(Math.abs(v) * 100) + '%'; }

  /* ------------------------------------------------------------ semáforo -- */
  /* Un valor nulo NO es un cero ni un mal resultado: es un dato que no se
     pudo calcular. Se le da su propio estado para que el semáforo no mienta. */
  function estado(valor, umbral) {
    if (valor == null || !isFinite(valor) || !umbral) return 'nd';
    if (umbral.direccion === 'mayorMejor') {
      return valor >= umbral.meta ? 'meta' : valor >= umbral.alerta ? 'alerta' : 'critico';
    }
    return valor <= umbral.meta ? 'meta' : valor <= umbral.alerta ? 'alerta' : 'critico';
  }

  function pill(est, extra) {
    return '<span class="pill' + (extra || '') + '" data-estado="' + est + '">' + ETIQUETA_ESTADO[est] + '</span>';
  }

  /* ----------------------------------------------------------- derivación -- */
  function derivar(clave) {
    var p = D.periodos[clave];
    var u = D.umbrales;

    /* El archivo de ejemplo guarda solo cifras primarias y aquí se derivan.
       El archivo que genera scripts/ingesta.mjs ya trae los agregados reales
       calculados sobre las líneas de venta, y en ese caso se respetan. */
    var categorias = p.categorias.map(function (c) {
      var bruto = c.ingresoBruto != null ? c.ingresoBruto : c.unidades * c.precioVenta;
      var neto  = c.ingresoNeto  != null ? c.ingresoNeto  : bruto - c.descuento;
      var margen = c.margenBrutoUnitario !== undefined
        ? c.margenBrutoUnitario
        : (c.precioVenta - c.costoUnitario) / c.precioVenta;

      return Object.assign({}, c, {
        ingresoBruto: bruto,
        ingresoNeto: neto,
        descuentoPct: bruto > 0 ? c.descuento / bruto : 0,
        margenBrutoUnitario: margen,
        cobertura: c.cobertura || null
      });
    });

    var ingresoNetoTotal = categorias.reduce(function (a, c) { return a + c.ingresoNeto; }, 0);
    var unidadesTotal    = categorias.reduce(function (a, c) { return a + c.unidades; }, 0);

    var inversion = typeof p.inversionPauta === 'object' && p.inversionPauta !== null
      ? p.inversionPauta
      : { total: p.inversionPauta, meta: p.inversionPauta, google: 0, excluidoB2B: 0, campanasPendientes: [] };
    var inversionTotal = inversion.total;

    categorias.forEach(function (c) {
      c.participacion = ingresoNetoTotal > 0 ? c.ingresoNeto / ingresoNetoTotal : 0;
      /* El pipeline reparte la inversión por unidades y por campaña nombrada;
         el archivo de ejemplo no trae reparto, así que se ratea por ingreso. */
      if (c.pauta) {
        c.inversionRateada   = c.pauta.total;
        c.costoUnitarioPauta = c.pauta.costoUnitarioPauta;
      } else {
        c.inversionRateada   = inversionTotal * c.participacion;
        c.costoUnitarioPauta = c.unidades > 0 ? c.inversionRateada / c.unidades : null;
      }
      c.estadoMargen     = estado(c.margenBrutoUnitario, u.margenBrutoUnitario);
      c.estadoCostoPauta = estado(c.costoUnitarioPauta, u.costoUnitarioPauta);
      c.codigos          = (c.codigos || []).slice().sort(function (a, b) { return b.monto - a.monto; });
    });

    /* Atribución: sin canal por pedido no hay forma de saber qué parte del
       ingreso vino de pauta, y sin eso no existen ni el margen bruto de pauta
       ni el múltiplo invertido. Se marcan como no disponibles. */
    var atribucionOK = !(D.atribucion && D.atribucion.disponible === false) && !!p.mixCanal;

    var canales = null, ventasAtribuidas = null, margenPonderado = null,
        utilidadBrutaPauta = null, gananciaNetaPauta = null, multiplo = null;

    if (atribucionOK) {
      canales = [
        { nombre: CANALES[0], valor: ingresoNetoTotal * p.mixCanal.pauta,    participacion: p.mixCanal.pauta },
        { nombre: CANALES[1], valor: ingresoNetoTotal * p.mixCanal.organico, participacion: p.mixCanal.organico },
        { nombre: CANALES[2], valor: ingresoNetoTotal * p.mixCanal.otro,     participacion: p.mixCanal.otro }
      ];
      ventasAtribuidas = ingresoNetoTotal * p.mixCanal.pauta;

      /* Solo entran al margen ponderado las categorías que tienen margen. */
      var conMargen = categorias.filter(function (c) { return c.margenBrutoUnitario != null; });
      var baseMargen = conMargen.reduce(function (a, c) { return a + c.ingresoNeto; }, 0);
      margenPonderado = baseMargen > 0
        ? conMargen.reduce(function (a, c) { return a + c.ingresoNeto * c.margenBrutoUnitario; }, 0) / baseMargen
        : null;

      if (margenPonderado != null) {
        utilidadBrutaPauta = ventasAtribuidas * margenPonderado;
        gananciaNetaPauta  = utilidadBrutaPauta - inversionTotal;
        multiplo           = inversionTotal > 0 ? gananciaNetaPauta / inversionTotal : null;
      }
    }

    var cumplimientoIngreso = p.metaIngresoNeto ? ingresoNetoTotal / p.metaIngresoNeto : null;
    var cumplimientoPauta   = p.presupuestoPauta ? inversionTotal / p.presupuestoPauta : null;

    return {
      clave: clave, base: p, categorias: categorias, canales: canales,
      atribucionOK: atribucionOK,
      ingresoNetoTotal: ingresoNetoTotal,
      unidadesTotal: unidadesTotal,
      cumplimientoIngreso: cumplimientoIngreso,
      crecimiento: p.ingresoNetoPrevio ? (ingresoNetoTotal - p.ingresoNetoPrevio) / p.ingresoNetoPrevio : null,
      inversion: inversion,
      inversionPauta: inversionTotal,
      cumplimientoPauta: cumplimientoPauta,
      ventasAtribuidas: ventasAtribuidas,
      utilidadBrutaPauta: utilidadBrutaPauta,
      margenBrutoPauta: margenPonderado,
      gananciaNetaPauta: gananciaNetaPauta,
      multiploInvertido: multiplo,
      estados: {
        ingreso:  estado(cumplimientoIngreso, u.cumplimientoIngreso),
        pauta:    estado(cumplimientoPauta, u.cumplimientoPauta),
        margen:   estado(margenPonderado, u.margenBrutoPauta),
        multiplo: estado(multiplo, u.multiploInvertido)
      }
    };
  }

  /* ------------------------------------------------------------- tooltip -- */
  var tt = document.getElementById('tooltip-grafica');

  function tooltipExterno(ctx) {
    var t = ctx.tooltip;
    if (!t || t.opacity === 0) { tt.style.opacity = 0; tt.style.left = '-9999px'; tt.setAttribute('aria-hidden', 'true'); return; }
    var render = ctx.chart.$contenidoTooltip;
    if (!render) return;
    tt.innerHTML = render(t);
    tt.setAttribute('aria-hidden', 'false');
    tt.style.opacity = 1;

    var caja = ctx.chart.canvas.getBoundingClientRect();
    var x = caja.left + t.caretX + 14;
    var y = caja.top + t.caretY - tt.offsetHeight / 2;
    if (x + tt.offsetWidth > window.innerWidth - 10) x = caja.left + t.caretX - tt.offsetWidth - 14;
    tt.style.left = Math.max(10, x) + 'px';
    tt.style.top  = Math.max(10, Math.min(y, window.innerHeight - tt.offsetHeight - 10)) + 'px';
  }

  function filaTT(c, etiqueta, valor) {
    return '<div class="tt-fila"><span><i style="background:' + c + '"></i> ' + etiqueta + '</span> <b>' + valor + '</b></div>';
  }

  var opcionesTooltip = { enabled: false, external: tooltipExterno, mode: 'index', intersect: false };

  /* ------------------------------------------- plugins de dibujo propios -- */
  /* Total en el centro de la dona */
  var centroDona = {
    id: 'centroDona',
    afterDraw: function (chart) {
      var d = chart.$centro; if (!d) return;
      var g = chart.ctx, a = chart.getDatasetMeta(0).data[0];
      if (!a) return;
      g.save();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color('--tinta-suave');
      g.font = '500 12px "Familjen Grotesk", sans-serif';
      g.fillText(d.etiqueta, a.x, a.y - 15);
      g.fillStyle = color('--tinta');
      g.font = '600 25px Unbounded, sans-serif';
      g.fillText(d.valor, a.x, a.y + 8);
      g.restore();
    }
  };

  /* Umbral punteado + etiqueta al final de cada barra de categoría */
  var umbralYEtiquetas = {
    id: 'umbralYEtiquetas',
    afterDatasetsDraw: function (chart) {
      var cfg = chart.$umbral; if (!cfg) return;
      var g = chart.ctx, y = chart.scales.y, area = chart.chartArea, py = y.getPixelForValue(cfg.valor);
      g.save();
      g.setLineDash([4, 4]); g.strokeStyle = color('--tinta-suave'); g.lineWidth = 1;
      g.beginPath(); g.moveTo(area.left, py); g.lineTo(area.right, py); g.stroke();
      g.setLineDash([]);
      g.fillStyle = color('--tinta-suave');
      g.font = '500 11px "Familjen Grotesk", sans-serif';
      g.textAlign = 'right'; g.textBaseline = 'bottom';
      g.fillText(cfg.etiqueta, area.right, py - 4);

      chart.getDatasetMeta(0).data.forEach(function (barra, i) {
        g.fillStyle = color('--tinta');
        g.font = '600 12px "Familjen Grotesk", sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'bottom';
        g.fillText(cfg.etiquetas[i], barra.x, barra.y - 6);
      });
      g.restore();
    }
  };

  /* Etiqueta directa sobre el primer y último punto de la línea de total */
  var etiquetasLinea = {
    id: 'etiquetasLinea',
    afterDatasetsDraw: function (chart) {
      var cfg = chart.$etiquetasLinea; if (!cfg) return;
      var meta = chart.getDatasetMeta(cfg.dataset); if (!meta || !meta.data.length) return;
      var g = chart.ctx;
      g.save();
      g.font = '600 12px "Familjen Grotesk", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'bottom';
      [0, meta.data.length - 1].forEach(function (i) {
        var p = meta.data[i]; if (!p) return;
        var texto = cfg.etiquetas[i];
        var w = g.measureText(texto).width;
        g.fillStyle = color('--superficie');
        g.fillRect(p.x - w / 2 - 5, p.y - 25, w + 10, 17);
        g.fillStyle = color('--tinta');
        g.fillText(texto, p.x, p.y - 11);
      });
      g.restore();
    }
  };

  /* Banda que marca, sobre la serie de semanas, qué tramo cubre el periodo
     seleccionado en el conmutador. Una semana que solo entra en parte al
     periodo (S36 en la vista de mes) se sombrea más suave. */
  var bandaPeriodo = {
    id: 'bandaPeriodo',

    beforeDatasetsDraw: function (chart) {
      var cfg = chart.$banda; if (!cfg || !cfg.tramos.length) return;
      var g = chart.ctx, area = chart.chartArea;
      g.save();
      cfg.tramos.forEach(function (t) {
        var lim = limites(chart, t.indice);
        g.fillStyle = t.parcial ? 'rgba(226, 201, 168, .20)' : 'rgba(226, 201, 168, .42)';
        g.fillRect(lim.izq, area.top, lim.der - lim.izq, area.bottom - area.top);
      });
      g.restore();
    },

    /* La etiqueta va por encima del área de trazado para no taparse con la
       línea del total. */
    afterDatasetsDraw: function (chart) {
      var cfg = chart.$banda; if (!cfg || !cfg.tramos.length) return;
      var g = chart.ctx, area = chart.chartArea;
      var izq = limites(chart, cfg.tramos[0].indice).izq;
      var der = limites(chart, cfg.tramos[cfg.tramos.length - 1].indice).der;
      g.save();
      g.fillStyle = color('--tinta-suave');
      g.font = '500 11px "Familjen Grotesk", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'top';
      /* Se centra sobre la banda, pero sin salirse del área de trazado. */
      var medio = g.measureText(cfg.etiqueta).width / 2;
      var cx = Math.min(Math.max((izq + der) / 2, area.left + medio), area.right - medio);
      g.fillText(cfg.etiqueta, cx, area.top - 36);
      g.restore();
    }
  };

  function limites(chart, i) {
    var x = chart.scales.x;
    var mitad = (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2;
    return { izq: x.getPixelForValue(i) - mitad + 1, der: x.getPixelForValue(i) + mitad - 1 };
  }

  Chart.register(centroDona, umbralYEtiquetas, etiquetasLinea, bandaPeriodo);
  Chart.defaults.font.family = "'Familjen Grotesk', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = color('--tinta-suave');
  Chart.defaults.animation.duration = 420;

  /* ============================================================ RENDER === */
  var graficas = {};
  var vista = 'semana';
  var abiertas = {};

  function destruir() { Object.keys(graficas).forEach(function (k) { graficas[k].destroy(); }); graficas = {}; }

  function render() {
    var v = derivar(vista);

    document.getElementById('periodo-rango').textContent = v.base.etiqueta + ' · ' + v.base.rango;
    document.getElementById('pie-actualizado').textContent =
      (D.meta.generado || D.meta.actualizado || '—') + (D.meta.esEjemplo ? ' · datos de ejemplo' : ' · datos reales');

    var fuentes = D.meta.fuentes || {};
    document.getElementById('pie-fuentes').innerHTML = [
      ['Ingresos y descuentos', fuentes.ingresos],
      ['Inversión y atribución', fuentes.pauta],
      ['Costos', fuentes.costos],
      ['Leads', fuentes.leads]
    ].filter(function (f) { return f[1]; })
     .map(function (f) { return '<li>' + f[0] + ': ' + f[1] + '.</li>'; }).join('');

    destruir();
    renderEncabezadoDatos();
    document.getElementById('nota-canales').textContent = v.atribucionOK
      ? 'Atribución de Shopify. "Otro" agrupa marketplace, referidos y ventas asistidas.'
      : 'Todavía no hay atribución por canal en los datos cargados: esta sección muestra el ingreso total por semana.';
    renderHero(v);
    renderKpis(v);
    renderLeyendaUmbrales();
    renderCanales(v);
    renderCombinada(v);
    renderCategorias(v);
    renderPauta();
    renderLeads(v);
  }

  /* Aviso de origen de datos. Si la carga es real, el aviso de "datos de
     ejemplo" desaparece y en su lugar queda la procedencia y los avisos de
     calidad: lo que quedó incompleto se dice, no se esconde. */
  function renderEncabezadoDatos() {
    var aviso = document.getElementById('aviso-datos');
    var m = D.meta;

    if (m.esEjemplo) {
      aviso.dataset.tipo = 'ejemplo';
      aviso.innerHTML = '<div class="envoltura">' +
        '<strong>Datos de ejemplo — pendiente conexión real.</strong>' +
        '<span>Las cifras son ilustrativas y no corresponden a resultados de Fajitex.</span>' +
      '</div>';
    } else {
      aviso.dataset.tipo = 'real';
      var archivos = (m.origen && m.origen.archivos || []).join(', ');
      aviso.innerHTML = '<div class="envoltura">' +
        '<strong>Datos reales</strong>' +
        '<span>Generados el ' + m.generado + ' · ' + (m.origen ? m.origen.modo : '') +
        (archivos ? ' · ' + archivos : '') + '</span>' +
      '</div>';
    }

    var avisos = (D.calidad && D.calidad.avisos) || [];
    var caja = document.getElementById('calidad');
    if (!avisos.length) { caja.innerHTML = ''; caja.hidden = true; return; }

    caja.hidden = false;
    var altos = avisos.filter(function (a) { return a.nivel === 'alto'; }).length;
    caja.innerHTML =
      '<details class="calidad">' +
        '<summary>' +
          '<span class="calidad__punto" data-nivel="' + (altos ? 'alto' : 'medio') + '"></span>' +
          avisos.length + (avisos.length === 1 ? ' aviso' : ' avisos') + ' de calidad de datos' +
          (altos ? ' · ' + altos + ' que afectan lo que se puede leer' : '') +
        '</summary>' +
        '<ul class="calidad__lista">' +
          avisos.map(function (a) {
            return '<li data-nivel="' + a.nivel + '"><b>' + a.titulo + '</b><span>' + a.detalle + '</span></li>';
          }).join('') +
        '</ul>' +
      '</details>';
  }

  /* ---------------------------------------------------------------- hero -- */
  function renderHero(v) {
    var hero = document.getElementById('hero');
    hero.dataset.estado = v.estados.ingreso;

    document.getElementById('hero-cifra').innerHTML =
      nfDecimal1.format(v.ingresoNetoTotal / 1e6) + '<span class="hero__moneda">M COP</span>';

    var partes = [pesos(v.ingresoNetoTotal)];
    if (v.crecimiento != null) partes.push('<b>' + conSigno(v.crecimiento) + '</b> ' + v.base.comparativo);
    partes.push(entero(v.unidadesTotal) + ' unidades');
    document.getElementById('hero-comparativo').innerHTML = partes.join(' · ');

    var medidor = document.getElementById('hero-medidor');
    if (v.cumplimientoIngreso == null) {
      /* Sin meta comercial cargada no se puede hablar de cumplimiento.
         Se muestra el dato sin barra en vez de inventar un 100%. */
      medidor.innerHTML = '<div class="hero__sin-meta">Sin meta comercial cargada · el semáforo de cumplimiento se activa al definirla en <code>scripts/config.mjs → METAS</code></div>';
    } else {
      medidor.innerHTML =
        '<div class="hero__pista">' +
          '<div class="hero__relleno" style="width:' + (Math.min(v.cumplimientoIngreso, 1.35) / 1.35 * 100) + '%"></div>' +
          '<div class="hero__marca-meta" style="left:' + (1 / 1.35 * 100) + '%"></div>' +
        '</div>' +
        '<div class="hero__pie">' +
          '<span>' + pct(v.cumplimientoIngreso, true) + ' de la meta &nbsp; ' + pill(v.estados.ingreso, ' pill--sobre-oscuro') + '</span>' +
          '<span>Meta ' + millones(v.base.metaIngresoNeto) + '</span>' +
        '</div>';
    }

    document.getElementById('hero-lectura').textContent = lectura(v);
  }

  /* Una sola frase editorial por vista */
  function lectura(v) {
    var conMargen = v.categorias.filter(function (c) { return c.margenBrutoUnitario != null; });

    if (!v.atribucionOK) {
      /* Sin atribución, la frase no puede hablar de retorno de la pauta. */
      if (!conMargen.length) return 'Hay ingreso y hay inversión, pero todavía no hay costos ni atribución: esta vista dice cuánto se vendió, no cuánto se ganó.';
      var peorSA = conMargen.slice().sort(function (a, b) { return a.margenBrutoUnitario - b.margenBrutoUnitario; })[0];
      return 'El ingreso y el margen por categoría ya se leen; falta el canal de cada pedido para saber qué parte la trajo la pauta. Lo más flojo hoy es ' +
             peorSA.nombre.toLowerCase() + '.';
    }

    var peor  = conMargen.slice().sort(function (a, b) { return a.margenBrutoUnitario - b.margenBrutoUnitario; })[0];
    var mejor = conMargen.slice().sort(function (a, b) { return b.margenBrutoUnitario - a.margenBrutoUnitario; })[0];
    var mult  = nfDecimal2.format(v.multiploInvertido) + '×';

    if (v.estados.multiplo === 'meta') {
      return 'Cada peso en pauta devuelve ' + mult + ' y ' + mejor.nombre.toLowerCase() +
             ' sostiene el margen: el periodo se puede leer como bueno sin matices.';
    }
    if (v.estados.multiplo === 'alerta') {
      return 'El ingreso responde, pero cada peso en pauta apenas devuelve ' + mult +
             '. El freno está en ' + peor.nombre.toLowerCase() + ' y en el descuento, no en el tráfico.';
    }
    return 'La pauta no está devolviendo lo invertido (' + mult + '). Antes de subir presupuesto hay que resolver ' +
           peor.nombre.toLowerCase() + '.';
  }

  /* ----------------------------------------------------------- KPI apoyo -- */
  function renderKpis(v) {
    var inv = v.inversion;
    var mer = v.base.mer;
    var pauta = D.pauta;

    var detalleInv = [];
    if (inv.google) {
      if (inv.meta) detalleInv.push('Meta Ads ' + millones(inv.meta));
      detalleInv.push('Google Ads ' + millones(inv.google));
    }
    if (v.cumplimientoPauta != null) {
      detalleInv.unshift(pct(v.cumplimientoPauta, true) + ' del presupuesto (' + millones(v.base.presupuestoPauta) + ')');
    }
    if (inv.excluidoB2B) detalleInv.push('B2B excluido ' + millones(inv.excluidoB2B));
    if (!detalleInv.length) detalleInv.push('Sin presupuesto de referencia cargado');

    var marcas = '';
    if (inv.campanasPendientes && inv.campanasPendientes.length) {
      var n = inv.campanasPendientes.length;
      marcas = '<div class="kpi__marca" title="' + inv.campanasPendientes.map(function (c) { return c.nombre; }).join(' · ') + '">' +
        n + (n === 1 ? ' campaña' : ' campañas') + ' con categorización pendiente de confirmar · ' +
        millones(inv.campanasPendientes.reduce(function (a, c) { return a + c.gasto; }, 0)) + ' dentro de este total' +
      '</div>';
    }

    /* CPA del periodo: gasto de Meta entre compras que reporta Meta. */
    var cpa = null, rangoCpa = '';
    if (pauta && pauta.semanas) {
      var enRango = pauta.semanas.filter(function (s2) {
        return s2.hasta >= v.base.desde && s2.desde <= v.base.hasta;
      });
      var g = enRango.reduce(function (a, s2) { return a + s2.gasto; }, 0);
      var c2 = enRango.reduce(function (a, s2) { return a + s2.compras; }, 0);
      if (c2 > 0) cpa = g / c2;
      /* Las semanas de Meta no calzan con el periodo, así que se dice qué
         tramo cubre de verdad el número en vez de fingir que coincide. */
      if (enRango.length) {
        rangoCpa = diaCorto(enRango[0].desde) + ' – ' + diaCorto(enRango[enRango.length - 1].hasta);
      }
    }

    var tarjetas = [
      {
        etiqueta: 'Inversión en pauta',
        cifra: millones(v.inversionPauta),
        estado: v.estados.pauta,
        barra: v.cumplimientoPauta != null ? Math.min(v.cumplimientoPauta, 1.4) / 1.4 * 100 : null,
        detalle: detalleInv.join(' · '),
        sinUmbral: 'sin presupuesto cargado',
        extra: marcas
      },
      {
        etiqueta: 'MER · ingreso neto ÷ ' + (mer ? mer.etiquetaBase : 'inversión'),
        cifra: mer && mer.valor != null ? nfDecimal2.format(mer.valor) + '×' : null,
        estado: estado(mer && mer.valor, D.umbrales.mer),
        sinUmbral: 'sin objetivo de MER definido',
        barra: mer && mer.valor != null ? Math.min(mer.valor, 6) / 6 * 100 : null,
        detalle: mer && mer.valor != null
          ? 'Ingreso real de Shopify sobre ' + millones(mer.inversionBase) + '. Contra la inversión total en pauta el MER es ' +
            nfDecimal2.format(mer.valorTotal) + '×.'
          : 'No hay inversión cargada para el periodo.',
        extra: '<div class="kpi__marca kpi__marca--nota">Medido contra ventas reales, no contra el valor de conversión que reporta cada plataforma.</div>'
      },
      {
        etiqueta: 'CPA de Meta',
        cifra: cpa != null ? pesos(cpa) : null,
        estado: cpa != null && pauta && pauta.mediana
          ? (cpa <= pauta.mediana ? 'meta' : cpa <= pauta.limite ? 'alerta' : 'critico')
          : 'nd',
        barra: cpa != null && pauta && pauta.limite ? Math.min(cpa / (pauta.limite * 1.2), 1) * 100 : null,
        detalle: cpa != null && pauta
          ? 'Semanas de Meta que tocan el periodo (' + rangoCpa + '). Mediana de las ' +
            pauta.semanas.length + ' semanas: ' + pesos(pauta.mediana) + '.'
          : 'Meta no reporta compras en este periodo.',
        sinUmbral: 'sin semanas suficientes'
      },
      {
        etiqueta: 'Margen bruto de pauta',
        cifra: v.margenBrutoPauta != null ? pct(v.margenBrutoPauta, true) : null,
        estado: v.estados.margen,
        barra: v.margenBrutoPauta != null ? v.margenBrutoPauta * 100 : null,
        detalle: v.margenBrutoPauta != null
          ? 'Utilidad bruta ' + millones(v.utilidadBrutaPauta) + ' sobre ventas atribuidas ' + millones(v.ventasAtribuidas)
          : 'Falta el archivo de costos por SKU y el canal por pedido. Sin eso no hay margen ni múltiplo invertido.'
      }
    ];

    document.getElementById('kpis').innerHTML = tarjetas.map(function (t) {
      return '<article class="kpi" data-estado="' + t.estado + '">' +
        '<div class="kpi__fila"><span class="kpi__etiqueta">' + t.etiqueta + '</span>' +
          (t.estado === 'nd' && t.cifra
            ? '<span class="kpi__sin-umbral">' + (t.sinUmbral || 'sin referencia para comparar') + '</span>'
            : pill(t.estado)) +
        '</div>' +
        '<div class="kpi__fila"><span class="kpi__cifra' + (t.cifra ? '' : ' kpi__cifra--nd') + '">' +
          (t.cifra || 'Sin dato') + '</span></div>' +
        (t.barra != null
          ? '<div class="kpi__barra"><span style="width:' + t.barra.toFixed(1) + '%"></span></div>'
          : '<div class="kpi__barra kpi__barra--nd"></div>') +
        '<div class="kpi__detalle">' + t.detalle + '</div>' +
        (t.extra || '') +
      '</article>';
    }).join('');
  }

  function motivoSinAtribucion() {
    return (D.atribucion && D.atribucion.motivo)
      ? D.atribucion.motivo
      : 'No hay atribución por canal en los datos cargados.';
  }

  function renderLeyendaUmbrales() {
    var u = D.umbrales;
    document.getElementById('leyenda-umbrales').textContent =
      'Umbrales: ingreso ≥ 100% de la meta · margen ≥ ' + pct(u.margenBrutoPauta.meta) +
      ' · múltiplo ≥ ' + nfDecimal2.format(u.multiploInvertido.meta) + '×' +
      ' · costo unitario de pauta ≤ ' + pesos(u.costoUnitarioPauta.meta) + '.';
  }

  /* ------------------------------------------------------ dona por canal -- */
  function renderCanales(v) {
    var panel = document.getElementById('panel-dona');
    var modoInversion = D.atribucion && D.atribucion.modo === 'inversion';
    var plataformas = v.inversion && v.inversion.plataformas;

    /* Sin canal por pedido no se puede repartir el INGRESO, pero sí se puede
       repartir la INVERSIÓN, que es un dato duro de cada plataforma. */
    if (!v.atribucionOK && !(modoInversion && plataformas && plataformas.length)) {
      panel.innerHTML =
        '<div class="sin-dato">' +
          '<div class="sin-dato__titulo">Sin atribución por canal</div>' +
          '<p class="sin-dato__texto">' + motivoSinAtribucion() + '</p>' +
          (D.atribucion && D.atribucion.faltante
            ? '<p class="sin-dato__accion">' + D.atribucion.faltante + '</p>' : '') +
        '</div>';
      return;
    }

    var esInversion = !v.atribucionOK;
    var datos = esInversion
      ? plataformas.map(function (p) { return { nombre: p.nombre, valor: p.valor }; })
      : v.canales.slice();
    var total = datos.reduce(function (a, d) { return a + d.valor; }, 0);
    datos.forEach(function (d) { d.participacion = total > 0 ? d.valor / total : 0; });

    var colores = PALETA.canal.slice(0, datos.length);

    panel.innerHTML =
      '<div class="panel__cabecera">' +
        '<h3 class="panel__titulo">' + (esInversion ? 'Reparto de la inversión' : 'Participación por canal') + '</h3>' +
        '<p class="panel__sub">' + (esInversion
          ? 'Inversión ' + millones(total) + ' · ' + v.base.etiqueta.toLowerCase() + ' · dónde se puso la plata, no de dónde vinieron las ventas'
          : 'Ingreso neto ' + millones(total) + ' · ' + v.base.etiqueta.toLowerCase()) +
        '</p>' +
      '</div>' +
      '<div class="lienzo lienzo--dona"><canvas id="grafica-dona"></canvas></div>' +
      '<div class="leyenda" id="leyenda-dona"></div>' +
      '<details class="ver-datos"><summary>Ver datos en tabla</summary>' +
        '<div class="tabla-envoltura"><table class="tabla">' +
          '<thead><tr><th>' + (esInversion ? 'Plataforma' : 'Canal') + '</th><th>' +
            (esInversion ? 'Inversión' : 'Ingreso neto') + '</th><th>Participación</th></tr></thead>' +
          '<tbody id="tabla-dona"></tbody>' +
        '</table></div>' +
      '</details>';

    graficas.dona = new Chart(document.getElementById('grafica-dona'), {
      type: 'doughnut',
      data: {
        labels: datos.map(function (d) { return d.nombre; }),
        datasets: [{
          data: datos.map(function (d) { return d.valor; }),
          backgroundColor: colores,
          borderColor: PALETA.superficie,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '64%',
        layout: { padding: 6 },
        plugins: { legend: { display: false }, tooltip: opcionesTooltip }
      }
    });

    graficas.dona.$centro = { etiqueta: esInversion ? 'Inversión' : 'Ingreso neto', valor: millones(total) };
    graficas.dona.$contenidoTooltip = function (t) {
      var i = t.dataPoints[0].dataIndex, d = datos[i];
      return '<div class="tt-titulo">' + d.nombre + '</div>' +
        filaTT(colores[i], esInversion ? 'Inversión' : 'Ingreso neto', pesos(d.valor)) +
        '<div class="tt-pie">' + pct(d.participacion, true) + ' del total del periodo</div>';
    };
    graficas.dona.update();

    document.getElementById('leyenda-dona').innerHTML = datos.map(function (d, i) {
      return '<span class="leyenda__item"><i class="leyenda__marca" style="background:' + colores[i] + '"></i>' +
        d.nombre + ' <span class="leyenda__valor">' + pct(d.participacion, true) + '</span></span>';
    }).join('');

    document.getElementById('tabla-dona').innerHTML = datos.map(function (d) {
      return '<tr><td>' + d.nombre + '</td><td class="num">' + pesos(d.valor) + '</td><td class="num">' + pct(d.participacion, true) + '</td></tr>';
    }).join('') +
      '<tr><td><b>Total</b></td><td class="num"><b>' + pesos(total) + '</b></td><td class="num"><b>100,0%</b></td></tr>';
  }

  /* ------------------------------------- columnas apiladas + línea total -- */
  function renderCombinada(v) {
    var serie = D.serieSemanal;
    var porCanal = v.atribucionOK && serie.every(function (s2) { return s2.pauta != null; });

    var totales = serie.map(function (s2) {
      return porCanal ? s2.pauta + s2.organico + s2.otro : s2.total;
    });
    var crecimientos = totales.map(function (t, i) { return i === 0 ? null : (t - totales[i - 1]) / totales[i - 1]; });

    /* Sin atribución la pila se queda en una sola serie: el ingreso neto de la
       semana. La línea sigue siendo el total, así que el gráfico conserva su
       lectura de tendencia aunque no se pueda abrir por canal. */
    var barras = porCanal
      ? [
          { type: 'bar', label: CANALES[0], data: serie.map(function (s2) { return s2.pauta; }),    backgroundColor: PALETA.canal[0], stack: 'canal', order: 1, borderRadius: 0, borderColor: PALETA.superficie, borderWidth: { top: 2 } },
          { type: 'bar', label: CANALES[1], data: serie.map(function (s2) { return s2.organico; }), backgroundColor: PALETA.canal[1], stack: 'canal', order: 1, borderColor: PALETA.superficie, borderWidth: { top: 2 } },
          { type: 'bar', label: CANALES[2], data: serie.map(function (s2) { return s2.otro; }),     backgroundColor: PALETA.canal[2], stack: 'canal', order: 1, borderRadius: { topLeft: 4, topRight: 4 }, borderColor: PALETA.superficie, borderWidth: { top: 2 } }
        ]
      : [
          { type: 'bar', label: 'Ingreso neto', data: serie.map(function (s2) { return s2.total; }), backgroundColor: PALETA.canal[0], stack: 'canal', order: 1, borderRadius: { topLeft: 4, topRight: 4 } }
        ];

    graficas.combinada = new Chart(document.getElementById('grafica-combinada'), {
      data: {
        labels: serie.map(function (s2) { return s2.semana; }),
        datasets: [{
          type: 'line', label: 'Total', data: totales, stack: 'total', order: 0,
          borderColor: PALETA.linea, borderWidth: 2, tension: 0.25,
          pointBackgroundColor: PALETA.linea, pointBorderColor: PALETA.superficie,
          pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: false
        }].concat(barras)
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 50 } },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { color: PALETA.grid } },
          y: {
            stacked: true, beginAtZero: true,
            grid: { color: PALETA.grid, drawTicks: false },
            border: { display: false },
            ticks: { padding: 8, callback: function (val) { return '$' + nfEntero.format(val / 1e6) + ' M'; } }
          }
        },
        plugins: { legend: { display: false }, tooltip: opcionesTooltip }
      }
    });

    var tramos = [];
    serie.forEach(function (s2, i) {
      if (vista === 'mes' ? !!s2.enMes : !!s2.actual) {
        tramos.push({ indice: i, parcial: s2.enMes === 'parcial' && vista === 'mes' });
      }
    });
    graficas.combinada.$banda = {
      tramos: tramos,
      etiqueta: vista === 'mes' ? 'Tramo del acumulado del mes' : 'Semana del periodo'
    };
    graficas.combinada.$etiquetasLinea = { dataset: 0, etiquetas: totales.map(millones) };

    graficas.combinada.$contenidoTooltip = function (t) {
      var i = t.dataPoints[0].dataIndex, s2 = serie[i], cr = crecimientos[i];
      var filas = porCanal
        ? filaTT(PALETA.canal[0], CANALES[0], pesos(s2.pauta)) +
          filaTT(PALETA.canal[1], CANALES[1], pesos(s2.organico)) +
          filaTT(PALETA.canal[2], CANALES[2], pesos(s2.otro))
        : filaTT(PALETA.canal[0], 'Ingreso neto', pesos(s2.total)) +
          (s2.unidades != null ? filaTT('transparent', 'Unidades', entero(s2.unidades)) : '');
      return '<div class="tt-titulo">' + s2.semana + ' · ' + s2.rango + (s2.actual ? ' (en curso)' : '') + '</div>' +
        filas +
        (s2.sinClasificar ? '<div class="tt-pie">Sin clasificar, fuera del total: ' + pesos(s2.sinClasificar) + '</div>' : '') +
        '<div class="tt-pie">Total ' + pesos(totales[i]) + (cr === null ? '' : ' · ' + conSigno(cr) + ' vs. semana anterior') + '</div>';
    };
    graficas.combinada.update();

    document.getElementById('leyenda-combinada').innerHTML =
      (porCanal
        ? CANALES.map(function (n, i) {
            return '<span class="leyenda__item"><i class="leyenda__marca" style="background:' + PALETA.canal[i] + '"></i>' + n + '</span>';
          }).join('')
        : '<span class="leyenda__item"><i class="leyenda__marca" style="background:' + PALETA.canal[0] + '"></i>Ingreso neto de la semana</span>') +
      '<span class="leyenda__item"><i class="leyenda__marca leyenda__marca--linea"></i>Total de la semana</span>';

    document.getElementById('titulo-combinada').textContent = porCanal
      ? 'Ventas por canal y crecimiento del total'
      : 'Ingreso neto por semana';
    document.getElementById('sub-combinada').textContent = porCanal
      ? 'Columnas apiladas por canal; la línea es el total de la semana. Ambas series comparten el mismo eje en pesos, así que la trayectoria de la línea es el crecimiento real. La banda marca el tramo que cubre el periodo seleccionado.'
      : 'Una columna por semana con el ingreso neto, y la línea del mismo total para leer la tendencia. La banda marca el tramo que cubre el periodo seleccionado.';

    document.getElementById('nota-combinada').innerHTML = porCanal
      ? 'Semanas calendario de lunes a domingo. El acumulado del mes no equivale a la suma de semanas completas cuando el mes arranca a mitad de semana.'
      : 'Sin canal por pedido la columna no se puede abrir por origen, así que muestra el ingreso neto total de cada semana. ' + (D.atribucion && D.atribucion.faltante ? D.atribucion.faltante : '');

    var encabezado = porCanal
      ? '<tr><th>Semana</th><th>Pauta digital</th><th>Orgánico/Directo</th><th>Otro</th><th>Total</th><th>Crecimiento</th></tr>'
      : '<tr><th>Semana</th><th>Unidades</th><th>Ingreso neto</th><th>Crecimiento</th></tr>';
    document.querySelector('#tabla-combinada-cabecera').innerHTML = encabezado;

    document.getElementById('tabla-combinada').innerHTML = serie.map(function (s2, i) {
      return porCanal
        ? '<tr><td>' + s2.semana + ' · ' + s2.rango + '</td>' +
          '<td class="num">' + pesos(s2.pauta) + '</td><td class="num">' + pesos(s2.organico) + '</td>' +
          '<td class="num">' + pesos(s2.otro) + '</td><td class="num"><b>' + pesos(totales[i]) + '</b></td>' +
          '<td class="num">' + (crecimientos[i] === null ? '—' : conSigno(crecimientos[i])) + '</td></tr>'
        : '<tr><td>' + s2.semana + ' · ' + s2.rango + '</td>' +
          '<td class="num">' + (s2.unidades != null ? entero(s2.unidades) : '—') + '</td>' +
          '<td class="num"><b>' + pesos(s2.total) + '</b></td>' +
          '<td class="num">' + (crecimientos[i] === null ? '—' : conSigno(crecimientos[i])) + '</td></tr>';
    }).join('');
  }

  /* ---------------------------------------------------------- categorías -- */
  function renderCategorias(v) {
    var cats = v.categorias;
    /* A la gráfica de margen solo entran las categorías que sí tienen costo.
       Una barra en cero para una categoría sin costear se leería como margen
       cero, que es peor que no mostrarla. */
    var conMargen = cats.filter(function (c) { return c.margenBrutoUnitario != null; });
    var sinMargen = cats.filter(function (c) { return c.margenBrutoUnitario == null; });

    var panelCat = document.getElementById('panel-categorias');
    var notaFalta = sinMargen.length
      ? ' <span class="nota-falta">Sin margen por falta de costos: ' +
        sinMargen.map(function (c) { return c.nombre; }).join(', ') + '.</span>'
      : '';

    /* Una gráfica de margen sin una sola barra se ve rota. Si ninguna categoría
       tiene costo cruzado, el panel dice qué falta en vez de dibujar una reja
       vacía. */
    if (!conMargen.length) {
      panelCat.innerHTML =
        '<div class="sin-dato">' +
          '<div class="sin-dato__titulo">Sin margen por categoría</div>' +
          '<p class="sin-dato__texto">Ninguna categoría tiene costo cruzado, así que no hay margen que graficar. Las unidades, el ingreso y el costo unitario de pauta sí están calculados en la tabla de abajo.</p>' +
          '<p class="sin-dato__accion">Deja el archivo de costos por SKU de la financiera en <code>data/entrada/</code> y vuelve a correr la ingesta: la cobertura de cada categoría aparece sola.</p>' +
        '</div>';
      renderFilasCategorias(v, cats);
      return;
    }

    panelCat.innerHTML =
      '<div class="panel__cabecera">' +
        '<h3 class="panel__titulo">Margen bruto unitario por categoría</h3>' +
        '<p class="panel__sub">Cada barra lleva su propio color de estado. La línea punteada es el umbral de meta (' +
          pct(D.umbrales.margenBrutoUnitario.meta) + ').' + notaFalta + '</p>' +
      '</div>' +
      '<div class="lienzo lienzo--categorias"><canvas id="grafica-categorias"></canvas></div>';

    graficas.categorias = new Chart(document.getElementById('grafica-categorias'), {
      type: 'bar',
      data: {
        labels: conMargen.map(function (c) { return c.nombre; }),
        datasets: [{
          label: 'Margen bruto unitario',
          data: conMargen.map(function (c) { return c.margenBrutoUnitario * 100; }),
          backgroundColor: conMargen.map(function (c) { return PALETA.fill[c.estadoMargen]; }),
          borderRadius: { topLeft: 4, topRight: 4 },
          maxBarThickness: 86
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 24 } },
        scales: {
          x: { grid: { display: false }, border: { color: PALETA.grid } },
          y: {
            beginAtZero: true, max: 70,
            grid: { color: PALETA.grid, drawTicks: false },
            border: { display: false },
            ticks: { padding: 8, callback: function (v2) { return v2 + '%'; } }
          }
        },
        plugins: { legend: { display: false }, tooltip: Object.assign({}, opcionesTooltip, { mode: 'nearest', intersect: true }) }
      }
    });

    graficas.categorias.$umbral = {
      valor: D.umbrales.margenBrutoUnitario.meta * 100,
      etiqueta: 'Meta ' + pct(D.umbrales.margenBrutoUnitario.meta),
      etiquetas: conMargen.map(function (c) { return pct(c.margenBrutoUnitario, true); })
    };
    graficas.categorias.$contenidoTooltip = function (t) {
      var c = conMargen[t.dataPoints[0].dataIndex];
      return '<div class="tt-titulo">' + c.nombre + '</div>' +
        filaTT(PALETA.fill[c.estadoMargen], 'Margen bruto unitario', pct(c.margenBrutoUnitario, true)) +
        filaTT('transparent', 'Precio de venta', pesos(c.precioVenta)) +
        filaTT('transparent', 'Costo', pesos(c.costoUnitario)) +
        '<div class="tt-pie">' + ETIQUETA_ESTADO[c.estadoMargen] + ' · umbral de meta ' + pct(D.umbrales.margenBrutoUnitario.meta) + '</div>' +
        (hayCobertura(c) ? '<div class="tt-pie">' + textoCobertura(c) + '</div>' : '');
    };
    graficas.categorias.update();

    renderFilasCategorias(v, cats);
  }

  function renderFilasCategorias(v, cats) {
    document.getElementById('cat-lista').innerHTML = cats.map(function (c) {
      var abierta = !!abiertas[c.id];
      return '' +
      '<div class="cat-fila" data-estado="' + c.estadoMargen + '">' +
        '<button type="button" class="cat-resumen" aria-expanded="' + abierta + '" aria-controls="det-' + c.id + '" data-cat="' + c.id + '">' +
          '<div class="cat-cabecera">' +
            '<div class="cat-nombre">' + c.nombre + '</div>' +
            '<div class="cat-incluye">' + c.incluye.join(' · ') + '</div>' +
          '</div>' +
          '<div class="cat-metricas">' +
            metrica('Unidades', entero(c.unidades)) +
            metrica('Ingreso neto', millones(c.ingresoNeto), null, 'cat-metrica--ocultable') +
            metrica('Costo unit. de pauta', c.costoUnitarioPauta != null ? pesos(c.costoUnitarioPauta) : 'Sin dato', c.estadoCostoPauta) +
            metrica('Margen bruto unit.',
              c.margenBrutoUnitario != null ? pct(c.margenBrutoUnitario, true) : 'Sin dato',
              c.estadoMargen, '',
              c.margenBrutoUnitario != null ? c.margenBrutoUnitario / 0.7 : undefined) +
            '<div class="cat-metrica cat-metrica--estado">' + pill(c.estadoMargen) + '</div>' +
          '</div>' +
          '<div class="cat-abrir" aria-hidden="true">' + (abierta ? '−' : '+') + '</div>' +
        '</button>' +

        (hayCobertura(c) ? '<div class="cat-cobertura">' + textoCobertura(c) + '</div>' : '') +

        '<div class="cat-detalle" id="det-' + c.id + '"' + (abierta ? '' : ' hidden') + '>' +
          '<div class="cat-detalle__rejilla">' +
            '<div>' +
              '<h4>Códigos de descuento usados</h4>' +
              '<div class="tabla-envoltura"><table class="tabla">' +
                '<thead><tr><th>Código</th><th>Usos</th><th>Monto descontado</th><th>% del descuento</th></tr></thead>' +
                '<tbody>' + c.codigos.map(function (k) {
                  return '<tr><td>' + k.codigo + '</td><td class="num">' + entero(k.usos) + '</td>' +
                    '<td class="num">' + pesos(k.monto) + '</td><td class="num">' + pct(k.monto / c.descuento, true) + '</td></tr>';
                }).join('') +
                '<tr><td><b>Total</b></td><td class="num"><b>' + entero(c.codigos.reduce(function (a, k) { return a + k.usos; }, 0)) + '</b></td>' +
                '<td class="num"><b>' + pesos(c.descuento) + '</b></td><td class="num"><b>100,0%</b></td></tr>' +
              '</tbody></table></div>' +
            '</div>' +
            '<div>' +
              '<h4>Notas del periodo</h4>' +
              '<p class="cat-nota">' + (c.notas || 'Sin notas cargadas para este periodo.') + '</p>' +
              (c.cobertura && c.cobertura.referenciasSinCosto && c.cobertura.referenciasSinCosto.length
                ? '<p class="cat-nota cat-nota--falta">Referencias sin costo: ' +
                  c.cobertura.referenciasSinCosto.map(function (r) {
                    return r.referencia + ' (' + entero(r.unidades) + ' u' + (r.luxury ? ', Luxury' : '') + ')';
                  }).join(' · ') + '</p>'
                : '') +
              '<dl class="cat-desglose">' +
                celda('Ingreso bruto', pesos(c.ingresoBruto)) +
                celda('Descuento aplicado', pesos(c.descuento) + ' (' + pct(c.descuentoPct, true) + ')') +
                celda('Ingreso neto', pesos(c.ingresoNeto)) +
                celda('Inversión rateada', pesos(c.inversionRateada)) +
                celda('Precio de venta', pesos(c.precioVenta)) +
                celda('Costo', c.costoUnitario != null ? pesos(c.costoUnitario) : 'Sin dato') +
                (c.cobertura ? celda('Unidades con costo',
                  entero(c.cobertura.unidadesConCosto) + ' de ' + entero(c.cobertura.unidadesTotales)) : '') +
              '</dl>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    var sc = v.base.sinClasificar;
    if (sc && sc.unidades > 0) {
      document.getElementById('cat-lista').insertAdjacentHTML('beforeend',
        '<div class="cat-fila cat-fila--sc">' +
          '<div class="cat-resumen cat-resumen--estatico">' +
            '<div class="cat-cabecera">' +
              '<div class="cat-nombre">Sin clasificar</div>' +
              '<div class="cat-incluye">Fuera de las 4 categorías · no entra a los totales de arriba</div>' +
            '</div>' +
            '<div class="cat-metricas">' +
              metrica('Unidades', entero(sc.unidades)) +
              metrica('Ingreso neto', millones(sc.ingresoNeto), null, 'cat-metrica--ocultable') +
              '<div class="cat-metrica" style="grid-column:span 2"><span class="cat-metrica__etiqueta">Motivo</span>' +
                '<span class="cat-metrica__valor" style="font-size:13px;font-weight:500">' +
                  sc.motivos.map(function (m) { return m.motivo + ' (' + entero(m.unidades) + ' u)'; }).join(' · ') +
                '</span></div>' +
            '</div>' +
            '<div></div>' +
          '</div>' +
        '</div>');
    }

    document.querySelectorAll('.cat-resumen[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.cat;
        var det = document.getElementById('det-' + id);
        var abierta = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', String(!abierta));
        det.hidden = abierta;
        b.querySelector('.cat-abrir').textContent = abierta ? '+' : '−';
        abiertas[id] = !abierta;
      });
    });
  }

  function metrica(etiqueta, valor, est, clase, proporcion) {
    return '<div class="cat-metrica ' + (clase || '') + '">' +
      '<span class="cat-metrica__etiqueta">' + etiqueta + '</span>' +
      '<span class="cat-metrica__valor"' + (est ? ' data-estado="' + est + '"' : '') + '>' + valor + '</span>' +
      (proporcion !== undefined
        ? '<span class="cat-mini"><span data-estado="' + est + '" style="width:' + Math.min(proporcion * 100, 100).toFixed(1) + '%"></span></span>'
        : '') +
    '</div>';
  }

  function celda(dt, dd) { return '<div><dt>' + dt + '</dt><dd>' + dd + '</dd></div>'; }

  /* La cobertura solo se anuncia si hay costos cargados: si no hay archivo,
     decir "0% de las unidades" en cada fila repite algo que ya dice el panel. */
  function hayCobertura(c) {
    if (!D.calidad || D.calidad.hayCostos === false) return false;
    return c.cobertura && c.cobertura.pct != null && c.cobertura.pct < 1 && c.unidades > 0;
  }

  /* Nunca se presenta un margen parcial como si fuera definitivo. */
  function textoCobertura(c) {
    var t = 'Margen calculado sobre ' + pct(c.cobertura.pct) + ' de las unidades';
    if (c.cobertura.luxuryPendiente) t += ' — línea Luxury pendiente de costeo';
    return t;
  }

  /* ------------------------------------------------------ lectura de pauta -- */

  /* Tabla semana a semana de Meta. El dato va codificado dentro de la celda
     —barra de fondo proporcional, CPA con su color de estado— para que se lea
     de un vistazo sin tener que comparar números a mano. */
  function renderPauta() {
    var seccion = document.getElementById('seccion-pauta');
    var p = D.pauta;

    if (!p || !p.semanas || !p.semanas.length) { seccion.hidden = true; return; }
    seccion.hidden = false;

    var maxGasto = Math.max.apply(null, p.semanas.map(function (s2) { return s2.gasto; }));
    var maxCompras = Math.max.apply(null, p.semanas.map(function (s2) { return s2.compras; }));
    var maxCtr = Math.max.apply(null, p.semanas.map(function (s2) { return s2.ctr || 0; }));

    function estadoCpa(cpa) {
      if (cpa == null || p.mediana == null) return 'nd';
      if (cpa <= p.mediana) return 'meta';
      return cpa <= p.limite ? 'alerta' : 'critico';
    }

    function barra(valor, max, clase) {
      var w = max > 0 ? Math.max(valor / max * 100, 1.5) : 0;
      return '<span class="celda-barra ' + (clase || '') + '" style="width:' + w.toFixed(1) + '%"></span>';
    }

    document.getElementById('pauta-nota').innerHTML =
      p.nota + ' Una semana se marca fuera de rango cuando su CPA supera la valla de Tukey ' +
      '(Q3 + ' + nfDecimal1.format(p.k) + '·IQR = <b>' + pesos(p.limite) + '</b>), frente a una mediana de <b>' +
      pesos(p.mediana) + '</b>.';

    document.getElementById('pauta-cuerpo').innerHTML = p.semanas.map(function (s2) {
      var est = estadoCpa(s2.cpa);
      return '<tr' + (s2.fueraDeRango ? ' class="fila-atipica"' : '') + '>' +
        '<td class="pauta-semana">' +
          (s2.fueraDeRango ? '<span class="marca-atipica" title="CPA fuera de rango">▲</span>' : '') +
          diaCorto(s2.desde) + ' – ' + diaCorto(s2.hasta) +
        '</td>' +
        '<td class="num celda-con-barra">' + barra(s2.gasto, maxGasto) + '<b>' + pesos(s2.gasto) + '</b></td>' +
        '<td class="num celda-con-barra">' + barra(s2.compras, maxCompras) + entero(s2.compras) + '</td>' +
        '<td class="num"><span class="cpa" data-estado="' + est + '">' +
          (s2.cpa != null ? pesos(s2.cpa) : '—') + '</span></td>' +
        '<td class="num celda-con-barra">' + barra(s2.ctr || 0, maxCtr, 'celda-barra--tenue') +
          (s2.ctr != null ? pct(s2.ctr, true) : '—') + '</td>' +
        '<td class="num roas">' + (s2.roasPlataforma != null ? nfDecimal2.format(s2.roasPlataforma) + '×' : '—') + '</td>' +
      '</tr>';
    }).join('');

    var t = p.totales;
    document.getElementById('pauta-pie').innerHTML =
      '<tr>' +
        '<td>Total · ' + p.semanas.length + ' semanas</td>' +
        '<td class="num"><b>' + pesos(t.gasto) + '</b></td>' +
        '<td class="num"><b>' + entero(t.compras) + '</b></td>' +
        '<td class="num"><b>' + (t.compras > 0 ? pesos(t.gasto / t.compras) : '—') + '</b></td>' +
        '<td class="num"><b>' + (t.impresiones > 0 ? pct(t.clics / t.impresiones, true) : '—') + '</b></td>' +
        '<td class="num roas">—</td>' +
      '</tr>';

    /* El ROAS de plataforma se muestra, pero con su advertencia al lado. */
    var se = D.atribucion && D.atribucion.seniales;
    var aviso = document.getElementById('pauta-roas-aviso');
    if (se && se.googleValorConversion && se.metaValorCompras && se.ingresoNetoRango) {
      var suma = se.googleValorConversion + se.metaValorCompras;
      /* Se compara contra el ingreso de todo el rango cargado, que es el mismo
         alcance que cubren las cifras de las plataformas. */
      var neto = se.ingresoNetoRango;
      aviso.innerHTML = 'El ROAS es el que reporta Meta y no es comparable con el MER. En este rango Meta y Google se ' +
        'atribuyen <b>' + millones(suma) + '</b> en ventas entre las dos, contra <b>' + millones(neto) +
        '</b> que vendió la tienda completa: se están apuntando la misma venta más de una vez. Por eso el KPI de arriba ' +
        'divide el ingreso real de Shopify entre la inversión.';
    } else {
      aviso.innerHTML = 'El ROAS es el que reporta Meta sobre sus propias conversiones; no es comparable con el MER.';
    }
  }

  function diaCorto(f) {
    var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var partes = f.split('-');
    return (+partes[2]) + ' ' + meses[+partes[1] - 1];
  }

  /* --------------------------------------------------------------- leads -- */
  function renderLeads(v) {
    var leads = v.base.leads;
    var contenedor = document.getElementById('leads-lista');

    if (!leads || !leads.canales || !leads.canales.length) {
      document.getElementById('leads-nota').textContent = '';
      contenedor.className = '';
      contenedor.innerHTML =
        '<div class="sin-dato">' +
          '<div class="sin-dato__titulo">Sin reporte de leads en esta carga</div>' +
          '<p class="sin-dato__texto">El reporte semanal manual de Kuvady no viene entre los archivos de entrada. Es un conteo que se digita aparte, no sale de Shopify ni de Meta.</p>' +
        '</div>';
      return;
    }
    contenedor.className = 'leads';
    document.getElementById('leads-nota').textContent = leads.nota;

    var maximo = Math.max.apply(null, leads.canales.map(function (c) { return c.cantidad; }));

    contenedor.innerHTML = leads.canales.map(function (c) {
      var delta = c.previo ? (c.cantidad - c.previo) / c.previo : null;
      return '<div class="lead-fila">' +
        '<span class="lead-fila__canal">' + c.canal + '</span>' +
        '<span class="lead-fila__cifra">' + entero(c.cantidad) + '</span>' +
        '<span class="lead-fila__pista"><span style="width:' + (c.cantidad / maximo * 100).toFixed(1) + '%"></span></span>' +
        '<span class="lead-fila__delta">' + (delta != null ? conSigno(delta) + ' ' + v.base.comparativo : 'sin comparativo') + '</span>' +
      '</div>';
    }).join('');
  }

  /* --------------------------------------------------------------- init --- */
  document.querySelectorAll('.conmutador button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (vista === b.dataset.periodo) return;
      vista = b.dataset.periodo;
      document.querySelectorAll('.conmutador button').forEach(function (o) {
        o.setAttribute('aria-pressed', String(o.dataset.periodo === vista));
      });
      render();
    });
  });

  render();
})();
