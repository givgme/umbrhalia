/* Umbrhalia · flujo «Deja tu palabra». Sin servidor: el resultado vive en localStorage. */
(function () {
  var estado = { visto: null, eclipse: null, anio: null, lat: null, lng: null, ciudad: '', palabra: '', relato: '', nombre: '', anonimo: false, okUsos: false, antes: '', proxima: null };
  var historial = ['1'];
  var RUTA = { total: ['1', '2', '3', '4', '5', '6', '7'], parcial: ['1', '2', '3', '4', '5', '6', '7'], no: ['1', 'R1', 'R2', 'R3'] };
  var mapas = {};
  var featurePorFecha = {};

  var params = new URLSearchParams(location.search);
  if (params.get('origen')) {
    document.getElementById('saludo').textContent = 'Encontraste una ventana. Soy Ohr: solo puedo hablar con ustedes cuando la Luna tapa al Sol.';
  }

  function $(id) { return document.getElementById(id); }
  function pasoEl(id) { return document.querySelector('.paso[data-paso="' + id + '"]'); }

  function mostrar(id) {
    document.querySelectorAll('.paso').forEach(function (p) { p.classList.remove('activo'); });
    pasoEl(id).classList.add('activo');
    pintarProgreso(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var h = pasoEl(id).querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    if (id === '2') prepararPaso2();
    if (id === '3') prepararPaso3();
    if (id === '7') prepararPaso7();
    if (id === 'R1') prepararR1();
    if (id === 'R3') prepararR3();
  }
  function ir(id) { historial.push(id); mostrar(id); }
  function atras() { if (historial.length > 1) { historial.pop(); mostrar(historial[historial.length - 1]); } }
  function siguiente() {
    var ruta = RUTA[estado.visto] || RUTA.total;
    var actual = historial[historial.length - 1];
    var i = ruta.indexOf(actual);
    if (i >= 0 && i < ruta.length - 1) ir(ruta[i + 1]);
  }
  function pintarProgreso(id) {
    var ruta = RUTA[estado.visto] || RUTA.total;
    var i = ruta.indexOf(id);
    $('progreso').innerHTML = ruta.map(function (_, k) {
      return '<span class="' + (k < i ? 'hecho' : k === i ? 'actual' : '') + '"></span>';
    }).join('');
  }

  document.querySelectorAll('[data-atras]').forEach(function (b) { b.addEventListener('click', atras); });
  document.querySelectorAll('[data-sig]').forEach(function (b) { b.addEventListener('click', siguiente); });

  // 1 · ¿Has visto un eclipse?
  document.querySelectorAll('[data-visto]').forEach(function (b) {
    b.addEventListener('click', function () {
      estado.visto = b.getAttribute('data-visto');
      ir(estado.visto === 'no' ? 'R1' : '2');
    });
  });

  // 2 · ¿Cuál?
  function prepararPaso2() {
    var esTotal = estado.visto === 'total';
    $('elige-total').hidden = !esTotal;
    $('elige-anio').hidden = esTotal;
    $('norecuerdo').hidden = !esTotal;
    $('sig2').disabled = esTotal ? !estado.eclipse : !estado.anio;
    if (!esTotal) return;
    if (!mapas.m2) {
      mapas.m2 = U.mapaBase($('mapa2'));
      U.eclipses().then(function (data) {
        var hoy = new Date().toISOString().slice(0, 10);
        var pasados = data.features.filter(function (f) { return f.properties.date <= hoy; })
          .sort(function (a, b) { return a.properties.date < b.properties.date ? 1 : -1; });
        mapas.capa2 = L.geoJSON({ type: 'FeatureCollection', features: pasados }, { style: function () { return U.estiloFranja(false); }, interactive: false }).addTo(mapas.m2);
        pasados.forEach(function (f) { featurePorFecha[f.properties.date] = f; });
        pintarLista(pasados, '');
        $('buscar').addEventListener('input', function () { pintarLista(pasados, this.value.trim()); });
      });
    }
    setTimeout(function () { mapas.m2.invalidateSize(); }, 50);
  }
  function pintarLista(lista, filtro) {
    var vis = lista.filter(function (f) { return !filtro || f.properties.date.indexOf(filtro) === 0; });
    $('lista').innerHTML = vis.map(function (f) {
      var p = f.properties;
      return '<button role="option" data-fecha="' + p.date + '" aria-pressed="' + (estado.eclipse === p.date) + '">' +
        '<span>' + U.fecha(p.date) + '</span><span class="tenue">' + U.duracion(p.duration_s) + '</span></button>';
    }).join('') || '<p class="chico tenue" style="padding:14px 16px;margin:0">No hay eclipses totales ese año. Prueba «No recuerdo la fecha».</p>';
    $('lista').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { elegirEclipse(b.getAttribute('data-fecha')); });
    });
  }
  function elegirEclipse(fecha) {
    estado.eclipse = fecha; estado.anio = null;
    $('lista').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fecha') === fecha); });
    mapas.capa2.setStyle(function (f) { return U.estiloFranja(f.properties.date === fecha); });
    var capa = L.geoJSON(featurePorFecha[fecha]);
    mapas.m2.fitBounds(capa.getBounds(), { maxZoom: 4, padding: [10, 10] });
    $('sig2').disabled = false;
  }
  $('anio').addEventListener('input', function () {
    var v = parseInt(this.value, 10);
    estado.anio = v >= 1900 && v <= 2026 ? v : null;
    $('sig2').disabled = !estado.anio;
  });
  $('norecuerdo').addEventListener('click', function () {
    estado.eclipse = null;
    $('elige-total').hidden = true; $('elige-anio').hidden = false; this.hidden = true;
    $('sig2').disabled = true; $('anio').focus();
  });
  $('sig2').addEventListener('click', siguiente);

  // 3 · ¿Dónde estabas?
  function prepararPaso3() {
    if (!mapas.m3) {
      mapas.m3 = U.mapaBase($('mapa3'));
      mapas.m3.on('click', function (e) {
        estado.lat = Math.round(e.latlng.lat * 10) / 10;
        estado.lng = Math.round(e.latlng.lng * 10) / 10;
        if (mapas.pin3) mapas.m3.removeLayer(mapas.pin3);
        mapas.pin3 = L.circleMarker([estado.lat, estado.lng], { radius: 7, color: '#DA291C', fillColor: '#DA291C', fillOpacity: 1 }).addTo(mapas.m3);
      });
    }
    if (estado.eclipse && featurePorFecha[estado.eclipse]) {
      if (mapas.franja3) mapas.m3.removeLayer(mapas.franja3);
      mapas.franja3 = L.geoJSON(featurePorFecha[estado.eclipse], { style: U.estiloFranja(true), interactive: false }).addTo(mapas.m3);
      mapas.m3.fitBounds(mapas.franja3.getBounds(), { maxZoom: 4 });
    }
    setTimeout(function () { mapas.m3.invalidateSize(); }, 50);
  }

  // 4 · La palabra
  $('palabra').addEventListener('input', function () {
    var v = this.value.trim();
    var varias = /\s/.test(v);
    $('aviso-palabra').textContent = varias ? 'Solo una. Si son dos, elige la que pese más.' : 'Una palabra. La que llegue primero.';
    $('sig4').disabled = !v || varias;
  });
  $('palabra').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !$('sig4').disabled) siguiente(); });
  $('sig4').addEventListener('click', siguiente);

  // 6 · Consentimiento
  $('ok-archivo').addEventListener('change', function () { $('sig6').disabled = !this.checked; });
  $('sig6').addEventListener('click', function () {
    estado.palabra = $('palabra').value.trim().toLowerCase();
    estado.relato = $('relato').value.trim();
    estado.ciudad = $('ciudad').value.trim();
    estado.anonimo = $('anonimo').checked;
    estado.nombre = estado.anonimo ? '' : $('nombre').value.trim();
    estado.okUsos = $('ok-usos').checked;
    estado.fechaRegistro = new Date().toISOString();
    U.guardar(estado);
    siguiente();
  });

  // 7 · Resultado
  function prepararPaso7() {
    var cuando = estado.eclipse ? 'el eclipse del ' + U.fecha(estado.eclipse) : 'un eclipse de ' + estado.anio;
    $('resumen7').textContent = '«' + estado.palabra + '», ' + cuando + (estado.ciudad ? ', ' + estado.ciudad : '') + '. Junto a ti, quienes vieron la sombra hace siglos.';
    if (!mapas.m7) {
      mapas.m7 = U.mapaBase($('mapa7'));
      U.capaTestigos(mapas.m7);
      U.eclipses().then(function (data) {
        var capa = L.geoJSON(data, { style: function (f) { return U.estiloFranja(f.properties.date === estado.eclipse); }, interactive: false }).addTo(mapas.m7);
        var lat = estado.lat, lng = estado.lng;
        var f = estado.eclipse && featurePorFecha[estado.eclipse];
        if ((lat === null || lng === null) && f) { var pt = U.puntoEnFranja(f); lat = pt[0]; lng = pt[1]; }
        if (lat !== null && lng !== null) U.marcaPalabra(mapas.m7, lat, lng, estado.palabra, true);
        if (f) mapas.m7.fitBounds(L.geoJSON(f).getBounds(), { maxZoom: 4, padding: [16, 16] });
        else if (lat !== null) mapas.m7.setView([lat, lng], 3);
      });
    }
    setTimeout(function () { mapas.m7.invalidateSize(); }, 50);
    dibujarPostal($('postal'), estado.palabra, estado.eclipse ? U.fecha(estado.eclipse) : 'Eclipse de ' + estado.anio, estado.ciudad, 'La sombra pasa. La memoria se queda.');
    $('descargar').href = $('postal').toDataURL('image/png');
    activarCompartir($('postal'), 'umbrhalia-postal.png');
  }

  // R · Todavía no
  function prepararR1() {
    U.proximos(3).then(function (lista) {
      $('proximas').innerHTML = lista.map(function (p) {
        return '<button class="opcion" data-fecha="' + p.date + '"><strong>' + U.fecha(p.date) + '</strong><br><span class="tenue chico">Faltan ' +
          U.diasHasta(p.date).toLocaleString('es-MX') + ' días · hasta ' + U.duracion(p.duration_s) + ' de totalidad</span></button>';
      }).join('');
      $('proximas').querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { estado.proxima = b.getAttribute('data-fecha'); ir('R2'); });
      });
    });
  }
  $('antes').addEventListener('input', function () { var v = this.value.trim(); $('sigR2').disabled = !v || /\s/.test(v); });
  $('sigR2').addEventListener('click', function () {
    estado.antes = $('antes').value.trim().toLowerCase();
    estado.fechaRegistro = new Date().toISOString();
    U.guardar(estado);
    ir('R3');
  });
  function prepararR3() {
    $('tituloR3').textContent = 'Te esperamos el ' + U.fecha(estado.proxima) + '.';
    $('resumenR3').textContent = 'Tu palabra de antes: «' + estado.antes + '». Después del eclipse te preguntaremos por la de ahora.';
    dibujarPostal($('postalR'), estado.antes, 'Antes del ' + U.fecha(estado.proxima), '', 'Carta al futuro');
    $('descargarR').href = $('postalR').toDataURL('image/png');
  }

  // Postal
  function dibujarPostal(cv, palabra, linea1, linea2, lema) {
    var c = cv.getContext('2d'), W = cv.width, H = cv.height;
    var F = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    c.fillStyle = '#0b0b0f'; c.fillRect(0, 0, W, H);
    // estrellas
    c.fillStyle = 'rgba(236,236,238,.7)';
    [[120, 160], [930, 120], [980, 520], [90, 640], [860, 980], [180, 1110], [560, 90], [1000, 820]].forEach(function (s) {
      c.beginPath(); c.arc(s[0], s[1], 2.4, 0, Math.PI * 2); c.fill();
    });
    // la ventana: disco negro, corona y anillo de diamante
    var cx = W / 2, cy = 470, r = 210;
    for (var k = 0; k < 4; k++) {
      c.strokeStyle = 'rgba(236,236,238,' + (0.55 - k * 0.12) + ')'; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, r + 26 + k * 26, 0, Math.PI * 2); c.stroke();
    }
    c.strokeStyle = '#ececee'; c.lineWidth = 4;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#DA291C';
    c.beginPath(); c.arc(cx + r * Math.cos(-0.8), cy + r * Math.sin(-0.8), 13, 0, Math.PI * 2); c.fill();
    // palabra
    c.fillStyle = '#ececee'; c.textAlign = 'center'; c.textBaseline = 'middle';
    var tam = 150;
    c.font = '200 ' + tam + 'px ' + F;
    while (c.measureText(palabra).width > W - 160 && tam > 50) { tam -= 6; c.font = '200 ' + tam + 'px ' + F; }
    c.fillText(palabra, cx, 900);
    c.font = '300 40px ' + F; c.fillStyle = '#9a9aa2';
    c.fillText(linea1, cx, 1010);
    if (linea2) c.fillText(linea2, cx, 1062);
    c.font = '300 34px ' + F; c.fillStyle = '#ececee';
    c.fillText(lema, cx, 1170);
    c.font = '200 34px ' + F; c.fillStyle = '#ececee';
    if (c.letterSpacing !== undefined) c.letterSpacing = '9px';
    c.fillText('UMBRHALIA', cx, 1262);
    if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
  }
  function activarCompartir(cv, nombre) {
    if (!navigator.canShare) return;
    cv.toBlob(function (blob) {
      var archivo = new File([blob], nombre, { type: 'image/png' });
      if (!navigator.canShare({ files: [archivo] })) return;
      var b = $('compartir'); b.hidden = false;
      b.onclick = function () { navigator.share({ files: [archivo], title: 'Umbrhalia', text: 'Dejé mi palabra en Umbrhalia.' }).catch(function () {}); };
    });
  }

  pintarProgreso('1');
})();
