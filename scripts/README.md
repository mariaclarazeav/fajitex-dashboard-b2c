# scripts/ — ingesta de datos

Convierte los CSV de `data/entrada/` en `data/dashboard-data.js`, que es lo que
carga el dashboard. **No llama a ninguna API**: la carga es manual.

```bash
node scripts/ingesta.mjs     # genera data/dashboard-data.js
node scripts/pruebas.mjs     # corre las reglas de negocio contra los fixtures
```

Sin dependencias: solo Node. El script imprime un informe con lo que calculó y
con todo lo que quedó incompleto.

| Archivo | Qué hace |
|---|---|
| `config.mjs` | **Todas las reglas editables**: mapeo de categorías, exclusiones, campañas, patrón de SKU, metas. |
| `ingesta.mjs` | Orquesta: lee, cruza, agrega por periodo y escribe la salida. |
| `lib/csv.mjs` | Parser de CSV, números y fechas. |
| `lib/reglas.mjs` | Categorización, cruce SKU × costo, reparto de pauta. |
| `pruebas.mjs` | 22 pruebas que fijan cada regla de negocio. |
| `fixtures/` | CSV **inventados** para probar. No son datos de Fajitex. |

## Reglas implementadas

**Categorías** — el mapeo vive en `config.mjs → MAPEO_CATEGORIA`.

**Exclusiones a mano.** Las referencias `026950` (Línea Masculina) y `092961`
(Línea Médica) llegan etiquetadas como Fajas en Shopify. Se excluyen de todas
las categorías en la ingesta, sin esperar a que Shopify lo corrija. El informe
dice cuántas unidades se dejaron fuera.

**Sin clasificar.** Cualquier SKU cuya categoría o descripción contenga "Trusa"
va a un bucket aparte, con su motivo. Lo mismo para cualquier valor de
`categoria` que no esté en el mapeo. Nunca se descarta en silencio ni se le
asume categoría. Ese bucket **no entra** a los totales de las 4 categorías, pero
se muestra en el dashboard con sus unidades y su ingreso.

**Campañas B2B.** Las dos campañas confirmadas se restan del total B2C. La
campaña `Mensajes a Wpp | Sector Médico y Estético | Sep 2026 Campaña` (sin
"Yure") sí entra al total, marcada en el dashboard junto al KPI de inversión.
El cruce es por nombre exacto normalizado, así que "Wpp Yure" (B2B) y "Wpp"
(pendiente) no se confunden — hay una prueba que lo verifica.

**Costo por SKU — cascada de 4 niveles.** Por cada línea de venta:

1. referencia + color + talla
2. promedio de referencia + talla
3. promedio general de la referencia
4. sin coincidencia → la unidad **no entra al promedio ponderado de costo**,
   pero sí cuenta en las unidades vendidas de la categoría.

El margen se calcula sobre el mismo subconjunto de unidades que sí tiene costo
—precio y costo del mismo grupo—, porque mezclar el precio de todas las unidades
con el costo de algunas infla el margen.

**Cobertura.** Cada categoría reporta qué % de sus unidades tuvo costo. Si es
menor al 100%, el dashboard lo dice ("Margen calculado sobre 75% de las
unidades — línea Luxury pendiente de costeo") y el informe deja un aviso.

**Costo unitario de pauta.** Las campañas ya nombradas por categoría se asignan
directo; el resto del gasto —Meta B2C sin las B2B, más Google Ads— se prorratea
entre las 4 categorías a prorrata de sus unidades vendidas en la ventana. Las
unidades de "Sin clasificar" no participan del prorrateo.

Cuando una fila de Meta cubre un rango de fechas más ancho que el periodo, el
gasto se reparte por días, asumiendo gasto diario uniforme dentro del rango
reportado. Es la única repartición posible con las columnas disponibles.

## Lo que estos archivos no permiten calcular

El export de Shopify **no trae canal por pedido**. Sin eso no hay forma de saber
qué parte del ingreso vino de pauta, y sin eso no existen:

- la dona de participación por canal,
- las columnas apiladas por canal (quedan como ingreso neto total por semana),
- el **margen bruto de pauta**,
- el **múltiplo invertido**.

El dashboard muestra esos cuatro como "Sin dato" con el motivo, en vez de
rellenarlos con un supuesto. Se desbloquean añadiendo al export una columna de
canal por pedido (canal de venta, o `utm_source`/`utm_medium`).

Google Ads sí trae `Valor de conv.`, pero Meta no entrega valor de conversión en
las columnas pedidas, así que una atribución armada solo con Google sería
parcial y engañosa: no se usa para el mix.

**Metas comerciales.** No vinieron en los archivos. Están en `config.mjs → METAS`
en `null`, y mientras sigan así el hero muestra el ingreso sin semáforo de
cumplimiento y la tarjeta de inversión sin % de presupuesto.

**Leads.** El reporte semanal manual de Kuvady no está entre los archivos de
entrada, así que ese bloque queda vacío con su explicación.

## Volver a los datos de ejemplo

```bash
cp data/sample-data.js data/dashboard-data.js
```
