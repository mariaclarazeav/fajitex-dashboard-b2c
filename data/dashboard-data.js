/* =============================================================================
   Fajitex · Dashboard digital B2C — DATOS REALES
   Generado por scripts/ingesta.mjs el 2026-09-14 13:37.
   NO editar a mano: se sobrescribe en la siguiente corrida.
   Archivos de origen: ventas_shopify.csv, meta_campanas.csv, google_serie_temporal.csv
   ========================================================================== */

window.FAJITEX_DATA = {
  "meta": {
    "marca": "Fajitex",
    "unidadNegocio": "B2C",
    "moneda": "COP",
    "esEjemplo": false,
    "generado": "2026-09-14 13:37",
    "ultimaFechaConVentas": "2026-09-13",
    "origen": {
      "modo": "Carga manual de archivos — sin conexión API",
      "archivos": [
        "ventas_shopify.csv",
        "meta_campanas.csv",
        "google_serie_temporal.csv"
      ]
    },
    "fuentes": {
      "ingresos": "Export de Shopify por SKU",
      "pauta": "Meta Ads + Google Ads",
      "costos": "No entregado",
      "leads": "No entregado en esta carga"
    },
    "fueraDeAlcance": [
      "026950 — Línea Masculina, llega etiquetada como Fajas en el export",
      "092961 — Línea Médica, llega etiquetada como Fajas en el export"
    ]
  },
  "umbrales": {
    "cumplimientoIngreso": {
      "meta": 1,
      "alerta": 0.85,
      "direccion": "mayorMejor"
    },
    "cumplimientoPauta": {
      "meta": 1,
      "alerta": 1.1,
      "direccion": "menorMejor"
    },
    "margenBrutoPauta": {
      "meta": 0.55,
      "alerta": 0.45,
      "direccion": "mayorMejor"
    },
    "multiploInvertido": {
      "meta": 1.5,
      "alerta": 1,
      "direccion": "mayorMejor"
    },
    "margenBrutoUnitario": {
      "meta": 0.55,
      "alerta": 0.45,
      "direccion": "mayorMejor"
    },
    "costoUnitarioPauta": {
      "meta": 15000,
      "alerta": 25000,
      "direccion": "menorMejor"
    }
  },
  "calidad": {
    "avisos": [
      {
        "nivel": "alto",
        "titulo": "Sin archivo de costos",
        "detalle": "No hay archivo de costos en data/entrada/: ninguna categoría va a tener margen. Las unidades y el ingreso sí se calculan."
      },
      {
        "nivel": "medio",
        "titulo": "Filas con ingreso y cero unidades",
        "detalle": "8 líneas traen ingreso pero 0 unidades (ajustes o cambios). Su ingreso sí entra a los totales; sus unidades, no. Por eso el ingreso por unidad de esas filas no cuadra."
      },
      {
        "nivel": "alto",
        "titulo": "SKU sin referencia legible",
        "detalle": "1 líneas no dejaron extraer una referencia de 6 dígitos del SKU. Esas unidades cuentan en el total pero no cruzan con costos. Ajusta el patrón en scripts/config.mjs → SKU.referencia."
      },
      {
        "nivel": "alto",
        "titulo": "Sin atribución por canal",
        "detalle": "El ingreso no se puede abrir por origen: la dona muestra el reparto de la inversión entre plataformas, y el margen bruto de pauta y el múltiplo invertido quedan sin dato. Para abrir el ingreso por canal hace falta una columna de canal por pedido en el export de Shopify (canal de venta, o utm_source/utm_medium)."
      },
      {
        "nivel": "alto",
        "titulo": "Las plataformas se atribuyen más ventas de las que hubo",
        "detalle": "Meta y Google suman 267% del ingreso neto real entre las dos. Por eso el KPI hero usa MER (ingreso real ÷ inversión) y el ROAS de plataforma solo aparece en la lectura de pauta, marcado como dato reportado por Meta."
      },
      {
        "nivel": "medio",
        "titulo": "Sin metas comerciales",
        "detalle": "No hay meta de ingreso ni presupuesto de pauta en scripts/config.mjs → METAS. El KPI se muestra sin semáforo de cumplimiento."
      },
      {
        "nivel": "medio",
        "titulo": "Categorías sin ventas en el periodo",
        "detalle": "Cinturilla, Brasier no tienen unidades en los archivos cargados. Aparecen en cero, no ocultas."
      },
      {
        "nivel": "medio",
        "titulo": "Las referencias excluidas no aparecen en esta carga",
        "detalle": "026950 y 092961 no salen en el export de Shopify de este periodo, así que la exclusión no cambió ningún número. La regla sigue activa para cargas futuras."
      },
      {
        "nivel": "medio",
        "titulo": "Leads sin fuente",
        "detalle": "El reporte semanal manual de Kuvady no está entre los archivos de entrada; el bloque de leads queda vacío."
      },
      {
        "nivel": "alto",
        "titulo": "Semanas de pauta fuera de rango",
        "detalle": "12 ago y 19 ago: el CPA se sale de la valla estadística (Q3 + 1·IQR = 44.153) frente a una mediana de 37.613. Están resaltadas en la lectura de pauta."
      }
    ],
    "excluidas": {
      "unidades": 0,
      "ingresoBruto": 0,
      "porReferencia": {}
    },
    "hayCostos": false
  },
  "atribucion": {
    "disponible": false,
    "modo": "inversion",
    "motivo": "El export de ventas de Shopify no trae canal por pedido, así que el ingreso no se puede repartir entre pauta, orgánico y otro.",
    "faltante": "Para abrir el ingreso por canal hace falta una columna de canal por pedido en el export de Shopify (canal de venta, o utm_source/utm_medium).",
    "seniales": {
      "googleValorConversion": 128586027.86999999,
      "metaValorCompras": 217529616.736797,
      "ingresoNetoRango": 129808037.23999983
    }
  },
  "pauta": {
    "semanas": [
      {
        "desde": "2026-07-01",
        "hasta": "2026-07-07",
        "gasto": 3142076,
        "compras": 95,
        "cpa": 33074.484210526316,
        "ctr": 0.026394627822349418,
        "roasPlataforma": 7.646288561165611,
        "clics": 9850,
        "impresiones": 373182,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-07-08",
        "hasta": "2026-07-14",
        "gasto": 3444267,
        "compras": 89,
        "cpa": 38699.629213483146,
        "ctr": 0.025802560335549486,
        "roasPlataforma": 6.846354944830642,
        "clics": 9326,
        "impresiones": 361437,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-07-15",
        "hasta": "2026-07-21",
        "gasto": 2708123,
        "compras": 72,
        "cpa": 37612.819444444445,
        "ctr": 0.02476032807104908,
        "roasPlataforma": 7.115081252663192,
        "clics": 7508,
        "impresiones": 303227,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-07-22",
        "hasta": "2026-07-28",
        "gasto": 3333668,
        "compras": 87,
        "cpa": 38318.02298850575,
        "ctr": 0.0275156567366283,
        "roasPlataforma": 5.470763653129525,
        "clics": 10404,
        "impresiones": 378112,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-07-29",
        "hasta": "2026-08-04",
        "gasto": 2146926,
        "compras": 76,
        "cpa": 28249.026315789473,
        "ctr": 0.0310793449879298,
        "roasPlataforma": 7.84960682980876,
        "clics": 8201,
        "impresiones": 263873,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-08-05",
        "hasta": "2026-08-11",
        "gasto": 2612453,
        "compras": 80,
        "cpa": 32655.6625,
        "ctr": 0.02590444657956442,
        "roasPlataforma": 6.530460145703674,
        "clics": 9733,
        "impresiones": 375727,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-08-12",
        "hasta": "2026-08-18",
        "gasto": 3306397,
        "compras": 70,
        "cpa": 47234.24285714285,
        "ctr": 0.023791569263253147,
        "roasPlataforma": 4.745218330791493,
        "clics": 12620,
        "impresiones": 530440,
        "gastoPendiente": 0,
        "fueraDeRango": true
      },
      {
        "desde": "2026-08-19",
        "hasta": "2026-08-25",
        "gasto": 3625586,
        "compras": 78,
        "cpa": 46481.8717948718,
        "ctr": 0.024677239323573626,
        "roasPlataforma": 4.567719516356804,
        "clics": 15299,
        "impresiones": 619964,
        "gastoPendiente": 0,
        "fueraDeRango": true
      },
      {
        "desde": "2026-08-26",
        "hasta": "2026-09-01",
        "gasto": 3626419,
        "compras": 121,
        "cpa": 29970.404958677685,
        "ctr": 0.029151670417889703,
        "roasPlataforma": 7.760120174238002,
        "clics": 14053,
        "impresiones": 482065,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-09-02",
        "hasta": "2026-09-08",
        "gasto": 3623760,
        "compras": 95,
        "cpa": 38144.84210526316,
        "ctr": 0.028947348652729472,
        "roasPlataforma": 5.786699375993444,
        "clics": 15414,
        "impresiones": 532484,
        "gastoPendiente": 0,
        "fueraDeRango": false
      },
      {
        "desde": "2026-09-09",
        "hasta": "2026-09-13",
        "gasto": 2492365,
        "compras": 69,
        "cpa": 36121.23188405797,
        "ctr": 0.029435182448759627,
        "roasPlataforma": 6.878270193730855,
        "clics": 8466,
        "impresiones": 287615,
        "gastoPendiente": 30333,
        "fueraDeRango": false
      }
    ],
    "mediana": 37612.819444444445,
    "limite": 44152.57884672574,
    "k": 1,
    "nota": "Semanas tal como las reporta Meta (miércoles a martes), no semanas ISO.",
    "totales": {
      "gasto": 34062040,
      "compras": 932,
      "clics": 120874,
      "impresiones": 4508126
    }
  },
  "serieSemanal": [
    {
      "semana": "S32",
      "clave": "2026-W32",
      "rango": "3 ago–9 ago",
      "total": 12570713.490000011,
      "unidades": 98,
      "sinClasificar": 0,
      "actual": false,
      "enMes": null
    },
    {
      "semana": "S33",
      "clave": "2026-W33",
      "rango": "10 ago–16 ago",
      "total": 11393675.680000003,
      "unidades": 83,
      "sinClasificar": 0,
      "actual": false,
      "enMes": null
    },
    {
      "semana": "S34",
      "clave": "2026-W34",
      "rango": "17 ago–23 ago",
      "total": 16648953.00000001,
      "unidades": 138,
      "sinClasificar": 0,
      "actual": false,
      "enMes": null
    },
    {
      "semana": "S35",
      "clave": "2026-W35",
      "rango": "24 ago–30 ago",
      "total": 16771490.790000005,
      "unidades": 132,
      "sinClasificar": 0,
      "actual": false,
      "enMes": null
    },
    {
      "semana": "S36",
      "clave": "2026-W36",
      "rango": "31 ago–6 sep",
      "total": 19345053.85000001,
      "unidades": 155,
      "sinClasificar": 0,
      "actual": false,
      "enMes": "parcial"
    },
    {
      "semana": "S37",
      "clave": "2026-W37",
      "rango": "7 sep–13 sep",
      "total": 12173697.370000008,
      "unidades": 93,
      "sinClasificar": 0,
      "actual": true,
      "enMes": "completa"
    }
  ],
  "periodos": {
    "semana": {
      "etiqueta": "Semana",
      "rango": "7 sep – 13 sep",
      "comparativo": "vs. semana anterior",
      "desde": "2026-09-07",
      "hasta": "2026-09-13",
      "mer": {
        "base": "meta",
        "etiquetaBase": "inversión Meta",
        "valor": 3.4508634800048226,
        "inversionBase": 3527724.9999999995,
        "valorTotal": 2.509134819573389,
        "inversionTotal": 4851751
      },
      "inversionPauta": {
        "total": 4851751,
        "meta": 3527724.9999999995,
        "google": 1324026,
        "excluidoB2B": 103222,
        "campanasPendientes": [
          {
            "nombre": "Mensajes a Wpp | Sector Médico y Estético | Sep 2026 Campaña",
            "gasto": 30333
          }
        ],
        "gastoDirecto": {
          "Short": 798741.8571428572
        },
        "gastoGeneral": 4053009.1428571427,
        "plataformas": [
          {
            "nombre": "Meta Ads",
            "valor": 3527724.9999999995
          },
          {
            "nombre": "Google Ads",
            "valor": 1324026
          }
        ]
      },
      "presupuestoPauta": null,
      "metaIngresoNeto": null,
      "ingresoNetoPrevio": 19345053.85000002,
      "categorias": [
        {
          "id": "fajas",
          "nombre": "Fajas",
          "incluye": [
            "Fajas",
            "Faja Reloj de Arena",
            "Fajas Indigo",
            "Mediana Compresión",
            "Línea Luxury",
            "Postquirúrgico",
            "Body Sculptor"
          ],
          "unidades": 3,
          "ingresoBruto": 546806.73,
          "descuento": 54680.67,
          "ingresoNeto": 492126.06,
          "precioVenta": 182268.91,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 3,
            "pct": 0,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [
              {
                "referencia": "012271",
                "unidades": 3,
                "luxury": false
              }
            ],
            "luxuryPendiente": false
          },
          "pauta": {
            "directo": 0,
            "prorrateado": 130742.23041474653,
            "total": 130742.23041474653,
            "unidades": 3,
            "costoUnitarioPauta": 43580.74347158218
          },
          "codigos": [
            {
              "codigo": "(sin código)",
              "usos": 3,
              "monto": 54680.67
            }
          ],
          "notas": null
        },
        {
          "id": "short",
          "nombre": "Short",
          "incluye": [
            "Short",
            "Short Luxury",
            "Panty Moldeador"
          ],
          "unidades": 90,
          "ingresoBruto": 12500710.05000001,
          "descuento": 819138.7399999998,
          "ingresoNeto": 11681571.31000001,
          "precioVenta": 138896.77833333344,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 90,
            "pct": 0,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [
              {
                "referencia": "024640",
                "unidades": 15,
                "luxury": false
              },
              {
                "referencia": "024550",
                "unidades": 14,
                "luxury": false
              },
              {
                "referencia": "024670",
                "unidades": 13,
                "luxury": false
              },
              {
                "referencia": "024500",
                "unidades": 7,
                "luxury": false
              },
              {
                "referencia": "024580",
                "unidades": 6,
                "luxury": false
              },
              {
                "referencia": "024940",
                "unidades": 5,
                "luxury": false
              },
              {
                "referencia": "224520",
                "unidades": 4,
                "luxury": true
              },
              {
                "referencia": "024520",
                "unidades": 4,
                "luxury": false
              },
              {
                "referencia": "224650",
                "unidades": 3,
                "luxury": true
              },
              {
                "referencia": "024650",
                "unidades": 3,
                "luxury": false
              },
              {
                "referencia": "024900",
                "unidades": 3,
                "luxury": false
              },
              {
                "referencia": "504520",
                "unidades": 2,
                "luxury": true
              }
            ],
            "luxuryPendiente": true
          },
          "pauta": {
            "directo": 798741.8571428572,
            "prorrateado": 3922266.9124423964,
            "total": 4721008.769585254,
            "unidades": 90,
            "costoUnitarioPauta": 52455.652995391705
          },
          "codigos": [
            {
              "codigo": "(sin código)",
              "usos": 83,
              "monto": 819138.7399999998
            }
          ],
          "notas": null
        },
        {
          "id": "cinturilla",
          "nombre": "Cinturilla",
          "incluye": [
            "Chaleco y Cinturilla"
          ],
          "unidades": 0,
          "ingresoBruto": 0,
          "descuento": 0,
          "ingresoNeto": 0,
          "precioVenta": 0,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 0,
            "pct": null,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [],
            "luxuryPendiente": false
          },
          "pauta": {
            "directo": 0,
            "prorrateado": 0,
            "total": 0,
            "unidades": 0,
            "costoUnitarioPauta": null
          },
          "codigos": [],
          "notas": null
        },
        {
          "id": "brasier",
          "nombre": "Brasier",
          "incluye": [
            "Brasier",
            "Bra Luxury"
          ],
          "unidades": 0,
          "ingresoBruto": 0,
          "descuento": 0,
          "ingresoNeto": 0,
          "precioVenta": 0,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 0,
            "pct": null,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [],
            "luxuryPendiente": false
          },
          "pauta": {
            "directo": 0,
            "prorrateado": 0,
            "total": 0,
            "unidades": 0,
            "costoUnitarioPauta": null
          },
          "codigos": [],
          "notas": null
        }
      ],
      "sinClasificar": {
        "unidades": 0,
        "ingresoNeto": 0,
        "motivos": []
      },
      "leads": null
    },
    "mes": {
      "etiqueta": "Acumulado del mes",
      "rango": "1 sep – 13 sep",
      "comparativo": "vs. periodo anterior",
      "desde": "2026-09-01",
      "hasta": "2026-09-13",
      "mer": {
        "base": "meta",
        "etiquetaBase": "inversión Meta",
        "valor": 4.264653415489052,
        "inversionBase": 6634184.857142856,
        "valorTotal": 3.09723275398944,
        "inversionTotal": 9134766.857142856
      },
      "inversionPauta": {
        "total": 9134766.857142856,
        "meta": 6634184.857142856,
        "google": 2500582,
        "excluidoB2B": 103222,
        "campanasPendientes": [
          {
            "nombre": "Mensajes a Wpp | Sector Médico y Estético | Sep 2026 Campaña",
            "gasto": 30333
          }
        ],
        "gastoDirecto": {
          "Short": 1509663.7142857143
        },
        "gastoGeneral": 7625103.142857142,
        "plataformas": [
          {
            "nombre": "Meta Ads",
            "valor": 6634184.857142856
          },
          {
            "nombre": "Google Ads",
            "valor": 2500582
          }
        ]
      },
      "presupuestoPauta": null,
      "metaIngresoNeto": null,
      "ingresoNetoPrevio": null,
      "categorias": [
        {
          "id": "fajas",
          "nombre": "Fajas",
          "incluye": [
            "Fajas",
            "Faja Reloj de Arena",
            "Fajas Indigo",
            "Mediana Compresión",
            "Línea Luxury",
            "Postquirúrgico",
            "Body Sculptor"
          ],
          "unidades": 5,
          "ingresoBruto": 911344.55,
          "descuento": 91134.45,
          "ingresoNeto": 820210.1000000001,
          "precioVenta": 182268.91,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 5,
            "pct": 0,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [
              {
                "referencia": "012271",
                "unidades": 5,
                "luxury": false
              }
            ],
            "luxuryPendiente": false
          },
          "pauta": {
            "directo": 0,
            "prorrateado": 172513.6457659987,
            "total": 172513.6457659987,
            "unidades": 5,
            "costoUnitarioPauta": 34502.72915319974
          },
          "codigos": [
            {
              "codigo": "(sin código)",
              "usos": 5,
              "monto": 91134.45
            }
          ],
          "notas": null
        },
        {
          "id": "short",
          "nombre": "Short",
          "incluye": [
            "Short",
            "Short Luxury",
            "Panty Moldeador"
          ],
          "unidades": 216,
          "ingresoBruto": 30481267.910000034,
          "descuento": 3008978.9000000013,
          "ingresoNeto": 27472289.01000003,
          "precioVenta": 141116.98106481496,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 216,
            "pct": 0,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [
              {
                "referencia": "024640",
                "unidades": 40,
                "luxury": false
              },
              {
                "referencia": "024550",
                "unidades": 24,
                "luxury": false
              },
              {
                "referencia": "024670",
                "unidades": 23,
                "luxury": false
              },
              {
                "referencia": "014640",
                "unidades": 21,
                "luxury": false
              },
              {
                "referencia": "024678",
                "unidades": 19,
                "luxury": false
              },
              {
                "referencia": "224520",
                "unidades": 11,
                "luxury": true
              },
              {
                "referencia": "224640",
                "unidades": 10,
                "luxury": true
              },
              {
                "referencia": "024500",
                "unidades": 8,
                "luxury": false
              },
              {
                "referencia": "224650",
                "unidades": 7,
                "luxury": true
              },
              {
                "referencia": "504930",
                "unidades": 7,
                "luxury": true
              },
              {
                "referencia": "024930",
                "unidades": 7,
                "luxury": false
              },
              {
                "referencia": "024900",
                "unidades": 7,
                "luxury": false
              }
            ],
            "luxuryPendiente": true
          },
          "pauta": {
            "directo": 1509663.7142857143,
            "prorrateado": 7452589.497091142,
            "total": 8962253.211376857,
            "unidades": 216,
            "costoUnitarioPauta": 41491.913015633596
          },
          "codigos": [
            {
              "codigo": "(sin código)",
              "usos": 169,
              "monto": 3008978.9000000013
            }
          ],
          "notas": null
        },
        {
          "id": "cinturilla",
          "nombre": "Cinturilla",
          "incluye": [
            "Chaleco y Cinturilla"
          ],
          "unidades": 0,
          "ingresoBruto": 0,
          "descuento": 0,
          "ingresoNeto": 0,
          "precioVenta": 0,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 0,
            "pct": null,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [],
            "luxuryPendiente": false
          },
          "pauta": {
            "directo": 0,
            "prorrateado": 0,
            "total": 0,
            "unidades": 0,
            "costoUnitarioPauta": null
          },
          "codigos": [],
          "notas": null
        },
        {
          "id": "brasier",
          "nombre": "Brasier",
          "incluye": [
            "Brasier",
            "Bra Luxury"
          ],
          "unidades": 0,
          "ingresoBruto": 0,
          "descuento": 0,
          "ingresoNeto": 0,
          "precioVenta": 0,
          "costoUnitario": null,
          "margenBrutoUnitario": null,
          "cobertura": {
            "unidadesConCosto": 0,
            "unidadesTotales": 0,
            "pct": null,
            "niveles": {
              "1": 0,
              "2": 0,
              "3": 0
            },
            "referenciasSinCosto": [],
            "luxuryPendiente": false
          },
          "pauta": {
            "directo": 0,
            "prorrateado": 0,
            "total": 0,
            "unidades": 0,
            "costoUnitarioPauta": null
          },
          "codigos": [],
          "notas": null
        }
      ],
      "sinClasificar": {
        "unidades": 0,
        "ingresoNeto": 0,
        "motivos": []
      },
      "leads": null
    }
  }
};
