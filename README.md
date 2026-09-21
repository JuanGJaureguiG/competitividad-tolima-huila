# Competitividad Territorial — Tolima & Huila (IDC 2026)

Tablero de control sobre el Índice Departamental de Competitividad (IDC) 2026,
construido a partir de la presentación `IDC_2026_Tolima_-_Huila.pptx`
(Consejo Privado de Competitividad y Universidad del Rosario).

## Contenido del repositorio

```
index.html      → estructura de la página
styles.css      → estilos (mismo sistema visual que los demás tableros STH)
app.js          → filtros, KPIs, gráficos (Chart.js) y tablas
data.json       → datos agregados: 13 pilares, 24 subpilares, 93 indicadores
build_data.py   → script que genera data.json a partir de la presentación
```

## Qué contiene

- **Panorama**: puntaje por pilar, radar Tolima vs Huila, puntaje por factor,
  mapa de posiciones, escalafón general IDC 2026 y fortalezas/brechas automáticas.
- **Pilares**: detalle de cada uno de los 13 pilares — subpilares, evolución
  2019-2026, indicadores y ficha técnica (cálculo y fuente) de cada uno.
- **Indicadores**: los 93 indicadores en una sola tabla filtrable y ordenable,
  con distribución de posiciones y brechas por pilar.
- **Histórico 2019-2026**: serie completa por pilar, cambios 2025→2026 y 2019→2026.
- **Metodología y fuentes**: cómo leer el tablero, cambios metodológicos del
  IDC 2026 y qué dato viene de cada fuente.

## Origen de los datos

- **De la presentación IDC 2026**: puntajes y puestos de pilares, subpilares
  e indicadores; promedio nacional y Top 10; serie histórica; cálculo y fuente
  de cada indicador.
- **De fuentes públicas del IDC 2026** (no vienen en la presentación): puesto
  general de Tolima (#12; 2025: #11) y Huila (#14; 2025: #15), y el escalafón
  completo de los 33 territorios. Tomado del Consejo Privado de Competitividad,
  la Universidad del Rosario, prensa regional (Diario del Huila, La Nación) y
  el resumen de la Cámara de Comercio de Manizales por Caldas.
- **Calculado en el tablero**: puntaje general de Tolima y Huila, como el
  promedio simple de sus 13 pilares (así lo calcula el IDC; se verificó que
  reproduce el promedio nacional publicado y el puntaje 2025 de Tolima).

## Cómo actualizar los datos

Cuando salga una nueva edición del IDC, si viene en una presentación con la
misma estructura (una diapositiva de resumen, y por cada pilar: Resultado,
Histórico, Puntajes-Puestos-Año y Metodología):

1. Reemplaza el archivo de origen en `build_data.py` (o pásalo como argumento:
   `python3 build_data.py nueva_presentacion.pptx`).
2. Ejecuta `python3 build_data.py` (requiere `python-pptx`: `pip install python-pptx`).
3. Revisa los mensajes `SIN META` / `SIN HIST` que imprime si algo no calzó.
4. Actualiza a mano el bloque `externo` en `build_data.py` (puesto general,
   escalafón) con los datos de la nueva edición, si cambian.
5. Sustituye el `data.json` generado y súbelo al repositorio.

## Publicar en GitHub Pages

Sube estos archivos a la raíz del repositorio (o reemplázalos por nombre en
uno existente) y activa GitHub Pages en Settings → Pages.
