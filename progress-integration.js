/* ═══════════════════════════════════════════════════════════════════
   OpenCluster Academia — progress-integration.js
   ───────────────────────────────────────────────────────────────────
   El curso llama a window.OpenClusterProgress.onModuleComplete(info)
   al completar cada módulo. Reportamos el avance al backend ACADEMIA_API
   (el mismo que lee AcademiaProgreso.html). Nunca rompe el curso.

   info = {
     curso:         slug del curso (ej. 'outreach'),
     moduloId:      id del módulo recién completado (ej. 'm3'),
     moduloTitulo:  título del módulo (no se envía al backend),
     completados:   módulos completados hasta ahora,
     total:         total de módulos del curso
   }

   Identidad: localStorage 'oc_central_user' (sesión de la Central).
   Sin sesión o sin datos válidos → no reporta (silencio).

   Define `window.OpenClusterProgress.onModuleComplete`. Se carga vía
   <script src="./progress-integration.js"> en Academia_Curso_Outreach.html
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var ACADEMIA_API = 'https://script.google.com/macros/s/AKfycbzK0XFzsT-6_ImJYugk-4BsdYXft-7Mv0PhEIuw-wdv95Ln6cd1fOUVJEmENxy21ApRHg/exec';

  // Mapeo slug -> título visible en el panel admin. La Sheet agrupa por
  // título (no por slug), así que mantener consistencia evita filas
  // duplicadas para un mismo curso. Al sumar cursos nuevos: añadir aquí.
  var COURSE_TITLES = {
    'outreach': 'Outreach por email',
    'discovery': 'Discovery telefónico',
    'postventa': 'Postventa y expansión',
    'proceso': 'El proceso completo'
  };

  window.OpenClusterProgress = {
    onModuleComplete: function (info) {
      try {
        if (!info || typeof info !== 'object') return;

        var ejecutivo = '';
        try { ejecutivo = localStorage.getItem('oc_central_user') || ''; } catch (e) {}
        if (!ejecutivo) return;                            // sin sesión → no reporta

        var slug = String(info.curso || '');
        var titulo = COURSE_TITLES[slug] || slug;
        var completados = Number(info.completados || 0);
        var total = Number(info.total || 0);
        if (!titulo || !total) return;                     // datos incompletos → no reporta

        var pct = Math.round((completados / total) * 100);

        var payload = {
          action: 'progreso_guardar',                      // sin esto el doPost lo ignora
          ejecutivo: ejecutivo,
          curso: titulo,
          modulos_completados: completados,
          total_modulos: total,
          pct: pct,
          modulos_idx: String(info.moduloId || '')
        };

        // POST text/plain → simple request (sin preflight CORS).
        fetch(ACADEMIA_API, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () { /* silencio: el curso ya tiene su try/catch */ });
      } catch (e) {
        // silencio total — el curso no debe romperse por un reporte fallido
      }
    },

    /* Guarda las respuestas escritas/quiz de un módulo recién completado.
       El curso arma `items` (sabe la estructura de sus pantallas) y acá las
       POSTeamos una por una al endpoint respuesta_guardar (upsert por
       ejercicio_id en el backend). Nunca rompe el curso.

       cursoSlug: slug del curso (ej. 'outreach').
       items: [{ ejercicio_id, pregunta, respuesta, resultado }] */
    onAnswers: function (cursoSlug, items) {
      try {
        if (!Array.isArray(items) || !items.length) return;

        var ejecutivo = '';
        try { ejecutivo = localStorage.getItem('oc_central_user') || ''; } catch (e) {}
        if (!ejecutivo) return;                            // sin sesión → no reporta

        var titulo = COURSE_TITLES[String(cursoSlug)] || String(cursoSlug);

        items.forEach(function (it) {
          if (!it || !it.ejercicio_id) return;
          var payload = {
            action: 'respuesta_guardar',
            ejecutivo: ejecutivo,
            curso: titulo,
            ejercicio_id: String(it.ejercicio_id || ''),
            pregunta: String(it.pregunta || ''),
            respuesta: String(it.respuesta || ''),
            resultado: String(it.resultado || '')
          };
          fetch(ACADEMIA_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          }).catch(function () { /* silencio */ });
        });
      } catch (e) {
        // silencio total — el curso no debe romperse por un reporte fallido
      }
    }
  };
})();
