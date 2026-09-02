(function () {
  var mapEl = document.getElementById('mapa-trayectorias');
  if (!mapEl || typeof L === 'undefined') return;

  var map = L.map(mapEl, {
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 6,
    attributionControl: true,
  }).setView([20, 0], 2);

  L.control.attribution({ prefix: false }).addTo(map);

  fetch('assets/data/world.geojson')
    .then(function (r) { return r.json(); })
    .then(function (world) {
      L.geoJSON(world, {
        style: { color: '#e7e7ea', weight: 0.8, opacity: 0.55, fill: false },
        interactive: false,
      }).addTo(map);
    });

  function formatFecha(iso) {
    var partes = iso.split('-');
    var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return partes[2] + ' ' + meses[parseInt(partes[1], 10) - 1] + ' ' + partes[0];
  }

  fetch('assets/data/eclipses.geojson')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var capa = L.geoJSON(data, {
        style: function () {
          return {
            color: '#e0457b',
            weight: 1.2,
            fillColor: '#e0457b',
            fillOpacity: 0.18,
            opacity: 0.75,
          };
        },
        onEachFeature: function (feature, layer) {
          var p = feature.properties;
          var min = Math.floor(p.duration_s / 60);
          var seg = p.duration_s % 60;
          var duracion = min > 0 ? (min + 'm ' + seg + 's') : (seg + 's');
          layer.bindPopup(
            '<strong>' + formatFecha(p.date) + '</strong><br>' +
            'Duración de totalidad: ' + duracion + '<br>' +
            'Ancho de la franja: ' + p.path_width_km + ' km'
          );
          layer.on('mouseover', function () { layer.setStyle({ fillOpacity: 0.4, weight: 2 }); });
          layer.on('mouseout', function () { layer.setStyle({ fillOpacity: 0.18, weight: 1.2 }); });
        },
      }).addTo(map);
    })
    .catch(function (err) {
      mapEl.innerHTML = '<p class="nota-pendiente">No se pudo cargar el mapa de trayectorias en este momento.</p>';
      console.error('Error cargando eclipses.geojson', err);
    });
})();
