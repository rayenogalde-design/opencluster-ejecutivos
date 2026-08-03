// ════════════════════════════════════════════════════════════════════════════
// Documento de ESPECIFICACIONES TÉCNICAS para licitaciones.
// Pedido de Rayen 2026-08-03: cada vez que presenta una cotización a una
// municipalidad tiene que adjuntar un documento con las specs de cada producto.
// Hasta ahora se lo pedía a un ejecutivo y lo armaba a mano.
//
// Uso:  OCT_especificaciones([{sku, nombre, cantidad}], {titulo, institucion, cotizacion})
// Abre una ventana con el documento listo para "Imprimir / Guardar como PDF".
//
// Los datos salen de LicitacionesData.js (window.LIC_PRODUCTOS): 53 productos con
// las specs sacadas de Qinera y VERIFICADAS una por una (ver memoria
// specs-licitaciones-sensoriales). Lo que no tiene spec NO se inventa: sale
// listado aparte al final para que ella sepa qué pedir.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/vibracustic/g, "vibroacustic").replace(/\s*-\s*/g, " ")
      .replace(/^sistema\s+/, "").replace(/\s+incluye.*$/, "")
      .replace(/\s+/g, " ").trim();
  }
  // Se apoya en la misma tabla de alias de la página de Stock si está cargada:
  // así "Espejo Recto Grande" (cotización) encuentra "Espejo grande recto" (bodega).
  function clave(s) {
    var k = norm(s);
    var A = window._SM_PROD_ALIAS_PUB || {};
    return A[k] || k;
  }

  var _idx = null;
  function indice() {
    if (_idx) return _idx;
    var porRef = {}, porNombre = {};
    (window.LIC_PRODUCTOS || []).forEach(function (s) {
      if (s.ref) porRef[String(s.ref).trim().toUpperCase()] = s;
      [s.nombre, s.nombre_qinera].filter(Boolean).forEach(function (n) {
        var k = clave(n);
        if (k && !porNombre[k]) porNombre[k] = s;
      });
    });
    _idx = { porRef: porRef, porNombre: porNombre };
    return _idx;
  }
  // Busca la spec de un producto: primero por código (lo más seguro), después por
  // nombre, y como último recurso por el nombre que tiene en bodega para ese SKU.
  function specDe(sku, nombre) {
    var I = indice();
    if (sku && I.porRef[String(sku).toUpperCase()]) return I.porRef[String(sku).toUpperCase()];
    if (nombre && I.porNombre[clave(nombre)]) return I.porNombre[clave(nombre)];
    if (sku && window.STOCK_SALAS) {
      for (var k in window.STOCK_SALAS) {
        var p = window.STOCK_SALAS[k];
        if (p && p.sku === sku && I.porNombre[clave(p.item)]) return I.porNombre[clave(p.item)];
      }
    }
    return null;
  }
  window.OCT_specDe = specDe;

  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  // El texto de specs viene en un párrafo largo con "Etiqueta: valor" separados por
  // punto y coma o punto. Se parte en viñetas para que se lea como el documento que
  // ella ya usa, sin cambiar ni una palabra del contenido.
  function aViñetas(texto) {
    var t = String(texto || "").trim();
    if (!t) return [];
    var partes = t.split(/\s*;\s*|\s*\.\s+(?=[A-ZÁÉÍÓÚÑ])/).map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 2; });
    if (partes.length < 2) partes = [t];
    return partes.map(function (p) {
      var m = p.match(/^([^:]{3,42}):\s*([\s\S]+)$/);
      return m ? { k: m[1].trim(), v: m[2].trim() } : { k: "", v: p.replace(/\.$/, "") };
    });
  }

  function bloqueSpec(p) {
    var s = p.spec;
    var filas = [];
    if (s.descripcion) filas.push({ k: "Descripción", v: s.descripcion });
    if (s.usos) filas.push({ k: "Indicado para", v: s.usos });
    var tec = aViñetas(s.especificaciones);
    var htmlTec = tec.map(function (x) {
      return '<li>' + (x.k ? '<b>' + esc(x.k) + ':</b> ' : '') + esc(x.v) + '</li>';
    }).join("");
    var enc = filas.map(function (x) {
      return '<li><b>' + esc(x.k) + ':</b> ' + esc(x.v) + '</li>';
    }).join("");
    return '<ul>' + enc + htmlTec + '</ul>' +
      (s.url ? '<p class="ref">Ficha del fabricante: <span>' + esc(s.url) + '</span></p>' : '');
  }

  window.OCT_especificaciones = function (items, info) {
    info = info || {};
    var con = [], sin = [];
    (items || []).forEach(function (it) {
      var s = specDe(it.sku, it.nombre);
      if (s) con.push({ sku: it.sku || s.ref || "", nombre: s.nombre || it.nombre, cantidad: it.cantidad || 1, spec: s });
      else sin.push({ sku: it.sku || "", nombre: it.nombre, cantidad: it.cantidad || 1 });
    });
    if (!con.length && !sin.length) { alert("No hay productos para el documento."); return; }

    var hoy = new Date();
    var fecha = String(hoy.getDate()).padStart(2, "0") + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + hoy.getFullYear();

    var filas = con.map(function (p) {
      var foto = p.spec.foto
        ? '<img src="' + esc(p.spec.foto) + '" alt="" crossorigin="anonymous">'
        : '<div class="sinfoto">Sin imagen</div>';
      return '<tr>' +
        '<td class="c-img">' + foto + '</td>' +
        '<td class="c-prod"><div class="pnom">' + esc(p.nombre) + '</div>' +
          (p.sku ? '<div class="psku">' + esc(p.sku) + '</div>' : '') +
          (p.cantidad > 1 ? '<div class="pcant">Cantidad: ' + p.cantidad + '</div>' : '') +
        '</td>' +
        '<td class="c-spec">' + bloqueSpec(p) + '</td>' +
      '</tr>';
    }).join("");

    var avisoSin = sin.length
      ? '<div class="pendiente"><h3>Productos sin ficha técnica cargada (' + sin.length + ')</h3>' +
        '<p>Estos productos van en la cotización pero todavía no tienen especificaciones en el sistema. ' +
        'Hay que conseguirlas antes de presentar el documento.</p><ul>' +
        sin.map(function (p) { return '<li>' + esc(p.nombre) + (p.sku ? ' <span class="psku">' + esc(p.sku) + '</span>' : '') + '</li>'; }).join("") +
        '</ul></div>'
      : '';

    var sub = [];
    if (info.institucion) sub.push(esc(info.institucion));
    if (info.cotizacion) sub.push("Cotización " + esc(info.cotizacion));
    sub.push(fecha);

    var doc = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
      '<title>Especificaciones Técnicas' + (info.cotizacion ? " - " + esc(info.cotizacion) : "") + '</title>' +
      '<style>' +
      '@page{size:letter;margin:14mm 12mm;}' +
      '*{box-sizing:border-box}' +
      'body{margin:0;font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#1a1a2e;font-size:10.5pt;line-height:1.4;}' +
      '.barra{position:sticky;top:0;background:#0B5394;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}' +
      '.barra b{font-size:14px;margin-right:auto}' +
      '.barra button{font:inherit;font-weight:700;padding:7px 14px;border:0;border-radius:8px;background:#fff;color:#0B5394;cursor:pointer;}' +
      '.barra span{font-size:12px;opacity:.9}' +
      '.hoja{padding:18px 20px 40px;max-width:900px;margin:0 auto;}' +
      'h1{font-size:20pt;color:#1B4F87;margin:0 0 2px;font-weight:700;}' +
      '.sub{color:#555;font-size:10pt;margin:0 0 16px;}' +
      'table{width:100%;border-collapse:collapse;}' +
      'thead th{background:#1B4F87;color:#fff;font-size:10pt;padding:7px 9px;text-align:left;border:1px solid #1B4F87;}' +
      'td{border:1px solid #C9D3DF;padding:8px 9px;vertical-align:top;}' +
      '.c-img{width:96px;text-align:center;}' +
      '.c-img img{max-width:86px;max-height:86px;object-fit:contain;}' +
      '.sinfoto{width:86px;height:60px;display:flex;align-items:center;justify-content:center;border:1px dashed #C9D3DF;color:#98A2AE;font-size:8pt;}' +
      '.c-prod{width:150px;}' +
      '.pnom{font-weight:700;}' +
      '.psku{font-size:8.5pt;color:#6b7280;font-family:Consolas,monospace;margin-top:2px;}' +
      '.pcant{font-size:9pt;color:#0B5394;font-weight:700;margin-top:3px;}' +
      '.c-spec ul{margin:0;padding-left:15px;}' +
      '.c-spec li{margin-bottom:3px;}' +
      '.ref{margin:6px 0 0;font-size:8pt;color:#8894a4;}' +
      '.ref span{word-break:break-all;}' +
      'tr{page-break-inside:avoid;}' +
      'thead{display:table-header-group;}' +
      '.pendiente{margin-top:20px;border:1px solid #F0B429;background:#FFF8E6;border-radius:8px;padding:12px 14px;page-break-inside:avoid;}' +
      '.pendiente h3{margin:0 0 4px;font-size:11pt;color:#8A5B00;}' +
      '.pendiente p{margin:0 0 6px;font-size:9.5pt;}' +
      '.pendiente ul{margin:0;padding-left:16px;font-size:9.5pt;}' +
      '.pie{margin-top:18px;font-size:8.5pt;color:#8894a4;text-align:center;}' +
      '@media print{.barra{display:none}.hoja{padding:0;max-width:none}.pendiente{border-color:#bbb;background:#f6f6f6}}' +
      '</style></head><body>' +
      '<div class="barra"><b>Especificaciones Técnicas</b>' +
        '<span>' + con.length + ' productos' + (sin.length ? ' · ' + sin.length + ' sin ficha' : '') + '</span>' +
        '<button onclick="window.print()">Imprimir / Guardar como PDF</button></div>' +
      '<div class="hoja">' +
        '<h1>Especificaciones Técnicas</h1>' +
        '<p class="sub">' + sub.join(" &middot; ") + '</p>' +
        (con.length
          ? '<table><thead><tr><th>Imagen</th><th>Producto</th><th>Especificaciones técnicas</th></tr></thead><tbody>' + filas + '</tbody></table>'
          : '<p>Ninguno de los productos seleccionados tiene ficha técnica cargada.</p>') +
        avisoSin +
        '<p class="pie">OpenCluster Tech &middot; Documento generado el ' + fecha + '</p>' +
      '</div></body></html>';

    var w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana. Permite las ventanas emergentes de este sitio y vuelve a intentar."); return; }
    w.document.open(); w.document.write(doc); w.document.close();
    return { con: con.length, sin: sin.length };
  };
})();
