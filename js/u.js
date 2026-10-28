/* Umbrhalia · utilidades comunes del prototipo.
   Sin servidor: lo que la persona aporta se guarda solo en su navegador (localStorage). */
var U = (function () {
  var ROOT = document.documentElement.getAttribute('data-root') || './';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var CLAVE = 'umbrhalia.testimonio';

  // Primeros testigos: registros históricos con su fuente.
  var TESTIGOS = [
    { lat: 18.804, lng: -99.296, ano: '664', lugar: 'Xochicalco, Morelos',
      texto: 'En el friso de la Pirámide de las Serpientes Emplumadas, una quijada muerde un disco solar. La reconstrucción astronómica sitúa un eclipse el 1 de mayo de 664 (calendario juliano) muy cerca del sitio.',
      fuente: 'Registro arqueológico; fecha reconstruida por cálculo astronómico.' },
    { lat: 36.07, lng: -107.99, ano: '1097', lugar: 'Cañón del Chaco, Nuevo México',
      texto: 'Un petroglifo cerca de Peñasco Blanco se ha interpretado como la corona del eclipse total de 1097: un registro sin palabras, solo forma.',
      fuente: 'Interpretación del High Altitude Observatory (UCAR).' },
    // 1496 oculto (28 oct 2026): según los elementos de la NASA, la umbra del 8 ago 1496 pasó a unos 110–125 km de Tenochtitlan. [POR CONFIRMAR]
    { oculto: true, lat: 19.435, lng: -99.133, ano: '1496', lugar: 'Tenochtitlan',
      texto: '«Un eclipse total del Sol, tan oscuro como la noche más profunda, y las estrellas se vieron con total claridad». Tres fuentes independientes registran el mismo eclipse: el Códice Telleriano-Remensis, el Códice Borgia y Chimalpahin.',
      fuente: 'Chimalpahin, citado por Aveni y Calnek (1999).' },
    { lat: 19.426, lng: -99.128, ano: '1691', lugar: 'Ciudad de México',
      texto: '«Se vieron las estrellas, cantaron los gallos y quedó como a prima noche oscuro a las nueve del día». Mientras la plaza corría, Sigüenza y Góngora miraba el Sol con su anteojo, «en extremo alegre».',
      fuente: 'Antonio de Robles y Carlos de Sigüenza y Góngora, en Trabulse (2000).' },
    { lat: 51.507, lng: -0.128, ano: '1715', lugar: 'Londres',
      texto: 'Edmond Halley publica el primer mapa de un eclipse visto desde arriba, «para que la súbita oscuridad no tome por sorpresa a la gente», e invita al público a medir la totalidad.',
      fuente: 'Pasachoff (1999).' }
  ].filter(function (t) { return !t.oculto; });

  // Palabras tomadas de esos testimonios (no son testimonios inventados).
  // Solo las que sostienen las citas mostradas (auditoría de rigor, 28 oct 2026).
  var PALABRAS_TESTIGOS = ['estrellas', 'noche', 'gallos', 'oscuridad', 'alegre'];

  var _eclipses = null;
  function eclipses() {
    if (_eclipses) return _eclipses;
    _eclipses = fetch(ROOT + 'assets/data/eclipses.geojson').then(function (r) { return r.json(); });
    return _eclipses;
  }

  function fecha(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' de ' + MESES[parseInt(p[1], 10) - 1] + ' de ' + p[0];
  }
  function fechaCorta(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' ' + MESES[parseInt(p[1], 10) - 1].slice(0, 3) + ' ' + p[0];
  }
  function duracion(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m > 0 ? m + '\u00a0min\u00a0' + r + '\u00a0s' : r + '\u00a0s';
  }
  function hoyISO() { return new Date().toISOString().slice(0, 10); }
  function diasHasta(iso) {
    var d = new Date(iso + 'T00:00:00Z') - new Date(hoyISO() + 'T00:00:00Z');
    return Math.round(d / 86400000);
  }

  function proximos(n) {
    return eclipses().then(function (data) {
      var hoy = hoyISO();
      return data.features
        .map(function (f) { return f.properties; })
        .filter(function (p) { return p.date >= hoy; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
        .slice(0, n);
    });
  }

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || null; } catch (e) { return null; }
  }
  function guardar(obj) {
    try { localStorage.setItem(CLAVE, JSON.stringify(obj)); } catch (e) { /* modo privado: el flujo sigue sin guardar */ }
  }

  function mapaBase(el, opciones) {
    // La rueda y el arrastre en móvil no mueven el mapa hasta ampliarlo: así la página se desplaza sin quedar atrapada.
    var map = L.map(el, Object.assign({ worldCopyJump: true, minZoom: 1, maxZoom: 7, zoomSnap: 0.5, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false }, opciones || {}))
      .setView([18, -60], 1.5);
    ampliable(map);
    map.attributionControl.setPrefix(false);
    fetch(ROOT + 'assets/data/world.geojson').then(function (r) { return r.json(); }).then(function (world) {
      L.geoJSON(world, { style: { color: '#ececee', weight: 0.6, opacity: 0.45, fill: false }, interactive: false }).addTo(map);
    });
    return map;
  }
  // Botón circular para ampliar el mapa a pantalla completa; ampliado, la rueda y el arrastre sí lo mueven.
  function ampliable(map) {
    var el = map.getContainer();
    if (el.querySelector('.mapa-ampliar')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mapa-ampliar';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Ampliar el mapa');
    b.innerHTML = '<span aria-hidden="true">+</span>';
    L.DomEvent.disableClickPropagation(b);
    el.appendChild(b);
    function poner(ampliado) {
      el.classList.toggle('mapa-ampliado', ampliado);
      document.documentElement.classList.toggle('sin-scroll', ampliado);
      b.setAttribute('aria-pressed', String(ampliado));
      b.setAttribute('aria-label', ampliado ? 'Cerrar el mapa ampliado' : 'Ampliar el mapa');
      b.innerHTML = '<span aria-hidden="true">' + (ampliado ? '×' : '+') + '</span>';
      if (ampliado) { map.scrollWheelZoom.enable(); map.dragging.enable(); }
      else { map.scrollWheelZoom.disable(); if (L.Browser.mobile) map.dragging.disable(); }
      setTimeout(function () { map.invalidateSize(); }, 50);
    }
    b.addEventListener('click', function () { poner(!el.classList.contains('mapa-ampliado')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('mapa-ampliado')) { poner(false); b.focus(); }
    });
  }
  function estiloFranja(activa) {
    return activa
      ? { color: '#DA291C', weight: 1.6, fillColor: '#DA291C', fillOpacity: 0.45, opacity: 1 }
      : { color: '#ececee', weight: 0.5, fillColor: '#ececee', fillOpacity: 0.035, opacity: 0.22 };
  }
  function capaTestigos(map) {
    var icono = L.divIcon({ className: '', html: '<div class="testigo-marca"></div>', iconSize: [14, 14] });
    TESTIGOS.forEach(function (t) {
      L.marker([t.lat, t.lng], { icon: icono, title: t.lugar + ', ' + t.ano })
        .bindPopup('<strong>' + t.ano + ' · ' + t.lugar + '</strong><br>' + t.texto + '<br><span style="color:#9a9aa2">' + t.fuente + '</span>')
        .addTo(map);
    });
  }
  function marcaPalabra(map, lat, lng, palabra, mia) {
    var icono = L.divIcon({ className: '', html: '<span class="palabra-marca' + (mia ? ' mia' : '') + '">' + escapar(palabra) + '</span>', iconSize: null });
    return L.marker([lat, lng], { icon: icono, keyboard: false, interactive: false }).addTo(map);
  }
  // Un punto sobre la franja (no el centro de su rectángulo, que puede caer fuera de la curva).
  function puntoEnFranja(feature) {
    var g = feature.geometry;
    var ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];
    var n = ring.length, k = Math.floor(n / 4), a = ring[k], b = ring[n - 1 - k];
    return [(a[1] + b[1]) / 2, (a[0] + b[0]) / 2];
  }
  // Transiciones entre secciones (portada): las claras se abren con un recorte circular,
  // las oscuras con un fundido. Sin IntersectionObserver o con movimiento reducido, no hay animación.
  function transiciones() {
    var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducir || !('IntersectionObserver' in window)) return;
    var secciones = document.querySelectorAll('main section.claro, main section.oscuro:not(.portada)');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.documentElement.classList.add('con-transiciones');
    secciones.forEach(function (s) { io.observe(s); });
  }
  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  return {
    ROOT: ROOT, TESTIGOS: TESTIGOS, PALABRAS_TESTIGOS: PALABRAS_TESTIGOS,
    eclipses: eclipses, proximos: proximos, fecha: fecha, fechaCorta: fechaCorta, duracion: duracion, diasHasta: diasHasta,
    leer: leer, guardar: guardar, mapaBase: mapaBase, estiloFranja: estiloFranja, capaTestigos: capaTestigos,
    marcaPalabra: marcaPalabra, escapar: escapar, puntoEnFranja: puntoEnFranja, transiciones: transiciones, ampliable: ampliable
  };
})();
