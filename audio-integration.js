/* ═══════════════════════════════════════════════════════════════════
   OpenCluster Academia — audio-integration.js
   ───────────────────────────────────────────────────────────────────
   Capa de almacenamiento de grabaciones de voz del curso. Define
   window.OpenClusterAcademyAudio con un único método:

     upload({ curso, ejercicioId, blob, mime, fecha })  → {url, id} | null

   El curso lo llama en fire-and-forget cuando el ejecutivo termina de
   grabarse en el ejercicio "Grábate y escúchate". La subida sirve para
   que SOLO la jefatura pueda reescuchar la grabación desde el panel
   AcademiaProgreso.html. El ejecutivo nunca ve una lista ni un aviso:
   su reescucha local (URL.createObjectURL) ya existe y no se toca.

   Stack: mismo patrón del ecosistema (Apps Script propio + su Sheet +
   carpeta de Drive). El blob se manda en base64 dentro de un POST
   text/plain (sin preflight CORS). El backend (ACADEMIA_AUDIO_API) lo
   guarda en Drive y registra una fila {ejecutivo, curso, ejercicio_id,
   url_audio, fecha}.

   Identidad: localStorage 'oc_central_user' (misma sesión de la Central
   que usan pipeline-integration.js y progress-integration.js).

   Desacoplado: se carga vía
     <script src="./audio-integration.js" onerror="window.__ocAudioMissing=true;">
   Si el archivo falta, la URL no está configurada, o la subida falla,
   upload() devuelve null y el curso sigue intacto (jamás rompe).
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 1. URL del backend de audio (ACADEMIA_AUDIO_API) ───────────
     Pegar aquí la URL /exec del Web App cuando esté desplegado.
     Mientras esté vacía, upload() es un no-op silencioso. */
  /* Mismo Web App ACADEMIA_IA_API que progress-integration.js: el endpoint
     action:'subir' guarda el audio en Drive y registra la fila. Un solo deploy. */
  var AUDIO_API_URL = 'https://script.google.com/macros/s/AKfycbzK0XFzsT-6_ImJYugk-4BsdYXft-7Mv0PhEIuw-wdv95Ln6cd1fOUVJEmENxy21ApRHg/exec';

  /* Tope defensivo: Apps Script recibe el POST en memoria y base64 infla
     ~33%. Una apertura hablada de 30-90 s en webm pesa muy por debajo de
     esto; si por algún motivo llega algo enorme, no lo subimos. */
  var MAX_BYTES = 8 * 1024 * 1024;   // 8 MB

  function getEjecutivo() {
    try { return localStorage.getItem('oc_central_user') || ''; } catch (e) { return ''; }
  }

  /* Blob → base64 puro (sin el prefijo data:...;base64,). */
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      try {
        var fr = new FileReader();
        fr.onload = function () {
          var res = String(fr.result || '');
          var comma = res.indexOf(',');
          resolve(comma >= 0 ? res.slice(comma + 1) : res);
        };
        fr.onerror = function () { reject(fr.error || new Error('FileReader error')); };
        fr.readAsDataURL(blob);
      } catch (e) { reject(e); }
    });
  }

  window.OpenClusterAcademyAudio = {

    /* Sube una grabación. Fire-and-forget: nunca lanza, devuelve null
       ante cualquier problema. */
    upload: async function (opts) {
      try {
        opts = opts || {};
        var blob = opts.blob;
        if (!AUDIO_API_URL) return null;                       // backend no configurado
        if (!blob || typeof blob.size !== 'number') return null;
        if (blob.size === 0 || blob.size > MAX_BYTES) return null;

        var ejecutivo = getEjecutivo();
        if (!ejecutivo) return null;                           // sin sesión → no se sube

        var dataBase64 = await blobToBase64(blob);
        if (!dataBase64) return null;

        var payload = {
          action: 'subir',
          ejecutivo: ejecutivo,
          curso: String(opts.curso || ''),
          ejercicioId: String(opts.ejercicioId || ''),
          mime: String(opts.mime || blob.type || 'audio/webm'),
          fecha: String(opts.fecha || new Date().toISOString()),
          dataBase64: dataBase64
        };

        var resp = await fetch(AUDIO_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) return null;
        var data = await resp.json();
        if (!data || !data.ok) return null;
        return { url: data.url || '', id: data.id || '' };
      } catch (e) {
        return null;   // la subida nunca rompe el ejercicio
      }
    }
  };
})();
