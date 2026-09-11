# Fajitex · Dashboard digital B2C

Dashboard diario de resultados digitales B2C. Publicado con GitHub Pages, sin
paso de compilación: HTML, CSS y JS planos, con Chart.js por CDN.

> **Fase 1 — datos de ejemplo.** Las cifras que se ven son ilustrativas y no
> corresponden a resultados de Fajitex. La conexión a Shopify, Meta Ads y al
> reporte manual de Kuvady es la fase 2.

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
index.html              Vista única
assets/styles.css       Tokens de marca, semáforo y layout
assets/app.js           Derivación de indicadores, semáforo y gráficas
data/sample-data.js     Cifras primarias de ejemplo (window.FAJITEX_DATA)
scripts/                Ingesta de datos — fase 2 (ver scripts/README.md)
```

## Correr en local

No requiere build. Cualquier servidor estático sirve:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publicar en GitHub Pages

En **Settings → Pages**, elegir *Deploy from a branch*, la rama del proyecto y la
carpeta `/ (root)`. El archivo `.nojekyll` evita que Jekyll procese el sitio.

## Pendiente para la fase 2

- Conectar Shopify, Meta Ads y el reporte manual de Kuvady (`scripts/`).
- Reemplazar `data/sample-data.js` con datos reales y poner `meta.esEjemplo` en `false`.
- Quitar el aviso "Datos de ejemplo" de `index.html`.
- Confirmar los códigos de color exactos contra el manual de marca: los hex
  actuales son una lectura aproximada de la referencia visual.
