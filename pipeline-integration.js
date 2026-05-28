/* ═══════════════════════════════════════════════════════════════════
   OpenCluster Academia — pipeline-integration.js
   ───────────────────────────────────────────────────────────────────
   Conecta el ejercicio final del curso de outreach con el pipeline real
   del ejecutivo logueado. SOLO LECTURA del CRM_API.

   - Identidad: localStorage 'oc_central_user' (sesión de la Central).
   - Matching tolerante contra `ejecutivo_asignado` del CRM (acepta primer
     nombre vs nombre completo, ignora acentos).
   - NUNCA expone email ni teléfono en la shape devuelta al curso.
   - Si no hay sesión o el fetch falla, devuelve [] y el curso entra a
     modo laboratorio (FALLBACK_CONTACT).
   - Orden: etapas frías primero, para que el contacto por defecto del
     curso tenga sentido para un primer correo.

   Define `window.OpenClusterPipeline.fetchContacts`. Se carga vía
   <script src="./pipeline-integration.js"> en Academia_Curso_Outreach.html
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var CRM_API = 'https://script.google.com/macros/s/AKfycbz3Vscxz-OlTHehsnEqqTD1qfql4xzstgWM81RG79P5IiLTkRvaYTU2sNoWV_QpceeowA/exec';

  // Etapas consideradas "frías" — buenas candidatas para un primer outreach por email.
  var COLD_ETAPAS = ['prospecto', 'nuevo', 'sin contactar', 'sin_contactar', 'lead', 'identificado', 'primer contacto'];

  function norm(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }
  function primerNombre(s) { return norm(s).split(/\s+/)[0]; }

  // Tolera "Rayen" (CRM) vs "Rayen Ogalde" (Central) y viceversa.
  function ejecutivoMatch(asignado, ejecutivoLogueado) {
    var a = norm(asignado), e = norm(ejecutivoLogueado);
    if (!a || !e) return false;
    if (a === e) return true;
    return primerNombre(a) === primerNombre(e);
  }

  function parseEtiquetas(raw) {
    if (Array.isArray(raw)) return raw.map(function (x) { return String(x).trim(); }).filter(Boolean);
    return String(raw || '')
      .split(/[,;|]/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function esEtapaFria(estado) {
    var e = norm(estado);
    if (!e) return true;             // sin etapa → tratar como cold (va arriba)
    for (var i = 0; i < COLD_ETAPAS.length; i++) {
      if (e === COLD_ETAPAS[i] || e.indexOf(COLD_ETAPAS[i]) >= 0) return true;
    }
    return false;
  }

  // Mapea el contacto del CRM a la shape que el curso espera.
  // OJO: NO incluir email/telefono — ni siquiera vacíos. Si están en el
  // objeto y el curso los ignora, igual viajaron por la red al cliente,
  // y eso ya viaja en la llamada al CRM_API. La diferencia es que el
  // objeto entregado al curso NO los lleva.
  function mapToCourseShape(c) {
    if (!c || !c.institucion) return null;   // institucion es el único requerido
    var etiquetas = parseEtiquetas(c.etiquetas);
    return {
      institucion: c.institucion,
      nombre: c.nombre || '',
      cargo: c.cargo || '',
      ciudad: c.ciudad || c.region || '',
      etapa: c.pipeline_estado || '',
      etiquetas: etiquetas,
      productoSugerido: etiquetas[0] || c.sub_categoria || '',
      nota: c.notas_publicas || c.nota_proxima || ''
    };
  }

  window.OpenClusterPipeline = {
    fetchContacts: async function () {
      try {
        var ejecutivo = '';
        try { ejecutivo = localStorage.getItem('oc_central_user') || ''; } catch (e) {}
        if (!ejecutivo) return [];

        var url = CRM_API + '?accion=crm_contactos&solicitante=' + encodeURIComponent(ejecutivo);
        var resp = await fetch(url);
        if (!resp.ok) return [];
        var data = await resp.json();
        if (!data || !data.ok || !Array.isArray(data.contactos)) return [];

        // Filtrar solo contactos asignados al ejecutivo logueado.
        var mios = data.contactos.filter(function (c) {
          return ejecutivoMatch(c.ejecutivo_asignado, ejecutivo);
        });

        // Mapear a shape del curso (descarta sin institucion, descarta email/tel).
        var mapped = mios.map(mapToCourseShape).filter(Boolean);

        // Cold-first: el curso usa el [0] como default, queremos uno apto
        // para primer correo. Mantiene orden relativo dentro de cada grupo.
        var cold = [], warm = [];
        for (var i = 0; i < mapped.length; i++) {
          (esEtapaFria(mapped[i].etapa) ? cold : warm).push(mapped[i]);
        }
        return cold.concat(warm);
      } catch (e) {
        return [];   // silencioso → curso cae a modo laboratorio
      }
    }
  };
})();
