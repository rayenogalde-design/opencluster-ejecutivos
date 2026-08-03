// ════════════════════════════════════════════════════════════════════════════
// Documento de ESPECIFICACIONES TÉCNICAS para licitaciones.
//
// REGLA DURA (Rayen, 2026-08-03): el contenido sale ÚNICAMENTE de
// SpecsLicitacion.js — el texto oficial que entrega el ejecutivo, palabra por
// palabra. No se mezcla con la web de Qinera, no se completa, no se corrige.
// Un producto sin texto oficial NO aparece con datos de otra fuente: sale
// listado como pendiente, para que nadie lo mande a una licitación creyendo
// que está completo.
//
// Qinera (LicitacionesData.js) se usa SOLO para dos cosas, ninguna de ellas
// tocar el texto:
//   1. La foto del producto, si el texto oficial no trae una.
//   2. Un control de contradicciones: si un número del texto oficial no calza
//      con el de Qinera, se avisa EN PANTALLA para que lo revise una persona.
//      Nunca se corrige solo ni se cambia el documento.
//
// Uso: OCT_especificaciones([{sku, nombre, cantidad}], {institucion, cotizacion})
// ════════════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/vibracustic/g, "vibroacustic").replace(/\s*-\s*/g, " ")
      .replace(/^sistema\s+/, "").replace(/\s+incluye.*$/, "")
      .replace(/\s+/g, " ").trim();
  }
  function clave(s) {
    var k = norm(s);
    var A = window._SM_PROD_ALIAS_PUB || {};
    return A[k] || k;
  }
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  // ── Texto OFICIAL: lo único que se imprime ──
  function oficialDe(sku, nombre) {
    var S = window.SPECS_LICITACION || {};
    if (sku && S[sku]) return S[sku];
    var A = window.SPECS_LICITACION_ALIAS || {};
    var k = clave(nombre);
    if (A[k] && S[A[k]]) return S[A[k]];
    if (nombre) {
      for (var s in S) {
        if (S[s] && S[s].nombre && clave(S[s].nombre) === k) return S[s];
      }
    }
    return null;
  }
  window.OCT_specOficialDe = oficialDe;

  // ── Qinera: SOLO foto y control, nunca contenido del documento ──
  function qineraDe(sku, nombre) {
    var L = window.LIC_PRODUCTOS || [];
    var k = clave(nombre);
    for (var i = 0; i < L.length; i++) {
      if (sku && L[i].ref && String(L[i].ref).toUpperCase() === String(sku).toUpperCase()) return L[i];
    }
    for (var j = 0; j < L.length; j++) {
      if (clave(L[j].nombre) === k || clave(L[j].nombre_qinera) === k) return L[j];
    }
    return null;
  }

  // Compara los números del texto oficial con los de Qinera. NO cambia nada:
  // devuelve las diferencias para que una persona las revise.
  function contradicciones(textoOficial, q) {
    if (!q || !textoOficial) return [];
    var sacaNums = function (t) {
      var out = {};
      // "Altura: 1,8 m" / "230 V" / "50 Hz" / "220x190x65 mm"
      var re = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m\b|kg|g\b|W\b|V\b|Hz|kHz|MHz|GHz|ohm|Ω|litros|L\b|"|pulg)/gi, m;
      while ((m = re.exec(t)) !== null) {
        var u = m[2].toLowerCase().replace("ω", "ohm");
        (out[u] = out[u] || []).push(m[1].replace(",", "."));
      }
      return out;
    };
    var a = sacaNums(textoOficial), b = sacaNums(String(q.especificaciones || "") + " " + String(q.descripcion || ""));
    var avisos = [];
    Object.keys(b).forEach(function (u) {
      if (!a[u]) return;
      var enOficial = a[u], enQinera = b[u];
      var comunes = enQinera.filter(function (x) { return enOficial.indexOf(x) >= 0; });
      if (comunes.length === 0 && enQinera.length && enOficial.length) {
        avisos.push("En " + u + ": el documento dice " + enOficial.join(" / ") + " y la web de Qinera dice " + enQinera.join(" / "));
      }
    });
    return avisos;
  }

  window.OCT_especificaciones = function (items, info) {
    info = info || {};
    var con = [], sin = [], revisar = [];
    (items || []).forEach(function (it) {
      var of = oficialDe(it.sku, it.nombre);
      if (!of) { sin.push({ sku: it.sku || "", nombre: it.nombre, cantidad: it.cantidad || 1 }); return; }
      var q = qineraDe(it.sku, it.nombre);
      var avisos = contradicciones(of.texto, q);
      if (avisos.length) revisar.push({ nombre: of.nombre || it.nombre, avisos: avisos });
      con.push({
        sku: it.sku || "", nombre: of.nombre || it.nombre, cantidad: it.cantidad || 1,
        texto: of.texto, fuente: of.fuente || "",
        foto: of.foto || (q && q.foto) || ""
      });
    });

    var hoy = new Date();
    var fecha = String(hoy.getDate()).padStart(2, "0") + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + hoy.getFullYear();

    // El texto oficial se imprime TAL CUAL, respetando sus saltos de línea.
    // Solo se escapa el HTML para que no se rompa la página; ni una palabra cambia.
    function cuerpoTexto(t) {
      return '<div class="oficial">' + esc(t).replace(/\r?\n/g, "<br>") + '</div>';
    }

    var filas = con.map(function (p) {
      var foto = p.foto
        ? '<img src="' + esc(p.foto) + '" alt="">'
        : '<div class="sinfoto">Sin imagen</div>';
      return '<tr>' +
        '<td class="c-img">' + foto + '</td>' +
        '<td class="c-prod"><div class="pnom">' + esc(p.nombre) + '</div>' +
          (p.sku ? '<div class="psku">' + esc(p.sku) + '</div>' : '') +
          (p.cantidad > 1 ? '<div class="pcant">Cantidad: ' + p.cantidad + '</div>' : '') +
        '</td>' +
        '<td class="c-spec">' + cuerpoTexto(p.texto) + '</td>' +
      '</tr>';
    }).join("");

    var avisoSin = sin.length
      ? '<div class="pendiente"><h3>FALTAN ' + sin.length + ' producto' + (sin.length === 1 ? "" : "s") + ' — el documento NO está completo</h3>' +
        '<p>Estos productos van en la cotización pero todavía no tienen su ficha técnica oficial cargada. ' +
        '<b>No se rellenaron con datos de otra fuente a propósito.</b> Hay que pedírselas al ejecutivo antes de presentar.</p><ul>' +
        sin.map(function (p) { return '<li>' + esc(p.nombre) + (p.sku ? ' <span class="psku">' + esc(p.sku) + '</span>' : '') + '</li>'; }).join("") +
        '</ul></div>'
      : '';

    var avisoRevisar = revisar.length
      ? '<div class="revisar no-print"><h3>Revisar antes de enviar (' + revisar.length + ')</h3>' +
        '<p>El texto oficial y la web de Qinera dan números distintos en estos productos. ' +
        '<b>El documento va con el texto oficial, sin cambios.</b> Esto es solo para que alguien lo mire.</p>' +
        revisar.map(function (r) {
          return '<div class="rv"><b>' + esc(r.nombre) + '</b><ul>' +
            r.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join("") + '</ul></div>';
        }).join("") + '</div>'
      : '';

    var sub = [];
    if (info.institucion) sub.push(esc(info.institucion));
    if (info.cotizacion) sub.push("Cotización " + esc(info.cotizacion));
    sub.push(fecha);

    var vacio = !con.length;
    var doc = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
      '<title>Especificaciones Técnicas' + (info.cotizacion ? " - " + esc(info.cotizacion) : "") + '</title>' +
      '<style>' +
      '@page{size:letter;margin:14mm 12mm;}' +
      '*{box-sizing:border-box}' +
      'body{margin:0;font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#1a1a2e;font-size:10.5pt;line-height:1.4;}' +
      '.barra{position:sticky;top:0;background:#0B5394;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;z-index:5;}' +
      '.barra b{font-size:14px;margin-right:auto}' +
      '.barra button{font:inherit;font-weight:700;padding:7px 14px;border:0;border-radius:8px;background:#fff;color:#0B5394;cursor:pointer;}' +
      '.barra span{font-size:12px;opacity:.92}' +
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
      '.oficial{white-space:normal;}' +
      'tr{page-break-inside:avoid;}' +
      'thead{display:table-header-group;}' +
      '.pendiente{margin-top:20px;border:2px solid #C62828;background:#FFEBEE;border-radius:8px;padding:12px 14px;page-break-inside:avoid;}' +
      '.pendiente h3{margin:0 0 4px;font-size:11pt;color:#B3261E;}' +
      '.pendiente p{margin:0 0 6px;font-size:9.5pt;}' +
      '.pendiente ul{margin:0;padding-left:16px;font-size:9.5pt;}' +
      '.revisar{margin-top:16px;border:1px solid #F0B429;background:#FFF8E6;border-radius:8px;padding:12px 14px;}' +
      '.revisar h3{margin:0 0 4px;font-size:11pt;color:#8A5B00;}' +
      '.revisar p{margin:0 0 6px;font-size:9.5pt;}' +
      '.revisar .rv{margin-top:6px;font-size:9.5pt;}' +
      '.revisar ul{margin:2px 0 0;padding-left:16px;}' +
      '.vacio{border:2px solid #C62828;background:#FFEBEE;border-radius:8px;padding:16px;color:#B3261E;}' +
      '.pie{margin-top:18px;font-size:8.5pt;color:#8894a4;text-align:center;}' +
      '@media print{.barra,.no-print{display:none}.hoja{padding:0;max-width:none}}' +
      '</style></head><body>' +
      '<div class="barra"><b>Especificaciones Técnicas</b>' +
        '<span>' + con.length + ' con ficha oficial' + (sin.length ? ' · ' + sin.length + ' SIN ficha' : '') + '</span>' +
        '<button onclick="window.print()">Imprimir / Guardar como PDF</button></div>' +
      '<div class="hoja">' +
        '<h1>Especificaciones Técnicas</h1>' +
        '<p class="sub">' + sub.join(" &middot; ") + '</p>' +
        (vacio
          ? '<div class="vacio"><b>Todavía no hay fichas técnicas oficiales cargadas.</b><br>' +
            'El documento se arma solo con el texto que entrega el ejecutivo, tal cual. ' +
            'Mientras no estén cargadas, no hay nada que imprimir — y no se rellena con otra fuente a propósito.</div>'
          : '<table><thead><tr><th>Imagen</th><th>Producto</th><th>Especificaciones técnicas</th></tr></thead><tbody>' + filas + '</tbody></table>') +
        avisoSin + avisoRevisar +
        '<p class="pie">OpenCluster Tech &middot; Documento generado el ' + fecha + '</p>' +
      '</div></body></html>';

    var w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana. Permite las ventanas emergentes de este sitio y vuelve a intentar."); return; }
    w.document.open(); w.document.write(doc); w.document.close();
    return { con: con.length, sin: sin.length, revisar: revisar.length };
  };
})();
