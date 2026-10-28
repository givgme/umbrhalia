/* ARTqueología del Cielo · carriles, filtros, recorridos y ficha en tres capas.
   Datos: assets/data/artqueologia_web.json (herramientas/construir_artqueologia.py).
   La vista Lista ya viene escrita en el HTML: si los datos no cargan, queda ella.
   Vanilla JS, sin librerías. Respeta prefers-reduced-motion. */
(function () {
  'use strict';
  var ROOT = U.ROOT;
  var esc = function (s) { return U.escapar(s == null ? '' : s); };
  var REDUCIR = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CLAVE_VISTA = 'umbrhalia.artqueologia.vista';

  // Escala por tramos: [desde, hasta, % inicial, % final]
  var TRAMOS = [[-1300, 500, 0, 16], [500, 1500, 16, 38], [1500, 1900, 38, 70], [1900, 2026, 70, 100]];
  var TICKS = [[-1300, '1300 a.C.'], [-500, '500 a.C.'], [500, '500', 1], [1000, '1000'], [1500, '1500', 1],
    [1600, '1600'], [1700, '1700'], [1800, '1800'], [1900, '1900', 1], [1950, '1950'], [2026, '2026']];
  var ESTADO = {
    calculado: 'Calculado en la tesis', reportado: 'Fechado por la fuente',
    por_confirmar: 'Por confirmar', sin_estado: 'Por confirmar', no_aplica: 'Sin eclipse fechado'
  };
  var ESTADO_SR = {
    calculado: 'eclipse calculado en la tesis', reportado: 'eclipse fechado por la fuente',
    por_confirmar: 'eclipse por confirmar', sin_estado: 'eclipse por confirmar', no_aplica: 'sin eclipse fechado'
  };
  var SIMBOLO = { calculado: 'm-calculado', reportado: 'm-reportado', no_aplica: 'm-noaplica' };
  var REGION = { mx: 'México', otras: 'Otras regiones' };
  var ORIGEN_ANIO = {
    'eclipse.fecha': 'año del eclipse relacionado',
    'memorias.year (provisional)': 'provisional',
    'titulo (provisional)': 'provisional, tomado del título',
    'id_catalogo (provisional)': 'provisional',
    'publicacion en el sitio': 'año de publicación en el sitio',
    'sin_posicion': 'la tesis todavía no la fecha'
  };
  var ROM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

  var D = null, POR = {}, ALIAS = {}, CAT = {}, CARRIL = {}, REC = {};
  var S = { region: 'todo', recorrido: '', vista: 'linea', modo: null, abierta: null, capa: 'vistazo', origen: null };

  var $ = function (id) { return document.getElementById(id); };
  var escena = document.querySelector('.aq-escena');
  var lineaEl = $('aq-linea'), listaEl = $('aq-lista'), fichaEl = $('aq-ficha'), fichaC = $('aq-ficha-c');

  // ---------------------------------------------------------------- utilidades
  function anioTxt(a) { return a == null ? 'Sin fecha' : (a < 0 ? (-a) + ' a.C.' : String(a)); }
  function siglo(a) {
    if (a == null) return 'Sin fecha';
    return a < 0 ? 'Siglo ' + ROM[Math.floor((-a - 1) / 100) + 1] + ' a.C.' : 'Siglo ' + ROM[Math.floor((a - 1) / 100) + 1];
  }
  function pct(a) {
    for (var i = 0; i < TRAMOS.length; i++) {
      var t = TRAMOS[i];
      if (a <= t[1] || i === TRAMOS.length - 1) {
        var f = Math.max(0, Math.min(1, (a - t[0]) / (t[1] - t[0])));
        return t[2] + f * (t[3] - t[2]);
      }
    }
  }
  function marca(estado, cls) {
    return '<svg class="' + (cls || 'aq-svgm') + '" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#' + (SIMBOLO[estado] || 'm-confirmar') + '"/></svg>';
  }
  function pasa(o) {
    if (S.region !== 'todo' && o.region !== S.region) return false;
    if (S.recorrido && REC[S.recorrido].obras.indexOf(o.slug) < 0) return false;
    return true;
  }
  function etiqueta(o) {
    return o.titulo + ', ' + anioTxt(o.anio) + ', ' + CAT[o.categoria].nombre + ', ' + ESTADO_SR[o.eclipse.estado];
  }
  function modoActual() { return window.innerWidth < 760 ? 'v' : 'h'; }
  function fichaDocked() { return window.innerWidth >= 1200; }
  // Entre 760 y 1199 px la ficha no flota sobre la línea: en la vista Línea baja
  // debajo de la escala; en la vista Lista abre una columna que empuja la lista.
  function fichaEnFlujo() { return window.innerWidth >= 760 && window.innerWidth < 1200; }
  function fichaModal() { return window.innerWidth < 760; }
  function rolFicha() {
    if (S.abierta && fichaModal()) {
      fichaEl.setAttribute('role', 'dialog');
      fichaEl.setAttribute('aria-modal', 'true');
      fichaEl.setAttribute('aria-labelledby', 'aq-ficha-t');
      fichaEl.removeAttribute('aria-label');
    } else {
      fichaEl.removeAttribute('role'); fichaEl.removeAttribute('aria-modal'); fichaEl.removeAttribute('aria-labelledby');
      fichaEl.setAttribute('aria-label', 'Ficha de la obra');
    }
  }

  // ---------------------------------------------------------------- datos
  function preparar(d) {
    D = d;
    d.categorias.forEach(function (c) { CAT[c.id] = c; CARRIL[c.id] = []; });
    d.recorridos.forEach(function (r) { REC[r.id] = r; });
    d.obras.forEach(function (o) {
      POR[o.slug] = o;
      (o.slugs_absorbidos || []).forEach(function (s) { ALIAS[s] = o.slug; });
      CARRIL[o.categoria].push(o);
    });
    Object.keys(CARRIL).forEach(function (c) {
      CARRIL[c].sort(function (a, b) {
        if ((a.anio == null) !== (b.anio == null)) return a.anio == null ? -1 : 1; // la repisa va primero
        return (a.anio || 0) - (b.anio || 0) || a.orden - b.orden || (a.titulo < b.titulo ? -1 : 1);
      });
    });
  }

  // ---------------------------------------------------------------- línea horizontal
  function construirH() {
    var h = '<div class="aq-h-cab" aria-hidden="true"><span></span><span>sin fecha</span><span></span></div>';
    h += '<div class="aq-carriles" role="grid" aria-label="Obras por oficio y por año" aria-describedby="aq-escala">';
    D.categorias.forEach(function (c) {
      var rep = '', pis = '';
      CARRIL[c.id].forEach(function (o) {
        var b = '<span class="aq-celda" role="gridcell"><button type="button" class="aq-p aq-obra" tabindex="-1" data-slug="' + o.slug + '" aria-label="' + esc(etiqueta(o)) + '">' + marca(o.eclipse.estado, 'x') + '</button></span>';
        if (o.anio == null) rep += b; else pis += b;
      });
      h += '<div class="aq-carril" role="row" data-cat="' + c.id + '"><div class="aq-carril-n" role="rowheader">' + esc(c.nombre) + '</div>' +
        '<div class="aq-repisa" role="none">' + rep + '</div><div class="aq-pista" role="none">' + pis + '</div></div>';
    });
    h += '<div class="aq-guia" id="aq-guia" hidden></div></div>';
    h += '<div class="aq-eje" aria-hidden="true"><span></span><span></span><div class="aq-eje-pista" id="aq-eje-pista"></div></div>';
    lineaEl.innerHTML = h;
    lineaEl.querySelector('.aq-carriles').addEventListener('keydown', teclaH);
    acomodarH();
  }

  function acomodarH() {
    var filas = lineaEl.querySelectorAll('.aq-carril');
    var W = 0;
    filas.forEach(function (fila) {
      var pista = fila.querySelector('.aq-pista');
      W = pista.clientWidth;
      var puestos = [];
      pista.querySelectorAll('.aq-celda').forEach(function (cel) {
        var o = POR[cel.firstChild.getAttribute('data-slug')];
        var x = pct(o.anio) / 100 * W, lv = 0;
        // Si los puntos se enciman, el siguiente sube o baja un nivel; si no cabe, se aparta un poco hacia el pasado.
        var libreEn = function (xx, l) { return !puestos.some(function (p) { return p.lv === l && Math.abs(p.x - xx) < 16; }); };
        var hecho = false;
        for (var g = 0; g < 80 && !hecho; g++) {
          for (var k = 0; k < 3 && !hecho; k++) {
            var l = [0, -1, 1][k];
            for (var dx = 0; dx <= 8; dx += 2) {
              if (libreEn(x + dx, l)) { x += dx; lv = l; hecho = true; break; }
            }
          }
          if (!hecho) x -= 6;
        }
        puestos.push({ x: x, lv: lv });
        cel.style.left = x + 'px';
        cel.style.top = 'calc(50% + ' + (lv * 15) + 'px)';
      });
      var rep = fila.querySelectorAll('.aq-repisa .aq-celda'), n = rep.length, filasR = Math.ceil(n / 4);
      rep.forEach(function (cel, i) {
        var col = i % 4, r = Math.floor(i / 4);
        cel.style.left = (12 + col * 18) + 'px';
        cel.style.top = 'calc(50% + ' + ((r - (filasR - 1) / 2) * 17) + 'px)';
      });
    });
    // Eje: etiquetas sin encimarse.
    var eje = $('aq-eje-pista'), h = '', ultimo = -1e9;
    TICKS.forEach(function (t) {
      var x = pct(t[0]) / 100 * W, ancho = t[1].length * 7.4 + 10;
      if (t[2]) h += '<span class="aq-corte" style="left:' + x + 'px"><i></i><i></i></span>';
      if (x - ancho / 2 < ultimo && t[0] !== 2026) return;
      ultimo = x + ancho / 2;
      h += '<span class="aq-tick" style="left:' + x + 'px">' + t[1] + '</span>';
    });
    eje.innerHTML = h;
    guia();
  }

  function guia() {
    var g = $('aq-guia');
    if (!g) return;
    var o = S.abierta && POR[S.abierta];
    var b = o && o.anio != null && lineaEl.querySelector('.aq-pista .aq-p[data-slug="' + o.slug + '"]');
    if (!b) { g.hidden = true; return; }
    var cont = lineaEl.querySelector('.aq-carriles').getBoundingClientRect(), r = b.getBoundingClientRect();
    g.style.left = (r.left + r.width / 2 - cont.left) + 'px';
    g.hidden = false;
  }

  function botonesCarril(fila) {
    return Array.prototype.filter.call(fila.querySelectorAll('.aq-p'), function (b) { return !b.classList.contains('apagado'); });
  }
  function enfocar(b) {
    lineaEl.querySelectorAll('[tabindex="0"]').forEach(function (x) { x.setAttribute('tabindex', '-1'); });
    b.setAttribute('tabindex', '0');
    b.focus();
  }
  function teclaH(ev) {
    var b = ev.target.closest('.aq-p');
    if (!b) return;
    var fila = b.closest('.aq-carril'), lista = botonesCarril(fila), i = lista.indexOf(b), dest = null;
    switch (ev.key) {
      case 'ArrowRight': dest = lista[i + 1]; break;
      case 'ArrowLeft': dest = lista[i - 1]; break;
      case 'Home': dest = lista[0]; break;
      case 'End': dest = lista[lista.length - 1]; break;
      case 'ArrowDown': case 'ArrowUp':
        var filas = Array.prototype.slice.call(lineaEl.querySelectorAll('.aq-carril')), k = filas.indexOf(fila);
        var paso = ev.key === 'ArrowDown' ? 1 : -1, x = b.getBoundingClientRect().left;
        for (k += paso; k >= 0 && k < filas.length; k += paso) {
          var otra = botonesCarril(filas[k]);
          if (otra.length) {
            dest = otra.reduce(function (m, c) {
              return Math.abs(c.getBoundingClientRect().left - x) < Math.abs(m.getBoundingClientRect().left - x) ? c : m;
            });
            break;
          }
        }
        break;
      default: return;
    }
    ev.preventDefault();
    if (dest) enfocar(dest);
  }

  // ---------------------------------------------------------------- línea vertical (móvil)
  function construirV() {
    var cats = D.categorias.map(function (c) { return c.id; });
    var cw = cats.length * 10 + 8;
    var orden = D.obras.slice().sort(function (a, b) {
      if ((a.anio == null) !== (b.anio == null)) return a.anio == null ? 1 : -1;
      return (a.anio || 0) - (b.anio || 0) || a.orden - b.orden || (a.titulo < b.titulo ? -1 : 1);
    });
    var h = '<nav class="aq-perlas" id="aq-perlas" aria-label="Saltar a un siglo"></nav><div class="aq-perlas-pie" aria-hidden="true"><span id="aq-pp-a"></span><strong id="aq-pp-s"></strong><span id="aq-pp-b"></span></div>';
    h += '<div class="aq-vbox" style="position:relative;--aq-cw:' + cw + 'px"><div class="aq-v-guias" aria-hidden="true">';
    cats.forEach(function (c, i) { h += '<span style="left:' + (i * 10 + 4) + 'px"></span>'; });
    h += '</div><ol class="aq-v" aria-label="Obras en orden cronológico; el punto indica el oficio">';
    var s = null, n = 0;
    orden.forEach(function (o) {
      var si = siglo(o.anio);
      if (si !== s) { s = si; n++; h += '<li class="aq-v-siglo" id="aq-vs-' + n + '" data-siglo="' + esc(si) + '">' + esc(si) + '</li>'; }
      var lane = cats.indexOf(o.categoria);
      h += '<li class="aq-v-li" data-slug="' + o.slug + '"><button type="button" class="aq-v-fila aq-obra" tabindex="-1" data-slug="' + o.slug + '" data-cat="' + o.categoria + '" aria-label="' + esc(etiqueta(o)) + '">' +
        '<span style="padding-left:' + (lane * 10) + 'px"><span class="aq-v-dot">' + marca(o.eclipse.estado, 'x') + '</span></span>' +
        '<span class="aq-v-anio">' + esc(o.anio == null ? 's. f.' : anioTxt(o.anio)) + '</span>' +
        '<span><span class="aq-v-t">' + esc(o.titulo) + '</span><span class="aq-v-cat">' + esc(CAT[o.categoria].nombre) + '</span></span></button></li>';
    });
    h += '</ol></div>';
    lineaEl.innerHTML = h;
    lineaEl.querySelector('.aq-v').addEventListener('keydown', teclaV);
  }
  function perlas() {
    var nav = $('aq-perlas');
    if (!nav) return;
    var heads = Array.prototype.filter.call(lineaEl.querySelectorAll('.aq-v-siglo'), function (h) { return !h.hidden; });
    var max = 1, cuenta = heads.map(function (hd) {
      var c = 0, el = hd.nextElementSibling;
      while (el && !el.classList.contains('aq-v-siglo')) { if (!el.hidden) c++; el = el.nextElementSibling; }
      max = Math.max(max, c);
      return c;
    });
    nav.innerHTML = heads.map(function (hd, i) {
      var d = 5 + Math.round(9 * Math.sqrt(cuenta[i] / max));
      return '<button type="button" class="aq-perla" data-ir="' + hd.id + '" aria-label="' + esc(hd.getAttribute('data-siglo')) + ', ' + cuenta[i] + (cuenta[i] === 1 ? ' obra' : ' obras') + '"><span style="width:' + d + 'px;height:' + d + 'px"></span></button>';
    }).join('');
    $('aq-pp-a').textContent = heads.length ? heads[0].getAttribute('data-siglo').replace('Siglo ', 's. ') : '';
    $('aq-pp-b').textContent = heads.length ? heads[heads.length - 1].getAttribute('data-siglo').replace('Siglo ', 's. ') : '';
    observarSiglos(heads);
  }
  var io = null;
  function observarSiglos(heads) {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) marcarPerla(e.target.id); });
    }, { rootMargin: '0px 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
    if (heads[0]) marcarPerla(heads[0].id);
  }
  function marcarPerla(id) {
    var nav = $('aq-perlas');
    if (!nav) return;
    nav.querySelectorAll('.aq-perla').forEach(function (p) { p.setAttribute('aria-current', String(p.getAttribute('data-ir') === id)); });
    var h = $(id);
    if (h) $('aq-pp-s').textContent = h.getAttribute('data-siglo');
  }
  function teclaV(ev) {
    var b = ev.target.closest('.aq-v-fila');
    if (!b) return;
    var todos = Array.prototype.filter.call(lineaEl.querySelectorAll('.aq-v-fila'), function (x) { return !x.parentNode.hidden; });
    var i = todos.indexOf(b), dest = null, cat = b.getAttribute('data-cat'), k;
    switch (ev.key) {
      case 'ArrowDown': dest = todos[i + 1]; break;
      case 'ArrowUp': dest = todos[i - 1]; break;
      case 'ArrowRight': for (k = i + 1; k < todos.length; k++) if (todos[k].getAttribute('data-cat') === cat) { dest = todos[k]; break; } break;
      case 'ArrowLeft': for (k = i - 1; k >= 0; k--) if (todos[k].getAttribute('data-cat') === cat) { dest = todos[k]; break; } break;
      case 'Home': dest = todos[0]; break;
      case 'End': dest = todos[todos.length - 1]; break;
      default: return;
    }
    ev.preventDefault();
    if (dest) { enfocar(dest); dest.scrollIntoView({ block: 'nearest' }); }
  }

  // ---------------------------------------------------------------- filtros y vistas
  function aplicar(anunciar) {
    var n = 0;
    D.obras.forEach(function (o) { if (pasa(o)) n++; });
    // Línea horizontal: atenúa. Línea vertical y lista: ocultan.
    lineaEl.querySelectorAll('.aq-carril .aq-p').forEach(function (b) { b.classList.toggle('apagado', !pasa(POR[b.getAttribute('data-slug')])); });
    lineaEl.querySelectorAll('.aq-carril').forEach(function (f) { f.querySelector('.aq-carril-n').classList.toggle('apagado', !botonesCarril(f).length); });
    lineaEl.querySelectorAll('.aq-v-li').forEach(function (li) { li.hidden = !pasa(POR[li.getAttribute('data-slug')]); });
    ocultarSiglosVacios(lineaEl.querySelectorAll('.aq-v-siglo'));
    listaEl.querySelectorAll('.aq-item').forEach(function (li) { li.hidden = !pasa(POR[li.getAttribute('data-slug')]); });
    listaEl.querySelectorAll('.aq-siglo').forEach(function (s) { s.hidden = !s.querySelector('.aq-item:not([hidden])'); });
    perlas();
    // Una sola parada de tabulación en la línea.
    var rov = lineaEl.querySelector('.aq-obra[tabindex="0"]');
    if (!rov || rov.classList.contains('apagado') || (rov.parentNode.hidden)) {
      if (rov) rov.setAttribute('tabindex', '-1');
      var primero = Array.prototype.find.call(lineaEl.querySelectorAll('.aq-obra'), function (b) { return !b.classList.contains('apagado') && !b.parentNode.hidden; });
      if (primero) primero.setAttribute('tabindex', '0');
    }
    $('aq-vacio').hidden = n > 0;
    sala();
    if (anunciar) $('aq-estado').textContent = n === D.obras.length ? 'Todas las obras: ' + n + '.' : n + (n === 1 ? ' obra' : ' obras') + ' en este cruce.';
    estadoURL();
  }
  function ocultarSiglosVacios(heads) {
    heads.forEach(function (h) {
      var el = h.nextElementSibling, alguna = false;
      while (el && !el.classList.contains('aq-v-siglo')) { if (!el.hidden) { alguna = true; break; } el = el.nextElementSibling; }
      h.hidden = !alguna;
    });
  }
  function sala() {
    var el = $('aq-sala'), r = S.recorrido && REC[S.recorrido];
    if (!r) { el.hidden = true; el.innerHTML = ''; return; }
    var faltan = r.total_sala - r.obras.length;
    el.innerHTML = '<p class="aq-nota">Recorrido · ' + esc(r.sala) + '</p><h2>' + esc(r.titulo) + '</h2>' +
      '<p class="aq-nota">' + r.obras.length + (r.obras.length === 1 ? ' pieza' : ' piezas') +
      (faltan > 0 ? '. La sala del borrador tiene ' + r.total_sala + '; ' + (faltan === 1 ? 'una espera' : faltan + ' esperan') + ' su fuente en el catálogo.' : '.') + '</p>' +
      '<div class="acciones"><button type="button" class="boton lleno" id="aq-empezar">Empezar el recorrido</button><button type="button" class="aq-enlace" id="aq-salir">Salir del recorrido</button></div>';
    el.hidden = false;
    $('aq-empezar').addEventListener('click', function () { abrir(r.obras[0], { foco: true }); });
    $('aq-salir').addEventListener('click', function () { ponerRecorrido(''); });
  }
  function ponerRegion(r) {
    S.region = r;
    document.querySelectorAll('[data-region]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-region') === r)); });
    aplicar(true);
  }
  function ponerRecorrido(r) {
    S.recorrido = REC[r] ? r : '';
    $('aq-recorrido-sel').value = S.recorrido;
    aplicar(true);
    if (S.abierta) pintarFicha(S.abierta, false);
  }
  function ponerVista(v, guardar) {
    S.vista = v;
    document.querySelectorAll('[data-vista]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-vista') === v)); });
    escena.classList.toggle('aq-vista-linea', v === 'linea');
    escena.classList.toggle('aq-vista-lista', v === 'lista');
    if (guardar) try { localStorage.setItem(CLAVE_VISTA, v); } catch (e) { /* sin almacenamiento */ }
    if (v === 'linea') { lineaEl.hidden = false; $('aq-escala').hidden = false; asegurarModo(true); }
    marcarActiva();
  }
  function asegurarModo(forzar) {
    var m = modoActual();
    if (m !== S.modo || forzar && !lineaEl.firstChild) {
      S.modo = m;
      lineaEl.classList.toggle('aq-vertical', m === 'v');
      if (m === 'h') construirH(); else construirV();
      aplicar(false);
      marcarActiva();
    } else if (m === 'h') acomodarH();
  }
  function estadoURL() {
    var p = new URLSearchParams();
    if (S.region !== 'todo') p.set('region', S.region);
    if (S.recorrido) p.set('recorrido', S.recorrido);
    if (new URLSearchParams(location.search).get('vista')) p.set('vista', S.vista);
    var q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + (S.abierta ? '#' + S.abierta : ''));
  }

  // ---------------------------------------------------------------- sello: el eclipse en círculos
  function sello(o) {
    var e = o.eclipse, t = (e.tipo || '').toLowerCase(), est = e.estado;
    var NEG = '#0b0b0f', BL = '#ececee', GR = '#9a9aa2';
    var s = '', desc;
    var punteado = '';
    if (est === 'calculado') {
      for (var i = 0; i < 60; i++) {
        var a = i / 60 * 2 * Math.PI;
        punteado += '<circle cx="' + (100 + 84 * Math.cos(a)).toFixed(1) + '" cy="' + (100 + 84 * Math.sin(a)).toFixed(1) + '" r="1.3" fill="' + GR + '"/>';
      }
    }
    var m = null, mm = t.match(/magnitud[^\d]*(\d+(?:\.\d+)?)/), mp = t.match(/(\d+(?:\.\d+)?)\s*%/);
    if (mm) m = parseFloat(mm[1]); else if (mp) m = parseFloat(mp[1]) / 100;
    function parcial(mag, color) {
      var d = 124 - 124 * mag, ang = 20 * Math.PI / 180;
      return '<circle cx="100" cy="100" r="62" fill="' + color + '"/><circle cx="' + (100 + d * Math.cos(ang)).toFixed(1) + '" cy="' + (100 - d * Math.sin(ang)).toFixed(1) + '" r="62" fill="' + NEG + '"/>';
    }
    if (est === 'no_aplica') {
      s = '<circle cx="100" cy="100" r="62" fill="none" stroke="' + GR + '" stroke-width="1.5"/>' +
        '<text x="100" y="105" text-anchor="middle" font-family="Menlo, monospace" font-size="15" fill="' + GR + '">' + esc(o.anio == null ? 's. f.' : anioTxt(o.anio)) + '</text>';
      desc = 'sin eclipse fechado';
    } else if (est === 'por_confirmar' || est === 'sin_estado') {
      s = parcial(0.5, GR); desc = 'eclipse por confirmar';
    } else if (/lunar/.test(t) && !/solar/.test(t)) {
      s = '<circle cx="100" cy="100" r="56" fill="#c9c9ce"/><circle cx="196" cy="88" r="96" fill="#3a3a42"/><circle cx="100" cy="100" r="56" fill="none" stroke="' + BL + '" stroke-width="1.5"/>';
      desc = 'eclipse lunar';
    } else if (/parcial/.test(t) && m && m < 1) {
      s = parcial(m, BL); desc = 'eclipse parcial';
    } else if (/total/.test(t) || (m && m >= 1)) {
      s = '<circle cx="100" cy="100" r="64" fill="' + BL + '"/><circle cx="100" cy="100" r="59" fill="' + NEG + '"/>'; desc = 'eclipse total';
    } else if (/anular/.test(t)) {
      s = '<circle cx="100" cy="100" r="62" fill="' + BL + '"/><circle cx="100" cy="100" r="50" fill="' + NEG + '"/>'; desc = 'eclipse anular';
    } else if (m && m < 1) {
      s = parcial(m, BL); desc = 'eclipse parcial';
    } else {
      s = parcial(0.55, BL); desc = 'eclipse solar, esquema sin magnitud';
    }
    if (est === 'calculado') desc += ', calculado en la tesis (anillo punteado)';
    return '<svg viewBox="0 0 200 200" role="img" aria-label="Esquema sin escala: ' + esc(desc) + '">' + punteado + s + '</svg>';
  }

  // ---------------------------------------------------------------- ficha
  function porConfirmar() { return '<span class="aq-pc">' + marca('por_confirmar') + 'Por confirmar</span>'; }
  function fila(dt, dd) { return '<div><dt>' + dt + '</dt><dd>' + dd + '</dd></div>'; }
  function lineaEclipse(o) {
    var e = o.eclipse, partes = [];
    if (e.estado === 'no_aplica') {
      return '<div class="aq-ecl">' + marca(e.estado) + '<p>Sin eclipse fechado' + (e.tipo ? '<br><span class="aq-nota">' + esc(e.tipo) + '</span>' : '') + '</p></div>';
    }
    if (e.fecha) partes.push(esc(e.fecha));
    if (e.tipo) partes.push(esc(e.tipo));
    return '<div class="aq-ecl">' + marca(e.estado) + '<p>' + (partes.join(' · ') || 'Eclipse') + '<br><span class="aq-nota">' + ESTADO[e.estado] + '</span></p></div>';
  }
  function vecinos(o) {
    var l = CARRIL[o.categoria].filter(function (x) { return pasa(x) || x.slug === o.slug; }), i = l.indexOf(o);
    return { prev: l[i - 1], next: l[i + 1], i: CARRIL[o.categoria].indexOf(o), n: CARRIL[o.categoria].length };
  }
  function contenido(o) {
    var c = CAT[o.categoria], v = vecinos(o), img = o.imagen, h = '';
    h += '<div class="aq-f-top"><button type="button" class="aq-enlace" id="aq-cerrar">Cerrar</button><p class="aq-f-pos">' + (v.i + 1) + ' de ' + v.n + ' en ' + esc(c.nombre) + '</p></div>';
    if (img.archivo) {
      h += '<figure class="aq-sello"><img src="' + ROOT + esc(img.archivo) + '" alt="' + esc(img.alt || '') + '" width="960" height="960" loading="lazy" decoding="async"><figcaption>' + esc(img.credito || '') + '</figcaption></figure>';
    } else {
      var nota = img.estado === 'derechos_pendientes' ? 'Imagen en revisión de derechos' : (img.estado === 'propia_pendiente' ? 'Fotos propias en selección' : '');
      h += '<figure class="aq-sello">' + sello(o) + (nota ? '<figcaption>' + nota + '</figcaption>' : '') + '</figure>';
    }
    var recs = o.recorridos.filter(function (r) { return REC[r]; });
    h += '<div class="aq-f-cuerpo">';
    h += '<p class="aq-f-meta">' + esc(anioTxt(o.anio)) + ' · ' + esc(c.nombre) + (recs.length ? ' · ' + esc(REC[recs[0]].titulo) : '') + '</p>';
    h += '<h2 class="aq-f-t" id="aq-ficha-t" tabindex="-1">' + esc(o.titulo) + '</h2>';
    h += '<div class="aq-tabs" role="tablist" aria-label="Capas de la ficha">' +
      ['vistazo', 'ficha', 'fuente'].map(function (k) {
        var sel = S.capa === k;
        return '<button type="button" role="tab" id="aq-tab-' + k + '" aria-controls="aq-capa-' + k + '" aria-selected="' + sel + '" tabindex="' + (sel ? 0 : -1) + '" data-capa="' + k + '">' + k.charAt(0).toUpperCase() + k.slice(1) + '</button>';
      }).join('') + '</div>';

    // Vistazo
    var vz = '';
    if (o.frase_publica) vz += '<p class="aq-f-frase">' + esc(o.frase_publica) + '</p>';
    else if (o.extracto) vz += '<p class="aq-f-frase">' + esc(o.extracto) + '</p><p class="aq-nota">Nota provisional del catálogo de la tesis. La frase de esta ficha está en redacción.</p>';
    else vz += '<p class="aq-nota">La frase de esta ficha está en redacción.</p>';
    vz += lineaEclipse(o);
    if (o.url) vz += '<div class="acciones"><a class="boton lleno" href="' + ROOT + esc(o.url) + '">Leer el cuento</a></div>';

    // Ficha
    var reg = o.region ? REGION[o.region] + (o.region_propuesta ? ' (propuesta)' : '') : '';
    var fi = '<dl class="aq-f-dl">' +
      fila('Oficio', esc(c.nombre) + (o.categoria_propuesta ? ' (propuesta)' : '') + (reg ? ' · ' + esc(reg) : '')) +
      fila('Eclipse', o.eclipse.estado === 'no_aplica' ? 'Sin eclipse fechado' + (o.eclipse.tipo ? ' · ' + esc(o.eclipse.tipo) : '') :
        [o.eclipse.fecha, o.eclipse.tipo].filter(Boolean).map(esc).join(' · ') + '<br><span class="aq-nota">' + ESTADO[o.eclipse.estado] + '</span>') +
      fila('Autoría', o.autor ? esc(o.autor) : porConfirmar()) +
      fila('Fecha', o.fecha_obra ? esc(o.fecha_obra) : porConfirmar()) +
      fila('Lugar', o.lugar ? esc(o.lugar) : porConfirmar()) +
      fila('Técnica y acervo', o.acervo ? esc(o.acervo) : porConfirmar()) +
      (recs.length ? fila('Recorrido', recs.map(function (r) { return '<button type="button" class="aq-enlace" data-rec="' + r + '">' + esc(REC[r].titulo) + '</button>'; }).join('<br>')) : '') +
      fila('En la línea', esc(anioTxt(o.anio)) + '<br><span class="aq-nota">' + esc(ORIGEN_ANIO[o.anio_origen] || '') + '</span>') +
      '</dl>';
    if (o.en_memorias) fi += '<p style="margin-top:16px"><a href="' + esc(D.memorias_url) + '#' + o.slug + '" target="_blank" rel="noopener">Ver en Memorias de la Umbra ↗</a></p>';

    // Fuente
    var sabemos = {
      calculado: 'La tesis reconstruyó este eclipse con un cálculo propio de su trayectoria.',
      reportado: 'La fecha del eclipse la da la fuente citada; la tesis no la recalcula.',
      por_confirmar: 'La tesis deja el eclipse por confirmar.', sin_estado: 'La tesis deja el eclipse por confirmar.',
      no_aplica: 'La obra no se ata a un eclipse fechado.'
    }[o.eclipse.estado];
    var fu = '<h3>Así lo sabemos</h3><p>' + sabemos + '</p>';
    if (o.origen === 'cuentos_ohr') {
      fu += '<h3>Créditos</h3><p>Cuento de Umbrhalia by LFAE, 2026. ' + esc(img.credito || '') + '.</p>';
    } else {
      fu += '<h3>Cita</h3><p>Vera Garfias, tesis de maestría, UAM Azcapotzalco.' +
        (o.en_tesis ? '' : ' <span class="aq-nota">Material de investigación de la tesis, fuera del texto final.</span>') + '</p>';
      var refs = o.bibkeys.map(function (k) { return '<li>' + esc(k) + '</li>'; }).concat(o.paginas.map(function (p) { return '<li>' + esc(p.replace(/:\s*/, ' · ')) + '</li>'; }));
      fu += '<h3>Referencias en la tesis</h3>' + (refs.length ? '<ul class="aq-refs">' + refs.join('') + '</ul>' : '<p class="aq-nota">Sin referencias en el catálogo.</p>');
      fu += '<h3>Imagen</h3><p class="aq-nota">' + (img.estado === 'derechos_pendientes' ? 'La tesis tiene una figura de esta obra; sus derechos están en revisión y por eso no se muestra.' :
        img.estado === 'propia_pendiente' ? 'Registro propio del LFAE, en selección.' : 'Sin imagen en la tesis. El sello dibuja el eclipse relacionado.') + '</p>';
    }

    h += '<div class="aq-capa" role="tabpanel" id="aq-capa-vistazo" aria-labelledby="aq-tab-vistazo"' + (S.capa === 'vistazo' ? '' : ' hidden') + '>' + vz + '</div>';
    h += '<div class="aq-capa" role="tabpanel" id="aq-capa-ficha" aria-labelledby="aq-tab-ficha"' + (S.capa === 'ficha' ? '' : ' hidden') + '>' + fi + '</div>';
    h += '<div class="aq-capa" role="tabpanel" id="aq-capa-fuente" aria-labelledby="aq-tab-fuente"' + (S.capa === 'fuente' ? '' : ' hidden') + '>' + fu + '</div>';

    // Navegación
    h += '<div class="aq-f-nav">';
    var r = S.recorrido && REC[S.recorrido], ir = r ? r.obras.indexOf(o.slug) : -1;
    if (ir >= 0) {
      h += '<p class="aq-f-rec">Pieza ' + (ir + 1) + ' de ' + r.obras.length + ' · ' + esc(r.titulo) + '</p>';
      if (r.obras[ir + 1]) h += '<button type="button" class="boton lleno" data-ir="' + r.obras[ir + 1] + '">Siguiente pieza</button>';
      else h += '<button type="button" class="boton" data-ir="' + r.obras[0] + '">Volver a la primera</button>';
    }
    if (v.prev) h += '<button type="button" class="boton" data-ir="' + v.prev.slug + '">Anterior en el carril</button>';
    if (v.next) h += '<button type="button" class="boton' + (ir >= 0 ? '' : ' lleno') + '" data-ir="' + v.next.slug + '">Siguiente en el carril</button>';
    h += '</div>';
    h += '</div>'; // .aq-f-cuerpo
    return h;
  }

  function pintarFicha(slug, animar, origenEl) {
    var o = POR[slug];
    fichaC.innerHTML = contenido(o);
    fichaC.hidden = false;
    if (animar && !REDUCIR) {
      var fr = fichaEl.getBoundingClientRect(), ox = '50%', oy = '0%';
      if (origenEl && fichaDocked()) {
        var r = origenEl.getBoundingClientRect();
        ox = (r.left + r.width / 2 - fr.left) + 'px'; oy = (r.top + r.height / 2 - fr.top) + 'px';
      }
      fichaC.style.setProperty('--ox', ox); fichaC.style.setProperty('--oy', oy);
      fichaC.classList.remove('revela'); void fichaC.offsetWidth; fichaC.classList.add('revela');
    }
  }

  function abrir(slug, op) {
    op = op || {};
    slug = ALIAS[slug] || slug;
    if (!POR[slug]) return;
    var nueva = !S.abierta;
    S.abierta = slug;
    if (op.origen) S.origen = op.origen;
    pintarFicha(slug, true, op.origen);
    fichaEl.classList.add('abierta');
    rolFicha();
    var bajar = fichaEnFlujo() && S.vista === 'linea';
    if (fichaModal()) {
      document.documentElement.classList.add('sin-scroll');
      document.querySelectorAll('.top, .pie, .aq-cabeza, .aq-escena, .skip').forEach(function (el) { el.inert = true; });
      if (nueva) fichaEl.scrollTop = 0;
    } else {
      fichaEl.scrollTop = 0;
    }
    marcarActiva();
    estadoURL();
    // En la vista Línea de tableta la ficha queda debajo: se lleva a la vista
    // solo si no se alcanza a ver su título.
    if (bajar && op.foco !== false) {
      var ft = fichaEl.getBoundingClientRect();
      if (ft.top > window.innerHeight - 120 || ft.top < 0) fichaEl.scrollIntoView({ behavior: REDUCIR ? 'auto' : 'smooth', block: 'start' });
    }
    if (op.foco !== false) { var t = $('aq-ficha-t'); if (t) t.focus({ preventScroll: !fichaModal() }); }
  }

  function cerrar() {
    if (!S.abierta) return;
    var slug = S.abierta;
    S.abierta = null;
    fichaEl.classList.remove('abierta');
    fichaC.hidden = true; fichaC.innerHTML = '';
    rolFicha();
    document.documentElement.classList.remove('sin-scroll');
    document.querySelectorAll('[inert]').forEach(function (el) { el.inert = false; });
    marcarActiva();
    estadoURL();
    // El foco vuelve a la obra.
    var dest = S.vista === 'lista' ? listaEl.querySelector('#' + CSS.escape(slug) + ' .aq-item-t') : lineaEl.querySelector('.aq-obra[data-slug="' + slug + '"]');
    if (dest && S.vista !== 'lista') enfocar(dest); else if (dest) dest.focus();
  }

  function marcarActiva() {
    document.querySelectorAll('.aq-obra.activo, .aq-item.activo').forEach(function (x) { x.classList.remove('activo'); });
    if (!S.abierta) { guia(); return; }
    lineaEl.querySelectorAll('.aq-obra[data-slug="' + S.abierta + '"]').forEach(function (b) {
      b.classList.add('activo');
      lineaEl.querySelectorAll('.aq-obra[tabindex="0"]').forEach(function (x) { x.setAttribute('tabindex', '-1'); });
      b.setAttribute('tabindex', '0');
    });
    var li = $(S.abierta);
    if (li && li.classList.contains('aq-item')) li.classList.add('activo');
    guia();
  }

  // ---------------------------------------------------------------- eventos
  function eventos() {
    document.querySelectorAll('[data-region]').forEach(function (b) { b.addEventListener('click', function () { ponerRegion(b.getAttribute('data-region')); }); });
    $('aq-recorrido-sel').addEventListener('change', function (e) { ponerRecorrido(e.target.value); });
    document.querySelectorAll('[data-vista]').forEach(function (b) { b.addEventListener('click', function () { ponerVista(b.getAttribute('data-vista'), true); }); });
    $('aq-quitar').addEventListener('click', function () { S.recorrido = ''; $('aq-recorrido-sel').value = ''; ponerRegion('todo'); });

    lineaEl.addEventListener('click', function (e) {
      var b = e.target.closest('.aq-obra');
      if (b) abrir(b.getAttribute('data-slug'), { foco: true, origen: b });
      var p = e.target.closest('.aq-perla');
      if (p) {
        var h = $(p.getAttribute('data-ir'));
        h.scrollIntoView({ behavior: REDUCIR ? 'auto' : 'smooth', block: 'start' });
        marcarPerla(h.id);
      }
    });
    listaEl.addEventListener('click', function (e) {
      var a = e.target.closest('.aq-item-t');
      if (!a) return;
      e.preventDefault();
      abrir(a.closest('.aq-item').getAttribute('data-slug'), { foco: true, origen: a });
    });
    fichaEl.addEventListener('click', function (e) {
      if (e.target.closest('#aq-cerrar')) return cerrar();
      var ir = e.target.closest('[data-ir]');
      if (ir) { abrir(ir.getAttribute('data-ir'), { foco: true }); return; }
      var rec = e.target.closest('[data-rec]');
      if (rec) { ponerRecorrido(rec.getAttribute('data-rec')); return; }
      var tab = e.target.closest('[role="tab"]');
      if (tab) capa(tab.getAttribute('data-capa'), true);
    });
    fichaEl.addEventListener('keydown', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (!tab || ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
      var orden = ['vistazo', 'ficha', 'fuente'], i = orden.indexOf(tab.getAttribute('data-capa'));
      i = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
      e.preventDefault();
      capa(orden[i], true);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.abierta) { e.preventDefault(); cerrar(); } });
    window.addEventListener('hashchange', function () {
      var h = decodeURIComponent(location.hash.slice(1));
      if (h && (POR[h] || ALIAS[h]) && h !== S.abierta) abrir(h, { foco: true });
    });
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (S.vista === 'linea') asegurarModo(false);
        if (S.abierta && !fichaModal()) {
          document.documentElement.classList.remove('sin-scroll');
          document.querySelectorAll('[inert]').forEach(function (el) { el.inert = false; });
        }
        if (S.abierta && fichaModal() && !document.documentElement.classList.contains('sin-scroll')) {
          document.documentElement.classList.add('sin-scroll');
          document.querySelectorAll('.top, .pie, .aq-cabeza, .aq-escena, .skip').forEach(function (el) { el.inert = true; });
        }
        rolFicha();
      }, 150);
    });
  }
  function capa(k, foco) {
    S.capa = k;
    fichaEl.querySelectorAll('[role="tab"]').forEach(function (b) {
      var sel = b.getAttribute('data-capa') === k;
      b.setAttribute('aria-selected', String(sel)); b.setAttribute('tabindex', sel ? '0' : '-1');
      if (sel && foco) b.focus();
    });
    fichaEl.querySelectorAll('[role="tabpanel"]').forEach(function (p) { p.hidden = p.id !== 'aq-capa-' + k; });
  }

  // ---------------------------------------------------------------- arranque
  function iniciar() {
    var vista = 'linea';
    try { vista = localStorage.getItem(CLAVE_VISTA) || 'linea'; } catch (e) { /* sin almacenamiento */ }
    var pv = new URLSearchParams(location.search).get('vista');
    if (pv === 'lista' || pv === 'linea') vista = pv;
    escena.classList.add('aq-vista-' + vista);
    var hashInicial = decodeURIComponent(location.hash.slice(1)); // se lee antes de que los filtros reescriban la URL
    var espera = setTimeout(function () { $('aq-cargando').hidden = false; }, 400);
    fetch(ROOT + 'assets/data/artqueologia_web.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        clearTimeout(espera); $('aq-cargando').hidden = true;
        preparar(d);
        var p = new URLSearchParams(location.search);
        if (REGION[p.get('region')]) S.region = p.get('region');
        if (REC[p.get('recorrido')]) S.recorrido = p.get('recorrido');
        document.querySelectorAll('[data-region]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-region') === S.region)); });
        $('aq-recorrido-sel').value = S.recorrido;
        eventos();
        ponerVista(vista === 'lista' ? 'lista' : 'linea', false);
        if (vista === 'lista') aplicar(false);
        var h = hashInicial;
        if (h && (POR[h] || ALIAS[h])) {
          abrir(h, { foco: true });
          var b = lineaEl.querySelector('.aq-obra[data-slug="' + S.abierta + '"]');
          if (b && S.vista === 'linea' && fichaDocked()) b.scrollIntoView({ block: 'center' });
        }
      })
      .catch(function () {
        clearTimeout(espera); $('aq-cargando').hidden = true;
        $('aq-error').hidden = false;
        escena.classList.remove('aq-vista-linea'); escena.classList.add('aq-vista-lista');
        document.querySelector('.aq-controles').hidden = true;
      });
  }
  iniciar();
})();
