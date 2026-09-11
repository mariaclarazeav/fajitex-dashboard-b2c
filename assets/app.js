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

  var ETIQUETA_ESTADO = { meta: 'En meta', alerta: 'Alerta', critico: 'Crítico' };
  var CANALES = ['Pauta digital', 'Orgánico/Directo', 'Otro'];

  /* ------------------------------------------------------------ formato --- */
  var nfPesos    = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  var nfEntero   = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  var nfDecimal1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nfDecimal2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function pesos(v)     { return nfPesos.format(Math.round(v)); }
  function millones(v)  { return '$' + nfDecimal1.format(v / 1e6) + ' M'; }
  function entero(v)    { return nfEntero.format(Math.round(v)); }
  function pct(v, dec)  { return (dec ? nfDecimal1.format(v * 100) : nfEntero.format(Math.round(v * 100))) + '%'; }
  function conSigno(v)  { return (v >= 0 ? '+' : '−') + nfDecimal1.format(Math.abs(v) * 100) + '%'; }

  /* ------------------------------------------------------------ semáforo -- */
  function estado(valor, umbral) {
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

    var categorias = p.categorias.map(function (c) {
      var bruto = c.unidades * c.precioVenta;
      var neto  = bruto - c.descuento;
      return Object.assign({}, c, {
        ingresoBruto: bruto,
        ingresoNeto: neto,
        descuentoPct: c.descuento / bruto,
        margenBrutoUnitario: (c.precioVenta - c.costoUnitario) / c.precioVenta
      });
    });

    var ingresoNetoTotal = categorias.reduce(function (a, c) { return a + c.ingresoNeto; }, 0);
    var unidadesTotal    = categorias.reduce(function (a, c) { return a + c.unidades; }, 0);

    /* Prorrateo de la inversión por participación en el ingreso neto */
    categorias.forEach(function (c) {
      c.participacion      = c.ingresoNeto / ingresoNetoTotal;
      c.inversionRateada   = p.inversionPauta * c.participacion;
      c.costoUnitarioPauta = c.inversionRateada / c.unidades;
      c.estadoMargen       = estado(c.margenBrutoUnitario, u.margenBrutoUnitario);
      c.estadoCostoPauta   = estado(c.costoUnitarioPauta, u.costoUnitarioPauta);
      c.codigos            = c.codigos.slice().sort(function (a, b) { return b.monto - a.monto; });
    });

    var ventasAtribuidas  = ingresoNetoTotal * p.mixCanal.pauta;
    /* Margen bruto ponderado por el peso de cada categoría en el ingreso neto */
    var margenPonderado   = categorias.reduce(function (a, c) { return a + c.ingresoNeto * c.margenBrutoUnitario; }, 0) / ingresoNetoTotal;
    var utilidadBrutaPauta = ventasAtribuidas * margenPonderado;
    var gananciaNetaPauta  = utilidadBrutaPauta - p.inversionPauta;

    var canales = [
      { nombre: CANALES[0], valor: ingresoNetoTotal * p.mixCanal.pauta,    participacion: p.mixCanal.pauta },
      { nombre: CANALES[1], valor: ingresoNetoTotal * p.mixCanal.organico, participacion: p.mixCanal.organico },
      { nombre: CANALES[2], valor: ingresoNetoTotal * p.mixCanal.otro,     participacion: p.mixCanal.otro }
    ];

    return {
      clave: clave, base: p, categorias: categorias, canales: canales,
      ingresoNetoTotal: ingresoNetoTotal,
      unidadesTotal: unidadesTotal,
      cumplimientoIngreso: ingresoNetoTotal / p.metaIngresoNeto,
      crecimiento: (ingresoNetoTotal - p.ingresoNetoPrevio) / p.ingresoNetoPrevio,
      inversionPauta: p.inversionPauta,
      cumplimientoPauta: p.inversionPauta / p.presupuestoPauta,
      ventasAtribuidas: ventasAtribuidas,
      utilidadBrutaPauta: utilidadBrutaPauta,
      margenBrutoPauta: margenPonderado,
      gananciaNetaPauta: gananciaNetaPauta,
      multiploInvertido: gananciaNetaPauta / p.inversionPauta,
      estados: {
        ingreso:  estado(ingresoNetoTotal / p.metaIngresoNeto, u.cumplimientoIngreso),
        pauta:    estado(p.inversionPauta / p.presupuestoPauta, u.cumplimientoPauta),
        margen:   estado(margenPonderado, u.margenBrutoPauta),
        multiplo: estado(gananciaNetaPauta / p.inversionPauta, u.multiploInvertido)
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
    document.getElementById('pie-actualizado').textContent = D.meta.actualizado + ' · datos de ejemplo';

    destruir();
    renderHero(v);
    renderKpis(v);
    renderLeyendaUmbrales();
    renderCanales(v);
    renderCombinada(v);
    renderCategorias(v);
    renderLeads(v);
  }

  /* ---------------------------------------------------------------- hero -- */
  function renderHero(v) {
    var hero = document.getElementById('hero');
    hero.dataset.estado = v.estados.ingreso;

    document.getElementById('hero-cifra').innerHTML =
      nfDecimal1.format(v.ingresoNetoTotal / 1e6) + '<span class="hero__moneda">M COP</span>';

    document.getElementById('hero-comparativo').innerHTML =
      pesos(v.ingresoNetoTotal) + ' · <b>' + conSigno(v.crecimiento) + '</b> ' + v.base.comparativo +
      ' · ' + entero(v.unidadesTotal) + ' unidades';

    var cumpl = v.cumplimientoIngreso;
    document.getElementById('hero-relleno').style.width = Math.min(cumpl, 1.35) / 1.35 * 100 + '%';
    document.getElementById('hero-marca-meta').style.left = (1 / 1.35 * 100) + '%';
    document.getElementById('hero-cumplimiento').innerHTML =
      pct(cumpl, true) + ' de la meta &nbsp; ' + pill(v.estados.ingreso, ' pill--sobre-oscuro');
    document.getElementById('hero-meta').textContent = 'Meta ' + millones(v.base.metaIngresoNeto);

    document.getElementById('hero-lectura').textContent = lectura(v);
  }

  /* Una sola frase editorial por vista */
  function lectura(v) {
    var peor = v.categorias.slice().sort(function (a, b) { return a.margenBrutoUnitario - b.margenBrutoUnitario; })[0];
    var mejor = v.categorias.slice().sort(function (a, b) { return b.margenBrutoUnitario - a.margenBrutoUnitario; })[0];
    var mult = nfDecimal2.format(v.multiploInvertido) + '×';

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
    var tarjetas = [
      {
        etiqueta: 'Inversión en pauta · Meta',
        cifra: millones(v.inversionPauta),
        estado: v.estados.pauta,
        barra: Math.min(v.cumplimientoPauta, 1.4) / 1.4 * 100,
        detalle: pct(v.cumplimientoPauta, true) + ' del presupuesto (' + millones(v.base.presupuestoPauta) + ')'
      },
      {
        etiqueta: 'Margen bruto de pauta',
        cifra: pct(v.margenBrutoPauta, true),
        estado: v.estados.margen,
        barra: v.margenBrutoPauta * 100,
        detalle: 'Utilidad bruta ' + millones(v.utilidadBrutaPauta) + ' sobre ventas atribuidas ' + millones(v.ventasAtribuidas)
      },
      {
        etiqueta: 'Múltiplo invertido',
        cifra: nfDecimal2.format(v.multiploInvertido) + '×',
        estado: v.estados.multiplo,
        barra: Math.min(Math.max(v.multiploInvertido, 0), 2.5) / 2.5 * 100,
        detalle: 'Ganancia neta de pauta ' + millones(v.gananciaNetaPauta) + ' · meta 1,50×'
      }
    ];

    document.getElementById('kpis').innerHTML = tarjetas.map(function (t) {
      return '<article class="kpi" data-estado="' + t.estado + '">' +
        '<div class="kpi__fila"><span class="kpi__etiqueta">' + t.etiqueta + '</span>' + pill(t.estado) + '</div>' +
        '<div class="kpi__fila"><span class="kpi__cifra">' + t.cifra + '</span></div>' +
        '<div class="kpi__barra"><span style="width:' + t.barra.toFixed(1) + '%"></span></div>' +
        '<div class="kpi__detalle">' + t.detalle + '</div>' +
      '</article>';
    }).join('');
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
    document.getElementById('dona-sub').textContent =
      'Ingreso neto ' + millones(v.ingresoNetoTotal) + ' · ' + v.base.etiqueta.toLowerCase();

    var valores = v.canales.map(function (c) { return c.valor; });

    graficas.dona = new Chart(document.getElementById('grafica-dona'), {
      type: 'doughnut',
      data: {
        labels: CANALES,
        datasets: [{
          data: valores,
          backgroundColor: PALETA.canal,
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

    graficas.dona.$centro = { etiqueta: 'Ingreso neto', valor: millones(v.ingresoNetoTotal) };
    graficas.dona.$contenidoTooltip = function (t) {
      var i = t.dataPoints[0].dataIndex, c = v.canales[i];
      return '<div class="tt-titulo">' + c.nombre + '</div>' +
        filaTT(PALETA.canal[i], 'Ingreso neto', pesos(c.valor)) +
        '<div class="tt-pie">' + pct(c.participacion, true) + ' del total del periodo</div>';
    };
    graficas.dona.update();

    document.getElementById('leyenda-dona').innerHTML = v.canales.map(function (c, i) {
      return '<span class="leyenda__item"><i class="leyenda__marca" style="background:' + PALETA.canal[i] + '"></i>' +
        c.nombre + ' <span class="leyenda__valor">' + pct(c.participacion, true) + '</span></span>';
    }).join('');

    document.getElementById('tabla-dona').innerHTML = v.canales.map(function (c) {
      return '<tr><td>' + c.nombre + '</td><td class="num">' + pesos(c.valor) + '</td><td class="num">' + pct(c.participacion, true) + '</td></tr>';
    }).join('') +
      '<tr><td><b>Total</b></td><td class="num"><b>' + pesos(v.ingresoNetoTotal) + '</b></td><td class="num"><b>100,0%</b></td></tr>';
  }

  /* ------------------------------------- columnas apiladas + línea total -- */
  function renderCombinada(v) {
    var serie = D.serieSemanal;
    var totales = serie.map(function (s) { return s.pauta + s.organico + s.otro; });
    var crecimientos = totales.map(function (t, i) { return i === 0 ? null : (t - totales[i - 1]) / totales[i - 1]; });

    graficas.combinada = new Chart(document.getElementById('grafica-combinada'), {
      data: {
        labels: serie.map(function (s) { return s.semana; }),
        datasets: [
          {
            type: 'line', label: 'Total', data: totales, stack: 'total', order: 0,
            borderColor: PALETA.linea, borderWidth: 2, tension: 0.25,
            pointBackgroundColor: PALETA.linea, pointBorderColor: PALETA.superficie,
            pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: false
          },
          { type: 'bar', label: CANALES[0], data: serie.map(function (s) { return s.pauta; }),    backgroundColor: PALETA.canal[0], stack: 'canal', order: 1, borderRadius: 0, borderColor: PALETA.superficie, borderWidth: { top: 2 } },
          { type: 'bar', label: CANALES[1], data: serie.map(function (s) { return s.organico; }), backgroundColor: PALETA.canal[1], stack: 'canal', order: 1, borderColor: PALETA.superficie, borderWidth: { top: 2 } },
          { type: 'bar', label: CANALES[2], data: serie.map(function (s) { return s.otro; }),     backgroundColor: PALETA.canal[2], stack: 'canal', order: 1, borderRadius: { topLeft: 4, topRight: 4 }, borderColor: PALETA.superficie, borderWidth: { top: 2 } }
        ]
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
    serie.forEach(function (sm, i) {
      if (vista === 'mes' ? !!sm.enMes : !!sm.actual) {
        tramos.push({ indice: i, parcial: sm.enMes === 'parcial' && vista === 'mes' });
      }
    });

    graficas.combinada.$banda = {
      tramos: tramos,
      etiqueta: vista === 'mes' ? 'Tramo del acumulado del mes · S36 entra solo en parte' : 'Semana del periodo'
    };
    graficas.combinada.$etiquetasLinea = { dataset: 0, etiquetas: totales.map(millones) };
    graficas.combinada.$contenidoTooltip = function (t) {
      var i = t.dataPoints[0].dataIndex, s = serie[i];
      var cr = crecimientos[i];
      return '<div class="tt-titulo">' + s.semana + ' · ' + s.rango + (s.actual ? ' (en curso)' : '') + '</div>' +
        filaTT(PALETA.canal[0], CANALES[0], pesos(s.pauta)) +
        filaTT(PALETA.canal[1], CANALES[1], pesos(s.organico)) +
        filaTT(PALETA.canal[2], CANALES[2], pesos(s.otro)) +
        '<div class="tt-pie">Total ' + pesos(totales[i]) + (cr === null ? '' : ' · ' + conSigno(cr) + ' vs. semana anterior') + '</div>';
    };
    graficas.combinada.update();

    document.getElementById('leyenda-combinada').innerHTML =
      CANALES.map(function (n, i) {
        return '<span class="leyenda__item"><i class="leyenda__marca" style="background:' + PALETA.canal[i] + '"></i>' + n + '</span>';
      }).join('') +
      '<span class="leyenda__item"><i class="leyenda__marca leyenda__marca--linea"></i>Total de la semana</span>';

    document.getElementById('tabla-combinada').innerHTML = serie.map(function (s, i) {
      return '<tr><td>' + s.semana + ' · ' + s.rango + '</td>' +
        '<td class="num">' + pesos(s.pauta) + '</td><td class="num">' + pesos(s.organico) + '</td>' +
        '<td class="num">' + pesos(s.otro) + '</td><td class="num"><b>' + pesos(totales[i]) + '</b></td>' +
        '<td class="num">' + (crecimientos[i] === null ? '—' : conSigno(crecimientos[i])) + '</td></tr>';
    }).join('');
  }

  /* ---------------------------------------------------------- categorías -- */
  function renderCategorias(v) {
    var cats = v.categorias;

    graficas.categorias = new Chart(document.getElementById('grafica-categorias'), {
      type: 'bar',
      data: {
        labels: cats.map(function (c) { return c.nombre; }),
        datasets: [{
          label: 'Margen bruto unitario',
          data: cats.map(function (c) { return c.margenBrutoUnitario * 100; }),
          backgroundColor: cats.map(function (c) { return PALETA.fill[c.estadoMargen]; }),
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
      etiquetas: cats.map(function (c) { return pct(c.margenBrutoUnitario, true); })
    };
    graficas.categorias.$contenidoTooltip = function (t) {
      var c = cats[t.dataPoints[0].dataIndex];
      return '<div class="tt-titulo">' + c.nombre + '</div>' +
        filaTT(PALETA.fill[c.estadoMargen], 'Margen bruto unitario', pct(c.margenBrutoUnitario, true)) +
        filaTT('transparent', 'Precio de venta', pesos(c.precioVenta)) +
        filaTT('transparent', 'Costo', pesos(c.costoUnitario)) +
        '<div class="tt-pie">' + ETIQUETA_ESTADO[c.estadoMargen] + ' · umbral de meta ' + pct(D.umbrales.margenBrutoUnitario.meta) + '</div>';
    };
    graficas.categorias.update();

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
            metrica('Costo unit. de pauta', pesos(c.costoUnitarioPauta), c.estadoCostoPauta) +
            metrica('Margen bruto unit.', pct(c.margenBrutoUnitario, true), c.estadoMargen, '', c.margenBrutoUnitario / 0.7) +
            '<div class="cat-metrica cat-metrica--estado">' + pill(c.estadoMargen) + '</div>' +
          '</div>' +
          '<div class="cat-abrir" aria-hidden="true">' + (abierta ? '−' : '+') + '</div>' +
        '</button>' +

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
              '<p class="cat-nota">' + c.notas + '</p>' +
              '<dl class="cat-desglose">' +
                celda('Ingreso bruto', pesos(c.ingresoBruto)) +
                celda('Descuento aplicado', pesos(c.descuento) + ' (' + pct(c.descuentoPct, true) + ')') +
                celda('Ingreso neto', pesos(c.ingresoNeto)) +
                celda('Inversión rateada', pesos(c.inversionRateada)) +
                celda('Precio de venta', pesos(c.precioVenta)) +
                celda('Costo', pesos(c.costoUnitario)) +
              '</dl>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    document.querySelectorAll('.cat-resumen').forEach(function (b) {
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

  /* --------------------------------------------------------------- leads -- */
  function renderLeads(v) {
    var leads = v.base.leads;
    document.getElementById('leads-nota').textContent = leads.nota;

    var maximo = Math.max.apply(null, leads.canales.map(function (c) { return c.cantidad; }));

    document.getElementById('leads-lista').innerHTML = leads.canales.map(function (c) {
      var delta = (c.cantidad - c.previo) / c.previo;
      return '<div class="lead-fila">' +
        '<span class="lead-fila__canal">' + c.canal + '</span>' +
        '<span class="lead-fila__cifra">' + entero(c.cantidad) + '</span>' +
        '<span class="lead-fila__pista"><span style="width:' + (c.cantidad / maximo * 100).toFixed(1) + '%"></span></span>' +
        '<span class="lead-fila__delta">' + conSigno(delta) + ' ' + v.base.comparativo + '</span>' +
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
