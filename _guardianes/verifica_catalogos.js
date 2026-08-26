/**
 * GUARDIAN DE CATALOGOS  —  25-ago-2026
 *
 * Impide publicar un catalogo que abriria EN BLANCO.
 *
 * Que revisa: los catalogos son una "caja cerrada" (bloques
 * <script type="__bundler/...">) que guardan la pagina entera como un texto JSON.
 * Si dentro de ese texto queda un </script> sin disfrazar (debe ir como <\u002Fscript>),
 * el navegador cierra el bloque ahi mismo y la pagina llega truncada: pantalla en blanco,
 * y SIN ningun mensaje de error.
 *
 * Este guardian hace lo mismo que el navegador: corta en el primer </script> y trata de
 * leer el JSON. Si no se puede leer, el catalogo esta roto.
 *
 * Uso:
 *   node _guardianes/verifica_catalogos.js              -> revisa todos los .html del repo
 *   node _guardianes/verifica_catalogos.js a.html b.html -> revisa solo esos
 * Sale con codigo 1 si encuentra alguno roto.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const BS = String.fromCharCode(92);
const ESCAPE_BUENO = '<' + BS + 'u002F' + 'script>';

function bloquesEmpaquetados(html) {
  // Igual que el navegador: abre en <script type="__bundler/...">, cierra en el PRIMER </script>
  const bloques = [];
  const re = /<script\s+type="(__bundler\/[a-z_]+)"\s*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const ini = m.index + m[0].length;
    const fin = html.indexOf('</script>', ini);
    bloques.push({
      tipo: m[1],
      texto: fin < 0 ? html.slice(ini) : html.slice(ini, fin),
      sinCierre: fin < 0
    });
  }
  return bloques;
}

function revisar(archivo) {
  const html = fs.readFileSync(archivo, 'utf8');
  const bloques = bloquesEmpaquetados(html);
  if (!bloques.length) return { estado: 'sin-caja' };

  const fallas = [];
  for (const b of bloques) {
    const t = b.texto.trim();
    if (!t) { fallas.push(b.tipo + ': llega vacio'); continue; }
    try {
      JSON.parse(t);
    } catch (e) {
      fallas.push(b.tipo + ': se corta a los ' + t.length +
        ' caracteres y ya no se puede leer (' + String(e.message).slice(0, 60) + ')');
    }
  }
  return { estado: fallas.length ? 'roto' : 'ok', bloques: bloques.length, fallas };
}

// ── que archivos revisar ──
let objetivos = process.argv.slice(2);
if (!objetivos.length) {
  objetivos = fs.readdirSync(REPO).filter(f => f.toLowerCase().endsWith('.html'));
}
objetivos = objetivos
  .map(f => (path.isAbsolute(f) ? f : path.join(REPO, f)))
  .filter(f => fs.existsSync(f) && fs.statSync(f).isFile());

let rotos = 0, revisados = 0;
for (const f of objetivos) {
  const r = revisar(f);
  const nombre = path.basename(f);
  if (r.estado === 'sin-caja') continue;
  revisados++;
  if (r.estado === 'roto') {
    rotos++;
    console.error('  ROTO  ' + nombre);
    r.fallas.forEach(x => console.error('        ' + x));
  }
}

if (rotos) {
  console.error('');
  console.error('  ' + rotos + ' de ' + revisados + ' catalogos abririan EN BLANCO. No se publica.');
  console.error('');
  console.error('  Como se arregla: en la linea larga de la caja, todo </ va escrito <' + BS + 'u002F.');
  console.error('  El cierre correcto se ve asi: ' + ESCAPE_BUENO);
  console.error('  Referencia sana: CatalogoClickMedical.html');
  console.error('  Comprobar despues que JSON.parse de la linea vieja y la nueva dan el MISMO texto,');
  console.error('  para no cambiar ningun producto, precio ni foto.');
  process.exit(1);
}
console.log('  OK: ' + revisados + ' catalogos se abren completos.');
