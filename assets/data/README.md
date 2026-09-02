# Datos del mapa de trayectorias

`eclipses.geojson` — 135 eclipses solares totales, 1900–2100.

**Fuente:** Servicio público ArcGIS `SolarEclipsePath` (`services.arcgis.com/6DIQcwlPy8knb6sg/.../SolarEclipsePath/FeatureServer`), preparado por Michael Zeiler con datos de Xavier Jubier. Dataset original: 905 eclipses solares, 1601–2200.

**Procesamiento:** filtrado a `EclType='T'` (total) y rango 1900–2100; geometría simplificada (tolerancia 0.03°, Douglas-Peucker vía Shapely, topología preservada) y coordenadas redondeadas a 3 decimales para reducir el tamaño de 6.3 MB a ~210 KB — el ancho real de cada trayectoria (90–300+ km) hace que esta simplificación sea imperceptible a escala de mapa mundial.

**Campos:** `name` (id del eclipse), `date` (YYYY-MM-DD), `magnitude`, `duration_s` (duración de totalidad en segundos), `path_width_km`.
