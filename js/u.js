/* Umbrhalia · utilidades comunes del prototipo.
   Sin servidor: lo que la persona aporta se guarda solo en su navegador (localStorage). */
var U = (function () {
  var ROOT = document.documentElement.getAttribute('data-root') || './';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var CLAVE = 'umbrhalia.testimonio';
  // Idioma de la página (<html lang>): las páginas en inglés viven en /en/. tr() elige el texto;
  // campo() toma la versión _en de un dato (álbum, testigos) y, si no existe, la original.
  var LANG = /^en/.test(document.documentElement.lang) ? 'en' : 'es';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function tr(es, en) { return LANG === 'en' ? en : es; }
  function campo(o, k) { return (LANG !== 'es' && o[k + '_' + LANG]) || o[k]; }
  // Nombre de un país, océano, tipo o lugar del catálogo; «Ciudad (País)» se traduce por partes.
  function nombre(s) {
    var N = LANG === 'en' && window.NOMBRES_EN;
    if (!N || !s) return s;
    if (N[s]) return N[s];
    var m = /^(.*) \((.*)\)$/.exec(s);
    if (m) return (N[m[1]] || m[1]) + ' (' + (N[m[2]] || m[2]) + ')';
    return N[s] || s;
  }

  // Primeros testigos: registros históricos con su fuente.
  var TESTIGOS = [
    { lat: 18.804, lng: -99.296, ano: '664', lugar: 'Xochicalco, Morelos',
      texto: 'En el friso de la Pirámide de las Serpientes Emplumadas, una quijada muerde un disco solar. La reconstrucción astronómica sitúa un eclipse el 1 de mayo de 664 (calendario juliano) muy cerca del sitio.',
      fuente: 'Registro arqueológico; fecha reconstruida por cálculo astronómico.',
      texto_en: 'On the frieze of the Pyramid of the Feathered Serpents, a jaw bites a solar disc. Astronomical reconstruction places an eclipse on 1 May 664 (Julian calendar) very close to the site.',
      fuente_en: 'Archaeological record; date reconstructed by astronomical calculation.' },
    { lat: 36.07, lng: -107.99, ano: '1097', lugar: 'Cañón del Chaco, Nuevo México',
      texto: 'Un petroglifo en la roca llamada Piedra del Sol se ha interpretado como la corona del eclipse total de 1097: un registro sin palabras, solo forma.',
      fuente: 'Interpretación del High Altitude Observatory (UCAR).',
      lugar_en: 'Chaco Canyon, New Mexico',
      texto_en: 'A petroglyph on the rock known as Piedra del Sol has been interpreted as the corona of the total eclipse of 1097: a record without words, only form.',
      fuente_en: 'Interpretation by the High Altitude Observatory (UCAR).' },
    // 1496 oculto (28 oct 2026): según los elementos de la NASA, la umbra del 8 ago 1496 pasó a unos 110–125 km de Tenochtitlan. [POR CONFIRMAR]
    { oculto: true, lat: 19.435, lng: -99.133, ano: '1496', lugar: 'Tenochtitlan',
      texto: '«Un eclipse total del Sol, tan oscuro como la noche más profunda, y las estrellas se vieron con total claridad». Tres fuentes independientes registran el mismo eclipse: el Códice Telleriano-Remensis, el Códice Borgia y Chimalpahin.',
      fuente: 'Chimalpahin, citado por Aveni y Calnek (1999).' },
    { lat: 19.426, lng: -99.128, ano: '1691', lugar: 'Ciudad de México',
      texto: '«Se vieron las estrellas, cantaron los gallos y quedó como a prima noche oscuro a las nueve del día». Mientras la plaza corría, Sigüenza y Góngora miraba el Sol con su anteojo, «en extremo alegre».',
      fuente: 'Antonio de Robles y Carlos de Sigüenza y Góngora, en Trabulse (2000).',
      lugar_en: 'Mexico City',
      texto_en: '“The stars were seen, the roosters crowed, and at nine in the morning it grew as dark as early night.” While the square ran, Sigüenza y Góngora watched the Sun through his spyglass, “extremely joyful.” (Translated from Spanish.)',
      fuente_en: 'Antonio de Robles and Carlos de Sigüenza y Góngora, in Trabulse (2000).' },
    { lat: 51.507, lng: -0.128, ano: '1715', lugar: 'Londres',
      texto: 'Edmond Halley publica el primer mapa de un eclipse visto desde arriba, «para que la súbita oscuridad no tome por sorpresa a la gente», e invita al público a medir la totalidad.',
      fuente: 'Pasachoff (1999).',
      lugar_en: 'London',
      texto_en: 'Edmond Halley publishes the first map of an eclipse seen from above, so that the sudden darkness would not take people by surprise, and invites the public to time the totality.',
      fuente_en: 'Pasachoff (1999).' }
  ].filter(function (t) { return !t.oculto; });

  // Palabras tomadas de esos testimonios (no son testimonios inventados).
  // Solo las que sostienen las citas mostradas (auditoría de rigor, 28 oct 2026).
  // En inglés, las mismas palabras traducidas (consulta I-11 abierta).
  var PALABRAS_TESTIGOS = LANG === 'en' ? ['stars', 'night', 'roosters', 'darkness', 'joyful'] : ['estrellas', 'noche', 'gallos', 'oscuridad', 'alegre'];

  var _eclipses = null;
  function eclipses() {
    if (_eclipses) return _eclipses;
    _eclipses = fetch(ROOT + 'assets/data/eclipses.geojson').then(function (r) { return r.json(); });
    return _eclipses;
  }

  function fecha(iso) {
    var p = iso.split('-');
    if (LANG === 'en') return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
    return parseInt(p[2], 10) + ' de ' + MESES[parseInt(p[1], 10) - 1] + ' de ' + p[0];
  }
  function fechaCorta(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' ' + (LANG === 'en' ? MONTHS : MESES)[parseInt(p[1], 10) - 1].slice(0, 3) + ' ' + p[0];
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
    b.setAttribute('aria-label', tr('Ampliar el mapa', 'Enlarge the map'));
    b.innerHTML = '<span aria-hidden="true">+</span>';
    L.DomEvent.disableClickPropagation(b);
    el.appendChild(b);
    function poner(ampliado) {
      el.classList.toggle('mapa-ampliado', ampliado);
      document.documentElement.classList.toggle('sin-scroll', ampliado);
      b.setAttribute('aria-pressed', String(ampliado));
      b.setAttribute('aria-label', ampliado ? tr('Cerrar el mapa ampliado', 'Close the enlarged map') : tr('Ampliar el mapa', 'Enlarge the map'));
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
      L.marker([t.lat, t.lng], { icon: icono, title: campo(t, 'lugar') + ', ' + t.ano })
        .bindPopup('<strong>' + t.ano + ' · ' + campo(t, 'lugar') + '</strong><br>' + campo(t, 'texto') + '<br><span style="color:#9a9aa2">' + campo(t, 'fuente') + '</span>')
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
    if (sinMovimiento() || !('IntersectionObserver' in window)) return;
    var secciones = document.querySelectorAll('main section.claro, main section.oscuro:not(.portada), main .masa');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.documentElement.classList.add('con-transiciones');
    secciones.forEach(function (s) { io.observe(s); });
  }
  function sinMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Pestañas internas (patrón ARIA tabs, activación automática). Sin JS, todos los paneles
  // quedan a la vista. Flechas, Inicio y Fin mueven entre pestañas. Si la dirección lleva
  // un ancla que vive dentro de un panel, ese panel se abre. Un solo gesto: el panel elegido
  // se descubre con un recorte circular que nace de la pestaña tocada (CSS .entra).
  function pestanas(raiz, alCambiar) {
    var lista = raiz.querySelector('[role="tablist"]');
    var tabs = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    var paneles = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    function elegir(i, foco, animar) {
      tabs.forEach(function (t, k) {
        var si = k === i;
        t.setAttribute('aria-selected', String(si));
        t.tabIndex = si ? 0 : -1;
        paneles[k].hidden = !si;
        paneles[k].classList.remove('entra');
      });
      if (foco) tabs[i].focus();
      if (animar && !sinMovimiento()) {
        var p = paneles[i], r = tabs[i].getBoundingClientRect(), pr = p.getBoundingClientRect();
        p.style.setProperty('--ox', Math.round(r.left + r.width / 2 - pr.left) + 'px');
        void p.offsetWidth;
        p.classList.add('entra');
      }
      if (alCambiar) alCambiar(i, tabs[i], paneles[i]);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { elegir(i, false, true); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); elegir(j, true, true); }
      });
    });
    function porAncla() {
      var id = decodeURIComponent(location.hash.slice(1));
      if (!id) return false;
      var el = document.getElementById(id);
      if (!el) return false;
      for (var k = 0; k < paneles.length; k++) {
        if (paneles[k] === el || paneles[k].contains(el)) { elegir(k, false, false); return true; }
      }
      return false;
    }
    var inicial = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
    elegir(inicial < 0 ? 0 : inicial, false, false);
    if (porAncla()) {
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(function () { el.scrollIntoView(); }, 0);
    }
    window.addEventListener('hashchange', porAncla);
    raiz.classList.add('con-js');
    return { elegir: elegir, tabs: tabs, paneles: paneles };
  }

  // Desplegables que se abren de uno en uno (atributo name). Respaldo para navegadores sin soporte.
  function unoEnUno() {
    document.querySelectorAll('details[name]').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        document.querySelectorAll('details[name="' + d.getAttribute('name') + '"]').forEach(function (o) {
          if (o !== d && o.open) o.open = false;
        });
      });
    });
  }

  // Álbum de actividades: una sola fuente (assets/data/album.json).
  var _album = null;
  function album() {
    if (!_album) _album = fetch(ROOT + 'assets/data/album.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return _album;
  }
  var ICONO_PARCIAL = '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 1a6 6 0 0 1 0 12z" fill="currentColor"/></svg>';
  function vacio(el, mensaje) {
    el.innerHTML = '<div class="album-vacio"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="40" fill="none" stroke="#9a9aa2" stroke-width="2"/><circle cx="74" cy="60" r="40" fill="#15151b"/></svg>' +
      '<div><p class="entradilla" style="margin-bottom:8px">' + tr('El álbum se está armando.', 'The album is being put together.') + '</p><p class="nota">' + (mensaje || tr('Estamos eligiendo las fotos de cada actividad, con su crédito y sin rostros sin permiso.', 'We are choosing the photos for each activity, with credit, and with no faces shown without permission.')) + '</p></div></div>';
  }
  function fotoHTML(f, cargar) {
    if (f.estado !== 'elegida' || !f.archivo) {
      return '<div class="por-elegir"><i class="anillo" aria-hidden="true"></i><span>' + tr('Foto por elegir', 'Photo to be chosen') + ' · ' + escapar(campo(f, 'falta') || f.actividad) + '</span></div>';
    }
    return '<img src="' + ROOT + f.archivo + '" alt="' + escapar(campo(f, 'alt')) + '" width="' + (f.ancho || '') + '" height="' + (f.alto || '') + '" loading="' + (cargar || 'lazy') + '" decoding="async">';
  }
  // B · Secuencia: una imagen grande con su pie al lado; las perlas son la navegación.
  function secuencia(el, uso, limite) {
    album().then(function (d) {
      var fotos = d.fotos.filter(function (f) { return f.usos.indexOf(uso) >= 0; });
      if (limite) fotos = fotos.slice(0, limite);
      if (!fotos.length || !fotos.some(function (f) { return f.estado === 'elegida'; })) { vacio(el); return; }
      var i = 0, n = fotos.length;
      el.innerHTML = '<div class="secuencia" role="group" aria-roledescription="' + tr('secuencia de fotos', 'photo sequence') + '" aria-label="' + tr('Álbum de actividades', 'Activity album') + '">' +
        '<figure><div class="album-foto"></div></figure>' +
        '<div class="pie-sec"><p class="folio sec-folio"></p><h3 class="sec-t"></h3><p class="nota sec-x"></p>' +
        '<div class="perlas" role="group" aria-label="' + tr('Fotos', 'Photos') + '"></div>' +
        '<div class="flechas"><button type="button" class="flecha-c" data-d="-1" aria-label="' + tr('Foto anterior', 'Previous photo') + '"><span aria-hidden="true">←</span></button><button type="button" class="flecha-c" data-d="1" aria-label="' + tr('Foto siguiente', 'Next photo') + '"><span aria-hidden="true">→</span></button></div>' +
        '<p class="nota" aria-live="polite" style="position:absolute;left:-9999px" data-vivo></p></div></div>';
      var caja = el.querySelector('.album-foto'), perlas = el.querySelector('.perlas'), vivo = el.querySelector('[data-vivo]');
      perlas.innerHTML = fotos.map(function (f, k) { return '<button type="button" class="perla" aria-label="' + tr('Foto ', 'Photo ') + (k + 1) + tr(' de ', ' of ') + n + '"></button>'; }).join('') + '<span class="folio sec-n"></span>';
      function poner(k, anunciar) {
        i = (k + n) % n;
        var f = fotos[i];
        caja.innerHTML = fotoHTML(f, i === 0 ? 'lazy' : 'eager');
        el.querySelector('.sec-folio').textContent = (f.fecha ? fechaCorta(f.fecha) : '') + (f.lugar ? ' · ' + f.lugar : '');
        el.querySelector('.sec-t').textContent = campo(f, 'titulo') || (f.estado === 'elegida' ? '' : tr('Por elegir', 'To be chosen'));
        el.querySelector('.sec-x').textContent = campo(f, 'pie') || '';
        el.querySelector('.sec-n').textContent = (i + 1) + ' / ' + n;
        perlas.querySelectorAll('.perla').forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
        if (anunciar) vivo.textContent = tr('Foto ', 'Photo ') + (i + 1) + tr(' de ', ' of ') + n + (campo(f, 'titulo') ? ': ' + campo(f, 'titulo') : '');
      }
      perlas.addEventListener('click', function (e) {
        var b = e.target.closest('.perla'); if (!b) return;
        poner(Array.prototype.indexOf.call(perlas.querySelectorAll('.perla'), b), true);
      });
      el.querySelectorAll('.flecha-c').forEach(function (b) { b.addEventListener('click', function () { poner(i + parseInt(b.getAttribute('data-d'), 10), true); }); });
      poner(0, false);
    }).catch(function () { vacio(el, tr('No pudimos cargar el álbum. Vuelve a intentarlo más tarde.', 'We could not load the album. Please try again later.')); });
  }
  // C · Bitácora: una fila por actividad. Con fotos, la fila se despliega en tres; sin fotos, es texto.
  function bitacora(el) {
    album().then(function (d) {
      el.innerHTML = '<div class="bitacora">' + d.actividades.map(function (a) {
        var fotos = d.fotos.filter(function (f) { return f.actividad === a.id; }).slice(0, 3);
        var fecha = a.fecha ? '<span class="folio">' + escapar(fechaCorta(a.fecha)) + '</span>' : '<span class="parcial">' + ICONO_PARCIAL + tr('Fecha por confirmar', 'Date to be confirmed') + '</span>';
        var titulo = '<div><h3>' + escapar(campo(a, 'titulo')) + '</h3>' + (campo(a, 'nota') ? '<p class="nota">' + campo(a, 'nota') + '</p>' : '') + '</div>';
        if (!fotos.length) return '<div class="bit-fila"><div class="bit-cab">' + fecha + titulo + '<span></span></div></div>';
        return '<details class="bit-fila"><summary class="bit-cab">' + fecha + titulo + '<span class="abre" aria-hidden="true"></span></summary>' +
          '<div class="bit-fotos">' + fotos.map(function (f) { return '<figure class="album-foto">' + fotoHTML(f) + '</figure>'; }).join('') + '</div></details>';
      }).join('') + '</div>';
    }).catch(function () { vacio(el, tr('No pudimos cargar la bitácora. Vuelve a intentarlo más tarde.', 'We could not load the log. Please try again later.')); });
  }

  // Dona: el regreso de la luz nace donde se tocó. Se guarda el punto del clic en un enlace interno.
  (function origenTransicion() {
    try {
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || a.target === '_blank') return;
        sessionStorage.setItem('umbrhalia.vt', Math.round(100 * e.clientX / innerWidth) + '% ' + Math.round(100 * e.clientY / innerHeight) + '%');
      }, true);
      var o = sessionStorage.getItem('umbrhalia.vt');
      if (o && document.documentElement.getAttribute('data-transicion') === 'regreso') {
        var p = o.split(' ');
        document.documentElement.style.setProperty('--vt-x', p[0]);
        document.documentElement.style.setProperty('--vt-y', p[1]);
      }
    } catch (err) { /* sin sessionStorage: el recorte nace arriba al centro */ }
  })();

  // Selector de idioma en la barra: ES · EN · Nāhuatl (en traducción). Las páginas en inglés viven
  // en /en/ con la misma ruta; si una página aún no tiene versión en inglés, EN lleva a la portada en inglés.
  (function selectorIdioma() {
    var barra = document.querySelector('header.top .wrap');
    // Solo aparece en las páginas que declaran su versión en otra lengua (<link rel="alternate" hreflang>):
    // así el selector no se publica antes que el sitio en inglés.
    if (!barra || barra.querySelector('.idiomas') || !document.querySelector('link[rel="alternate"][hreflang]')) return;
    var raiz = new URL(ROOT, location.href).pathname;
    var rel = location.pathname.indexOf(raiz) === 0 ? location.pathname.slice(raiz.length) : '';
    rel = rel.replace(/index\.html$/, '').replace(/^en\//, '').replace(/^en$/, '');
    var es = raiz + rel, en = raiz + 'en/' + rel;
    var nav = document.createElement('nav');
    nav.className = 'idiomas';
    nav.setAttribute('aria-label', tr('Idioma', 'Language'));
    nav.innerHTML =
      '<a href="' + es + '" lang="es" hreflang="es"' + (LANG === 'es' ? ' aria-current="true"' : '') + '>ES</a>' +
      '<a href="' + en + '" lang="en" hreflang="en"' + (LANG === 'en' ? ' aria-current="true"' : '') + '>EN</a>' +
      '<span class="pronto" lang="nah" title="' + tr('Náhuatl de la Huasteca: en traducción', 'Huasteca Nahuatl: translation in progress') + '">' + ICONO_PARCIAL + 'Nāhuatl<span class="visually-hidden"> (' + tr('en traducción', 'translation in progress') + ')</span></span>';
    barra.appendChild(nav);
    if (LANG === 'es' && rel && window.fetch) {
      fetch(en, { method: 'HEAD' }).then(function (r) { if (!r.ok) nav.children[1].href = raiz + 'en/'; })
        .catch(function () { nav.children[1].href = raiz + 'en/'; });
    }
  })();

  // Conteo de visitas con GoatCounter: sin cookies y sin guardar la IP (decisión de Gabriela, 29 oct 2026).
  // Una sola fuente: el código del sitio está aquí. No cuenta en local ni si el navegador pide «no rastrear».
  (function contarVisitas() {
    var CODIGO = 'umbrhalia';
    if (!/github\.io$/.test(location.hostname) || navigator.doNotTrack === '1') return;
    window.goatcounter = { endpoint: 'https://' + CODIGO + '.goatcounter.com/count' };
    var s = document.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js';
    document.head.appendChild(s);
  })();

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  return {
    ROOT: ROOT, LANG: LANG, tr: tr, campo: campo, nombre: nombre, TESTIGOS: TESTIGOS, PALABRAS_TESTIGOS: PALABRAS_TESTIGOS,
    eclipses: eclipses, proximos: proximos, fecha: fecha, fechaCorta: fechaCorta, duracion: duracion, diasHasta: diasHasta,
    leer: leer, guardar: guardar, mapaBase: mapaBase, estiloFranja: estiloFranja, capaTestigos: capaTestigos,
    marcaPalabra: marcaPalabra, escapar: escapar, puntoEnFranja: puntoEnFranja, transiciones: transiciones, ampliable: ampliable,
    pestanas: pestanas, unoEnUno: unoEnUno, album: album, secuencia: secuencia, bitacora: bitacora, sinMovimiento: sinMovimiento
  };
})();
