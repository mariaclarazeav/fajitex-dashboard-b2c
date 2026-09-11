# scripts/ — ingesta de datos (fase 2)

Esta carpeta queda reservada para los scripts de ingesta. **Hoy está vacía a
propósito: la fase 1 del dashboard no se conecta a ninguna fuente real.**

El dashboard lee un único objeto global, `window.FAJITEX_DATA`, definido en
`data/sample-data.js`. Para conectar datos reales no hace falta tocar
`index.html` ni `assets/app.js`: basta con que un script genere ese mismo archivo
con la misma forma.

## Contrato de datos

`data/sample-data.js` guarda **solo cifras primarias**. Todo lo derivado
(ingreso bruto y neto, costo unitario de pauta, margen, múltiplo invertido,
participación por canal) lo calcula `assets/app.js`, para que la fórmula viva en
un solo lugar.

Por categoría hay que entregar:

| Campo | Origen previsto |
|---|---|
| `unidades` | Shopify · líneas de pedido del periodo |
| `precioVenta` | Shopify · precio promedio ponderado |
| `costoUnitario` | Costo de producto (Shopify o maestro de costos) |
| `descuento` | Shopify · monto total descontado |
| `codigos[]` | Shopify · códigos de descuento aplicados (código, usos, monto) |
| `notas` | Redacción manual del equipo |

Por periodo:

| Campo | Origen previsto |
|---|---|
| `inversionPauta`, `presupuestoPauta` | Meta Ads |
| `mixCanal` | Shopify · atribución por canal |
| `metaIngresoNeto`, `ingresoNetoPrevio` | Plan comercial |
| `leads` | Reporte semanal manual (Kuvady) — no es dato en vivo |

**Validación mínima:** la suma de `codigos[].monto` de una categoría debe ser
igual a su `descuento`.

## Mapeo de categorías (cerrado)

| Categoría | `product_type` de Shopify |
|---|---|
| Fajas | Fajas, Faja Reloj de Arena, Fajas Indigo, Mediana Compresión, Línea Luxury, Postquirúrgico |
| Short | Short, Short Luxury |
| Cinturilla | Chaleco y Cinturilla |
| Brasier | Brasier, Bra Luxury |

Fuera de alcance en esta versión: Línea Masculina, Línea Médica, Accesorios y
productos sin `product_type`. Tampoco entra B2B.

## Notas de implementación

- Las credenciales van en secretos de GitHub Actions, nunca en el repositorio.
- Al conectar datos reales hay que quitar el aviso "Datos de ejemplo" de
  `index.html` y poner `meta.esEjemplo` en `false`.
