# Fajitex · Dashboard digital B2C

Dashboard diario de resultados digitales B2C. Publicado con GitHub Pages, sin
paso de compilación: HTML, CSS y JS planos, con Chart.js por CDN.

> **Estado: fase 2 — carga manual.** El repo trae datos de ejemplo sembrados.
> Para pasar a datos reales, deja los CSV en `data/entrada/` y corre
> `node scripts/ingesta.mjs`. No hay conexión API todavía.

## ⚠️ Antes de publicar con datos reales

Un sitio de GitHub Pages en un repositorio **público** es visible para
cualquiera, y `data/dashboard-data.js` contiene ingresos, márgenes, costos e
inversión en pauta. Antes de cargar datos reales, pon el repositorio en
**privado** y usa GitHub Pages con acceso restringido (requiere plan de pago),
o publica el dashboard en un hosting con autenticación. Los CSV en bruto de
`data/entrada/` ya están en `.gitignore` y no se suben.

## Qué muestra

- **Resumen general** — ingreso neto total, inversión en pauta, margen bruto de
  pauta y múltiplo invertido, cada uno con su estado de semáforo.
- **Ventas por canal** — participación (dona) y evolución semanal por canal con
  la línea del total (columnas apiladas + línea).
- **Categorías** — Fajas, Short, Cinturilla y Brasier, con drill-down a los
  códigos de descuento usados y las notas del periodo.
- **Leads por canal** — WhatsApp, Email marketing y SMS. Solo cantidades.
- **Toggle** Semana / Acumulado del mes, arriba a la derecha.

## Cómo se calcula

| Indicador | Fórmula |
|---|---|
| Ingreso neto | Ingreso bruto − descuento aplicado |
| Margen bruto de pauta | Utilidad bruta de pauta ÷ ventas atribuidas a pauta |
| Múltiplo invertido | Ganancia neta de pauta ÷ inversión en pauta |
| Costo unitario de pauta | Inversión del periodo rateada por categoría ÷ unidades de la categoría |
| Margen bruto unitario | (Precio de venta − costo) ÷ precio de venta |

La inversión se ratea por la participación de cada categoría en el ingreso neto.
Mientras no haya costo por pedido desde Shopify, la utilidad bruta de pauta se
estima aplicando el margen bruto ponderado del periodo a las ventas atribuidas.

Los umbrales del semáforo están en `umbrales`, dentro de `data/sample-data.js`, y
se pueden ajustar sin tocar el código.

## Diseño

Paleta y tipografía de marca, sin verde/rojo genéricos de semáforo: **en meta**
usa el morado de marca, **alerta** el dorado/champagne y **crítico** el chocolate
rojizo. El estado se ve dentro del propio dato —el fondo de la tarjeta hero, el
relleno de las barras, la barra de cada KPI— y nunca solo por color: siempre lo
acompaña una etiqueta de texto.

Tipografía: `Unbounded` en titulares y cifras, `Familjen Grotesk` en cuerpo y
tablas, `Instrument Serif` en itálica para una sola frase editorial por vista.

La paleta de las gráficas se validó contra los criterios de contraste y de
visión con deficiencia de color (banda de luminosidad, piso de croma, separación
CVD y contraste sobre la superficie).

## Estructura

```
index.html                Vista única
assets/styles.css         Tokens de marca, semáforo y layout
assets/app.js             Derivación de indicadores, semáforo y gráficas
data/dashboard-data.js    Lo que carga el dashboard (lo genera la ingesta)
data/sample-data.js       Semilla de ejemplo, para volver atrás
data/umbrales.json        Umbrales del semáforo
data/entrada/             Aquí van los CSV manuales (no se versionan)
scripts/                  Ingesta y pruebas (ver scripts/README.md)
```

## Cargar datos reales

```bash
# 1. deja los 4 CSV en data/entrada/  (ver data/entrada/LEEME.md)
node scripts/ingesta.mjs    # genera data/dashboard-data.js e imprime el informe
node scripts/pruebas.mjs    # 22 pruebas de las reglas de negocio
```

El script identifica cada archivo por su encabezado, tolera separadores `,` `;`
y tabulador, números en formato colombiano y filas de adorno antes de la tabla.

Todo lo que no se pueda calcular con los archivos cargados se muestra como
**"Sin dato" con el motivo**, nunca relleno con un supuesto. Hoy eso incluye el
margen bruto de pauta y el múltiplo invertido, que necesitan canal por pedido en
el export de Shopify. El detalle está en `scripts/README.md`.

Las reglas editables —mapeo de categorías, referencias excluidas, campañas B2B,
metas comerciales— viven todas en `scripts/config.mjs`.

## Correr en local

No requiere build. Cualquier servidor estático sirve:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publicar en GitHub Pages

En **Settings → Pages**, elegir *Deploy from a branch*, la rama del proyecto y la
carpeta `/ (root)`. El archivo `.nojekyll` evita que Jekyll procese el sitio.

## Pendiente

- **Canal por pedido en el export de Shopify.** Desbloquea la dona de canal, las
  columnas apiladas por canal, el margen bruto de pauta y el múltiplo invertido.
- **Archivo de costos de la línea Luxury** (referencias que empiezan en 2 o 5).
  Al dejarlo en `data/entrada/` la cobertura de Fajas sube sola.
- **Confirmar el mapeo de "Trusa"** a una de las 4 categorías, o dejarlo fuera
  de alcance de forma explícita.
- **Confirmar si la campaña** `Mensajes a Wpp | Sector Médico y Estético | Sep 2026 Campaña`
  es B2B o B2C. Hoy entra al total marcada como pendiente.
- **Metas comerciales y presupuesto de pauta** en `scripts/config.mjs → METAS`.
- **Reporte semanal de leads** (Kuvady), que hoy no tiene archivo de entrada.
- Confirmar los códigos de color exactos contra el manual de marca: los hex
  actuales son una lectura aproximada de la referencia visual.
