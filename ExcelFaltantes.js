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
    // Con costos (Rayen 2026-08-06): el informe de faltantes es PARA ELLA, para hacer el pedido,
    // asi que necesita ver cuanto le va a costar. Los costos NO viven en la pagina publicada: se
    // cargan desde su computador (ver "Cargar mis costos" en StockSalasMultisensoriales.html), y
    // solo se agregan al Excel si estan cargados.
    //   costoQinera      = "Precio OTC container completo" de la tarifa oficial (lo que le factura
    //                      Qinera; el transporte NO va incluido)
    //   costoPuesto      = el mismo x 1,551 → ya puesto en Chile (flete maritimo + importacion)
    var conCostos = !!info.conCostos;
    // DOS PESTAÑAS (Rayen 2026-08-12): la tarifa de Qinera tiene dos vías y no se piden igual.
    // Los que viajan en el contenedor marítimo (via 'M') van en la primera hoja; los que llegan
    // aparte, con el transporte ya incluido (via 'T': los Tobii, el soporte Rehadapt, Look to
    // Learn), van en la segunda. Mezclarlos en una sola lista hacía parecer que todo venía en el
    // mismo cargamento. Cada fila trae su via; sin via se asume contenedor.
    var _hojas = [
      { nombre: 'Contenedor', titulo: 'Faltantes — lo que viene en el contenedor', via: 'M',
        filas: filas.filter(function (r) { return r.via !== 'T'; }) }
    ];
    var _aparte = filas.filter(function (r) { return r.via === 'T'; });
    if (_aparte.length) _hojas.push({ nombre: 'Llegan aparte', filas: _aparte, via: 'T',
      titulo: 'Faltantes — se piden aparte (Qinera los manda con el transporte incluido)' });

    function _armarHoja(filas, tituloHoja, viaHoja) {
    // Rayen 2026-08-12: en el pedido quiere SKU de Qinera, nombre, cuántos y el COSTO DE COMPRA,
    // nada más. Y la moneda tiene que leerse fácil:
    //   · contenedor (via M) → EXW en EUROS. El costo guardado es el "OTC container completo" en
    //     pesos y ese número es el EXW en euros x1000 (verificado contra la factura OC 028/2026:
    //     39 de 40 líneas calzan al céntimo). Por eso se divide por mil: €2.084, no 2.084.000.
    //   · llegan aparte (via T) → ese precio ya viene en PESOS y con el flete dentro, no se toca.
    var _eur = viaHoja !== 'T';
    var COLS = conCostos
      ? (_eur
          ? ['SKU Qinera', 'Producto', 'Cantidad a pedir', 'EXW c/u (EUR)', 'EXW total (EUR)']
          : ['SKU Qinera', 'Producto', 'Cantidad a pedir', 'Costo compra c/u (CLP)', 'Costo compra total (CLP)'])
      : ['SKU Qinera', 'Producto', 'Cantidad a pedir'];
    var ULT = col(COLS.length - 1);
    var f = 0, xml = '';

    // Bloque de encabezado
    xml += '<row r="1" ht="24" customHeight="1">' + celdaTexto('A1', 1, tituloHoja) + '</row>';
    xml += '<row r="2" ht="16" customHeight="1">' + celdaTexto('A2', 2,
      (info.fecha || '') + (info.cotizaciones ? '   ·   ' + info.cotizaciones + ' cotizaciones consideradas' : '') +
      '   ·   ' + filas.length + ' productos por pedir' +
      (conCostos ? '   ·   con costos (uso interno — no compartir)' : '')) + '</row>';
    xml += '<row r="3"></row>';

    // Cabecera de la tabla (fila 4)
    xml += '<row r="4" ht="20" customHeight="1">';
    COLS.forEach(function (c, i) { xml += celdaTexto(col(i) + '4', 3, c); });
    xml += '</row>';

    // Datos desde la fila 5
    var totCompra = 0;
    // 9 = euros con dos decimales · 10 = lo mismo en negrita (fila del total). En pesos siguen
    // siendo el 7 y el 8, que ya existían.
    var estNum = _eur ? 9 : 7, estTot = _eur ? 10 : 8;
    filas.forEach(function (r, i) {
      f = i + 5;
      xml += '<row r="' + f + '">'
        + celdaTexto('A' + f, 4, r.sku || '—')
        + celdaTexto('B' + f, 4, r.nombre || '(sin nombre)')
        + celdaNumero('C' + f, 6, r.falta);
      if (conCostos) {
        // costoQinera viene en pesos. En los del contenedor ese numero es el EXW en euros x1000.
        var bruto = Number(r.costoQinera) || 0;
        var unit = _eur ? (bruto / 1000) : bruto;
        // Sin costo = ese producto NO esta en la tarifa de Qinera (o es de otro proveedor). Se dice,
        // en vez de poner 0, que se leeria como "sale gratis" y ensuciaria el total del pedido.
        if (!bruto) {
          xml += celdaTexto('D' + f, 5, 'no está en la tarifa') + celdaTexto('E' + f, 5, '—');
        } else {
          var total = unit * (Number(r.falta) || 0);
          totCompra += total;
          xml += celdaNumero('D' + f, estNum, unit) + celdaNumero('E' + f, estNum, total);
        }
      }
      xml += '</row>';
    });
    var ultima = filas.length ? (filas.length + 4) : 4;

    // Fila de totales: cuanto cuesta el pedido completo.
    if (conCostos && filas.length) {
      ultima = ultima + 1;
      xml += '<row r="' + ultima + '" ht="20" customHeight="1">'
        + celdaTexto('B' + ultima, 1, _eur ? 'TOTAL DEL PEDIDO (EUR)' : 'TOTAL DEL PEDIDO (CLP)')
        + celdaNumero('E' + ultima, estTot, totCompra)
        + '</row>';
    }

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
      +   (conCostos ? '<col min="4" max="5" width="22" customWidth="1"/>' : '')
      + '</cols>'
      + '<sheetData>' + xml + '</sheetData>'
      + '<autoFilter ref="A4:' + ULT + (filas.length ? (filas.length + 4) : 4) + '"/>'
      + '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '</worksheet>';
      return hoja;
    }

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
      // 201 = euros. Se muestran con dos decimales porque los EXW los tienen (€52,8 el difusor).
      + '<numFmts count="2">'
      +   '<numFmt numFmtId="200" formatCode="&quot;$&quot;#,##0"/>'
      +   '<numFmt numFmtId="201" formatCode="&quot;€&quot;#,##0.00"/>'
      + '</numFmts>'
      + '<cellXfs count="11">'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      +   '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
      +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      +   '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      // 7 = pesos con separador de miles · 8 = igual pero en negrita, para la fila del total
      +   '<xf numFmtId="200" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      +   '<xf numFmtId="200" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      // 9 = euros · 10 = euros en negrita (fila del total). Van AL FINAL para no correr los indices
      // de los estilos que ya usaban los otros generadores.
      +   '<xf numFmtId="201" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      +   '<xf numFmtId="201" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      + '</cellXfs>'
      + '</styleSheet>';

    // El libro se arma con TANTAS hojas como tenga _hojas (1 o 2). Los tres sitios que hay que
    // mantener en fila son: el Override de cada sheetN.xml, el <sheet> del workbook y su relación
    // rIdN. Si uno no calza, Excel se niega a abrir el archivo.
    var xmlHojas = _hojas.map(function (h) { return _armarHoja(h.filas, h.titulo, h.via); });
    var idEstilos = 'rId' + (xmlHojas.length + 1);

    var archivos = [
      { nombre: '[Content_Types].xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + xmlHojas.map(function (h, i) {
            return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
          }).join('')
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + '</Types>' },
      { nombre: '_rels/.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/workbook.xml', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheets>'
        + _hojas.map(function (h, i) {
            return '<sheet name="' + esc(h.nombre) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
          }).join('')
        + '</sheets></workbook>' },
      { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + xmlHojas.map(function (h, i) {
            return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
          }).join('')
        + '<Relationship Id="' + idEstilos + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/styles.xml', contenido: estilos }
    ].concat(xmlHojas.map(function (h, i) {
      return { nombre: 'xl/worksheets/sheet' + (i + 1) + '.xml', contenido: h };
    }));
    return armarZip(archivos);
  };


  // Excel de UNA cotización cruzada con el stock (pedido de Rayen 2026-07-30).
  // Uso: OCT_excelCotizacion({num, institucion, ejecutivo, fecha}, [{sku,nombre,pide,bodega,camino,estado}])
  // 'estado' es 'ok' | 'camino' | 'falta' | 'sindato' — decide el color de la celda.

  // Empaqueta una hoja ya armada en un .xlsx, con la paleta de estilos compartida
  // (0 normal · 1 titulo · 2 subtitulo · 3 cabecera · 4 texto · 5 centrado ·
  //  6 centrado gris · 7 rojo · 8 verde · 9 ambar).
  function _octZipExcel(hoja, nombreHoja) {
    var estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0"/></numFmts>'
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
      + '<cellXfs count="12">'
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
      +   '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
      +   '<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>'
      + '</cellXfs>'
      + '</styleSheet>';
    return armarZip([
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
        + '<sheets><sheet name="' + (nombreHoja || 'Hoja1') + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { nombre: 'xl/_rels/workbook.xml.rels', contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '</Relationships>' },
      { nombre: 'xl/styles.xml', contenido: estilos },
      { nombre: 'xl/worksheets/sheet1.xml', contenido: hoja }
    ]);
  }

  window.OCT_excelCotizacion = function (info, filas) {
    info = info || {}; filas = filas || [];
    var COLS = ['SKU', 'Producto', 'Pide', 'En bodega', 'En camino', 'Estado'];
    // El estado se DEDUCE de los numeros de cada fila, no de una etiqueta que manda
    // quien llama. Antes venia como texto ('cam' vs 'camino') y un desajuste dejaba la
    // columna en blanco sin avisar (paso el 2026-07-30). Asi no puede volver a pasar.
    var TXT = { ok: 'En bodega', camino: 'En camino', falta: 'FALTA', sindato: 'Sin dato' };
    var EST = { ok: 8, camino: 9, falta: 7, sindato: 6 };   // estilo por estado
    function estadoDe(r) {
      if (r.sinDato || r.estado === 'sindato') return 'sindato';
      var pide = Number(r.pide) || 0, bod = Number(r.bodega) || 0, cam = Number(r.camino) || 0;
      if (bod >= pide) return 'ok';
      if (bod + cam >= pide) return 'camino';
      return 'falta';
    }
    var nOk = 0, nCam = 0, nFalta = 0, nSin = 0;
    filas.forEach(function (r) {
      r._estado = estadoDe(r);
      if (r._estado === 'ok') nOk++;
      else if (r._estado === 'camino') nCam++;
      else if (r._estado === 'falta') nFalta++;
      else nSin++;
    });
    var xml = '';
    xml += '<row r="1" ht="24" customHeight="1">' + celdaTexto('A1', 1, 'Cotización ' + (info.num || '') + (info.institucion ? ' — ' + info.institucion : '')) + '</row>';
    xml += '<row r="2" ht="16" customHeight="1">' + celdaTexto('A2', 2,
      (info.ejecutivo ? 'Ejecutivo: ' + info.ejecutivo + '   ·   ' : '') + (info.fecha || '') +
      '   ·   ' + filas.length + ' productos   ·   ' + nOk + ' en bodega, ' + nCam + ' esperan el contenedor, ' + nFalta + ' faltan' + (nSin ? ', ' + nSin + ' sin dato' : '')) + '</row>';
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
        + (r._estado === 'sindato' ? celdaTexto('D' + f, 5, '—') : celdaNumero('D' + f, 5, r.bodega))
        + (r._estado === 'sindato' ? celdaTexto('E' + f, 5, '—') : celdaNumero('E' + f, 5, r.camino))
        + celdaTexto('F' + f, EST[r._estado] || 5, TXT[r._estado] || 'Sin dato')
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

    return _octZipExcel(hoja, 'Cotizacion');
  };


  // Excel de VARIAS cotizaciones juntas (pedido de Rayen 2026-07-30). Es la misma
  // tabla "lado a lado" de la pantalla: una columna por cotización con lo que pide
  // cada una del mismo producto, el total sumado y el stock. El estado se deduce
  // acá de los números, igual que en el Excel de una sola cotización.
  // Uso: OCT_excelComparacion({fecha}, ['OC26-1-SM', ...], [{sku,nombre,porCotiz,total,bodega,camino,sinDato}])
  window.OCT_excelComparacion = function (info, nums, filas) {
    info = info || {}; nums = nums || []; filas = filas || [];
    var TXT = { ok: 'En bodega', camino: 'En camino', falta: 'FALTA', sindato: 'Sin dato' };
    var EST = { ok: 8, camino: 9, falta: 7, sindato: 6 };
    function estadoDe(r) {
      if (r.sinDato) return 'sindato';
      var pide = Number(r.total) || 0, bod = Number(r.bodega) || 0, cam = Number(r.camino) || 0;
      if (bod >= pide) return 'ok';
      if (bod + cam >= pide) return 'camino';
      return 'falta';
    }
    var nOk = 0, nCam = 0, nFalta = 0, nSin = 0;
    filas.forEach(function (r) {
      r._estado = estadoDe(r);
      if (r._estado === 'ok') nOk++; else if (r._estado === 'camino') nCam++;
      else if (r._estado === 'falta') nFalta++; else nSin++;
    });

    var COLS = ['SKU', 'Producto'].concat(nums).concat(['Total pedido', 'En bodega', 'En camino', 'Estado']);
    var iTot = 2 + nums.length;   // índice de la columna "Total pedido"
    var xml = '';
    xml += '<row r="1" ht="24" customHeight="1">' + celdaTexto('A1', 1,
      'Cotizaciones lado a lado — ' + nums.length + (nums.length === 1 ? ' cotización' : ' cotizaciones')) + '</row>';
    xml += '<row r="2" ht="16" customHeight="1">' + celdaTexto('A2', 2,
      (info.fecha || '') + '   ·   ' + filas.length + ' productos distintos   ·   ' +
      nOk + ' en bodega, ' + nCam + ' esperan el contenedor, ' + nFalta + ' faltan' +
      (nSin ? ', ' + nSin + ' sin dato' : '')) + '</row>';
    xml += '<row r="3"></row>';
    xml += '<row r="4" ht="20" customHeight="1">';
    COLS.forEach(function (c, i) { xml += celdaTexto(col(i) + '4', 3, c); });
    xml += '</row>';

    filas.forEach(function (r, i) {
      var f = i + 5;
      xml += '<row r="' + f + '">'
        + celdaTexto('A' + f, 4, r.sku || '—')
        + celdaTexto('B' + f, 4, r.nombre || '(sin nombre)');
      nums.forEach(function (n, k) {
        var q = (r.porCotiz || {})[n];
        xml += q ? celdaNumero(col(2 + k) + f, 5, q) : celdaTexto(col(2 + k) + f, 6, '—');
      });
      xml += celdaNumero(col(iTot) + f, 5, r.total)
        + (r._estado === 'sindato' ? celdaTexto(col(iTot + 1) + f, 5, '—') : celdaNumero(col(iTot + 1) + f, 5, r.bodega))
        + (r._estado === 'sindato' ? celdaTexto(col(iTot + 2) + f, 5, '—') : celdaNumero(col(iTot + 2) + f, 5, r.camino))
        + celdaTexto(col(iTot + 3) + f, EST[r._estado] || 5, TXT[r._estado] || 'Sin dato')
        + '</row>';
    });
    var ultima = filas.length ? (filas.length + 4) : 4;
    var ultCol = col(COLS.length - 1);

    var anchos = '<col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="46" customWidth="1"/>';
    if (nums.length) anchos += '<col min="3" max="' + (2 + nums.length) + '" width="16" customWidth="1"/>';
    anchos += '<col min="' + (3 + nums.length) + '" max="' + (3 + nums.length) + '" width="13" customWidth="1"/>'
      + '<col min="' + (4 + nums.length) + '" max="' + (5 + nums.length) + '" width="12" customWidth="1"/>'
      + '<col min="' + (6 + nums.length) + '" max="' + (6 + nums.length) + '" width="14" customWidth="1"/>';

    var hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0" showGridLines="0">'
      +   '<pane xSplit="2" ySplit="4" topLeftCell="C5" activePane="bottomRight" state="frozen"/>'
      + '</sheetView></sheetViews>'
      + '<sheetFormatPr defaultRowHeight="15"/>'
      + '<cols>' + anchos + '</cols>'
      + '<sheetData>' + xml + '</sheetData>'
      + '<autoFilter ref="A4:' + ultCol + ultima + '"/>'
      + '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '</worksheet>';

    return _octZipExcel(hoja, 'Comparacion');
  };


  // Excel de una tabla cualquiera. 'filas' son arreglos de celdas: un número, o
  // {v, moneda:true}, o texto. Sirve para bajar el stock tal como se ve en pantalla.
  window.OCT_excelTabla = function (info, cols, filas) {
    info = info || {}; cols = cols || []; filas = filas || [];
    var xml = '';
    xml += '<row r="1" ht="24" customHeight="1">' + celdaTexto('A1', 1, info.titulo || 'Listado') + '</row>';
    xml += '<row r="2" ht="16" customHeight="1">' + celdaTexto('A2', 2, info.subtitulo || '') + '</row>';
    xml += '<row r="3"></row>';
    xml += '<row r="4" ht="20" customHeight="1">';
    cols.forEach(function (c, i) { xml += celdaTexto(col(i) + '4', 3, c); });
    xml += '</row>';
    filas.forEach(function (r, i) {
      var f = i + 5;
      xml += '<row r="' + f + '">';
      r.forEach(function (celda, k) {
        var ref = col(k) + f;
        if (celda && typeof celda === 'object') {
          if (celda.v == null || celda.v === '') xml += celdaTexto(ref, 6, '—');
          else if (celda.moneda) xml += celdaNumero(ref, 10, celda.v);
          else if (typeof celda.v === 'number') xml += celdaNumero(ref, 5, celda.v);
          else xml += celdaTexto(ref, 4, celda.v);
        } else if (typeof celda === 'number') xml += celdaNumero(ref, 5, celda);
        else if (celda == null || celda === '') xml += celdaTexto(ref, 6, '—');
        else xml += celdaTexto(ref, 4, celda);
      });
      xml += '</row>';
    });
    var ultima = filas.length ? (filas.length + 4) : 4;
    var anchos = (info.anchos || []).map(function (w, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join('');
    var hoja = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + '<sheetFormatPr defaultRowHeight="15"/>'
      + (anchos ? '<cols>' + anchos + '</cols>' : '')
      + '<sheetData>' + xml + '</sheetData>'
      + '<autoFilter ref="A4:' + col(cols.length - 1) + ultima + '"/>'
      + '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '</worksheet>';
    return _octZipExcel(hoja, info.hoja || 'Datos');
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
