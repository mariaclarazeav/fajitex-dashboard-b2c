# data/entrada/

Aquí van los CSV que se descargan a mano. **No se versionan** (ver `.gitignore`):
son datos de negocio en bruto.

Deja los cuatro archivos y corre:

```bash
node scripts/ingesta.mjs
```

El script los identifica por su encabezado, no por el nombre del archivo, así
que puedes dejarlos con el nombre que traigan de cada plataforma.

| Archivo | Se reconoce porque trae | Columnas que usa |
|---|---|---|
| Ventas Shopify | `sku` y `unidades_vendidas` | `fecha, sku, categoria, unidades_vendidas, ingreso_bruto, descuento_aplicado, codigo_descuento` |
| Meta Ads | `Nombre de la campaña` e `Importe gastado` | `Inicio del informe, Fin del informe, Nombre de la campaña, Clics (todos), CTR (todos), Costo por resultados, Indicador de resultado, Importe gastado (COP)` |
| Google Ads | `Valor de conv.` | `Fecha, Coste, Conversiones, Valor de conv., Clics` |
| Costos por SKU | `Referencia` y `Costo prom.` | `Referencia, Detalle ext. 2 (talla), Detalle ext. 1 (color), Desc. item, Promedio de Costo prom. unit.` |

Aceptan separador `,` `;` o tabulador, números en formato colombiano
(`1.234.567,89`) o inglés, y filas de adorno antes del encabezado.

Cuando llegue el archivo de costos de la línea Luxury, déjalo aquí junto al
otro: se suman al mismo cruce sin tocar nada más.
