// Genera un Excel (.xlsx) DE VERDAD con la lista de faltantes, sin librerías externas.
//
// ¿Por qué no un CSV o un HTML renombrado a .xls? Porque el CSV llega sin formato y el
// HTML con extensión .xls hace que Excel muestre una advertencia de "el formato no
// coincide" al abrirlo — feo para un archivo que va al jefe. Un .xlsx real es un ZIP
// con unos XML adentro, así que acá se arma el ZIP a mano (sin comprimir, método
// "store", que Excel acepta igual).
//
// Uso: OCT_excelFaltantes([{sku, nombre, falta, pedido, stock}], {fecha, cotizaciones})
(function () {
  'use strict';

  // ---------- CRC32, que el ZIP exige por cada archivo ----------
  var TABLA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  var utf8 = function (s) { return new TextEncoder().encode(s); };

  // ---------- Escritor de ZIP mínimo (sin compresión) ----------
  function armarZip(archivos) {
    var partes = [], central = [], desplazamiento = 0;
    var ahora = new Date();
    var hora = ((ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() / 2)) & 0xFFFF;
    var fecha = (((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate()) & 0xFFFF;

    archivos.forEach(function (f) {
      var nombre = utf8(f.nombre), datos = utf8(f.contenido), crc = crc32(datos);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, hora, true); lh.setUint16(12, fecha, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, datos.length, true); lh.setUint32(22, datos.length, true);
      lh.setUint16(26, nombre.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nombre, datos);

      var cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
      cd.setUint16(8, 0, true); cd.setUint16(10, 0, true); cd.setUint16(12, hora, true); cd.setUint16(14, fecha, true);
      cd.setUint32(16, crc, true); cd.setUint32(20, datos.length, true); cd.setUint32(24, datos.length, true);
      cd.setUint16(28, nombre.length, true); cd.setUint16(30, 0, true); cd.setUint16(32, 0, true);
      cd.setUint16(34, 0, true); cd.setUint16(36, 0, true); cd.setUint32(38, 0, true);
      cd.setUint32(42, desplazamiento, true);
      central.push(new Uint8Array(cd.buffer), nombre);
      desplazamiento += 30 + nombre.length + datos.length;
    });

    var largoCentral = central.reduce(function (a, b) { return a + b.length; }, 0);
    var eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true); eo.setUint16(4, 0, true); eo.setUint16(6, 0, true);
    eo.setUint16(8, archivos.length, true); eo.setUint16(10, archivos.length, true);
    eo.setUint32(12, largoCentral, true); eo.setUint32(16, desplazamiento, true); eo.setUint16(20, 0, true);
    return new Blob(partes.concat(central, [new Uint8Array(eo.buffer)]), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/\x00-\x08\x0B\x0C\x0E-\x1F/g, '');
  };
  var col = function (n) { var s = ''; n++; while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; } return s; };

  function celdaTexto(ref, estilo, valor) {
    return '<c r="' + ref + '" s="' + estilo + '" t="inlineStr"><is><t xml:space="preserve">' + esc(valor) + '</t></is></c>';
  }
  function celdaNumero(ref, estilo, valor) {
    return '<c r="' + ref + '" s="' + estilo + '"><v>' + (Number(valor) || 0) + '</v></c>';
  }

  window.OCT_excelFaltantes = function (filas, info) {
    info = info || {};
    // Mario quiere ver SOLO lo que falta: nada de "se piden" ni "en stock".
    var COLS = ['SKU', 'Producto', 'Faltan'];
    var f = 0, xml = '';

    // Bloque de encabezado
    xml += '<row r="1" ht="24" customHeight="1">' + celdaTexto('A1', 1, 'Faltantes — Salas Multisensoriales') + '</row>';
    xml += '<row r="2" ht="16" customHeight="1">' + celdaTexto('A2', 2,
      (info.fecha || '') + (info.cotizaciones ? '   ·   ' + info.cotizaciones + ' cotizaciones consideradas' : '') +
      '   ·   ' + filas.length + ' productos por pedir') + '</row>';
    xml += '<row r="3"></row>';

    // Cabecera de la tabla (fila 4)
    xml += '<row r="4" ht="20" customHeight="1">';
    COLS.forEach(function (c, i) { xml += celdaTexto(col(i) + '4', 3, c); });
    xml += '</row>';

    // Datos desde la fila 5
    filas.forEach(function (r, i) {
      f = i + 5;
      xml += '<row r="' + f + '">'
        + celdaTexto('A' + f, 4, r.sku || '—')
        + celdaTexto('B' + f, 4, r.nombre || '(sin nombre)')
        + celdaNumero('C' + f, 6, r.falta)
        + '</row>';
    });
    var ultima = filas.length ? (filas.length + 4) : 4;

    var hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>'
      + '<sheetViews><sheetView workbookViewId="0" showGridLines="0">'
      +   '<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>'
      + '</sheetView></sheetViews>'
      + '<sheetFormatPr defaultRowHeight="15"/>'
      + '<cols>'
      +   '<col min="1" max="1" width="18" customWidth="1"/>'
      +   '<col min="2" max="2" width="58" customWidth="1"/>'
      +   '<col min="3" max="3" width="12" customWidth="1"/>'
      + '</cols>'
      + '<sheetData>' + xml + '</sheetData>'
      + '<autoFilter ref="A4:C' + ultima + '"/>'
      + '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '</worksheet>';

    var estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="5">'
      +   '<font><sz val="11"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="15"/><color rgb="FF16324F"/><name val="Calibri"/></font>'
      +   '<font><sz val="10"/><color rgb="FF7C8794"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="11"/><color rgb="FFB3261E"/><name val="Calibri"/></font>'
      + '</fonts>'
      + '<fills count="3">'
      +   '<fill><patternFill patternType="none"/></fill>'
      +   '<fill><patternFill patternType="gray125"/></fill>'
      +   '<fill><patternFill patternType="solid"><fgColor rgb="FF16324F"/><bgColor indexed="64"/></patternFill></fill>'
      + '</fills>'
      + '<borders count="2">'
      +   '<border><left/><right/><top/><bottom/><diagonal/></border>'
      +   '<border><left/><right/><top/><bottom style="thin"><color rgb="FFE3E7EC"/></bottom><diagonal/></border>'
      + '</borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="7">'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      +   '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '</cellXfs>'
      + '</styleSheet>';

    var archivos = [
      { nombre: '[Content_Types].xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + '</Types>' },
      { nombre: '_rels/.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/workbook.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheets><sheet name="Faltantes" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/styles.xml', contenido: estilos },
      { nombre: 'xl/worksheets/sheet1.xml', contenido: hoja }
    ];
    return armarZip(archivos);
  };


  // Excel de UNA cotización cruzada con el stock (pedido de Rayen 2026-07-30).
  // Uso: OCT_excelCotizacion({num, institucion, ejecutivo, fecha}, [{sku,nombre,pide,bodega,camino,estado}])
  // 'estado' es 'ok' | 'camino' | 'falta' | 'sindato' — decide el color de la celda.
  window.OCT_excelCotizacion = function (info, filas) {
    info = info || {}; filas = filas || [];
    var COLS = ['SKU', 'Producto', 'Pide', 'En bodega', 'En camino', 'Estado'];
    var TXT = { ok: 'En bodega', camino: 'En camino', falta: 'FALTA', sindato: 'Sin dato' };
    var EST = { ok: 8, camino: 9, falta: 7, sindato: 6 };   // estilo por estado
    var nOk = 0, nCam = 0, nFalta = 0;
    filas.forEach(function (r) {
      if (r.estado === 'ok') nOk++; else if (r.estado === 'camino') nCam++; else if (r.estado === 'falta') nFalta++;
    });
    var xml = '';
    xml += '<row r="1" ht="24" customHeight="1">' + celdaTexto('A1', 1, 'Cotización ' + (info.num || '') + (info.institucion ? ' — ' + info.institucion : '')) + '</row>';
    xml += '<row r="2" ht="16" customHeight="1">' + celdaTexto('A2', 2,
      (info.ejecutivo ? 'Ejecutivo: ' + info.ejecutivo + '   ·   ' : '') + (info.fecha || '') +
      '   ·   ' + filas.length + ' productos   ·   ' + nOk + ' en bodega, ' + nCam + ' esperan el contenedor, ' + nFalta + ' faltan') + '</row>';
    xml += '<row r="3"></row>';
    xml += '<row r="4" ht="20" customHeight="1">';
    COLS.forEach(function (c, i) { xml += celdaTexto(col(i) + '4', 3, c); });
    xml += '</row>';
    filas.forEach(function (r, i) {
      var f = i + 5;
      xml += '<row r="' + f + '">'
        + celdaTexto('A' + f, 4, r.sku || '—')
        + celdaTexto('B' + f, 4, r.nombre || '(sin nombre)')
        + celdaNumero('C' + f, 5, r.pide)
        + (r.estado === 'sindato' ? celdaTexto('D' + f, 5, '—') : celdaNumero('D' + f, 5, r.bodega))
        + (r.estado === 'sindato' ? celdaTexto('E' + f, 5, '—') : celdaNumero('E' + f, 5, r.camino))
        + celdaTexto('F' + f, EST[r.estado] || 5, TXT[r.estado] || '')
        + '</row>';
    });
    var ultima = filas.length ? (filas.length + 4) : 4;

    var hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0" showGridLines="0">'
      +   '<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>'
      + '</sheetView></sheetViews>'
      + '<sheetFormatPr defaultRowHeight="15"/>'
      + '<cols>'
      +   '<col min="1" max="1" width="16" customWidth="1"/>'
      +   '<col min="2" max="2" width="52" customWidth="1"/>'
      +   '<col min="3" max="3" width="8" customWidth="1"/>'
      +   '<col min="4" max="4" width="12" customWidth="1"/>'
      +   '<col min="5" max="5" width="12" customWidth="1"/>'
      +   '<col min="6" max="6" width="14" customWidth="1"/>'
      + '</cols>'
      + '<sheetData>' + xml + '</sheetData>'
      + '<autoFilter ref="A4:F' + ultima + '"/>'
      + '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '</worksheet>';

    var estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="7">'
      +   '<font><sz val="11"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="15"/><color rgb="FF16324F"/><name val="Calibri"/></font>'
      +   '<font><sz val="10"/><color rgb="FF7C8794"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="11"/><color rgb="FFB3261E"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="11"/><color rgb="FF2F7D55"/><name val="Calibri"/></font>'
      +   '<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/></font>'
      + '</fonts>'
      + '<fills count="3">'
      +   '<fill><patternFill patternType="none"/></fill>'
      +   '<fill><patternFill patternType="gray125"/></fill>'
      +   '<fill><patternFill patternType="solid"><fgColor rgb="FF16324F"/><bgColor indexed="64"/></patternFill></fill>'
      + '</fills>'
      + '<borders count="2">'
      +   '<border><left/><right/><top/><bottom/><diagonal/></border>'
      +   '<border><left/><right/><top/><bottom style="thin"><color rgb="FFE3E7EC"/></bottom><diagonal/></border>'
      + '</borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="10">'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      +   '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '</cellXfs>'
      + '</styleSheet>';

    var archivos = [
      { nombre: '[Content_Types].xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + '</Types>' },
      { nombre: '_rels/.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/workbook.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheets><sheet name="Cotizacion" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/styles.xml', contenido: estilos },
      { nombre: 'xl/worksheets/sheet1.xml', contenido: hoja }
    ];
    return armarZip(archivos);
  };

  // Dispara la descarga del Blob con el nombre dado.
  window.OCT_descargar = function (blob, nombre) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
})();
