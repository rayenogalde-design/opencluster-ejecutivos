// ════════════════════════════════════════════════════════════════════════════
// ESPECIFICACIONES TÉCNICAS PARA LICITACIÓN — texto OFICIAL, palabra por palabra.
//
// REGLA DURA (Rayen, 2026-08-03):
//   Lo que va en el documento de una licitación es EXACTAMENTE lo que entrega el
//   ejecutivo responsable. No se mezcla, no se completa, no se corrige, no se
//   cambia ni una letra. Si un producto no está acá, NO sale en el documento con
//   datos de otra fuente: sale listado como pendiente.
//
//   Las specs de la web de Qinera (LicitacionesData.js) NO se usan para armar
//   este documento. Sirven SOLO como control: si el texto oficial contradice a
//   Qinera en algún número, se avisa para que una persona lo revise. Nunca se
//   corrige solo.
//
//   Motivo: el documento oficial trae certificaciones (CE, RoHS, directivas
//   2014/30/UE y 2014/35/UE, normas EN/UNE-EN) que la web de Qinera no publica.
//   Rellenar con Qinera dejaría un documento incompleto en una licitación.
//
// CÓMO SE CARGA
//   Cada entrada es el texto tal cual lo entregó el ejecutivo. Se respetan sus
//   saltos de línea. 'fuente' dice quién lo entregó y cuándo, para poder auditar.
//
//   "BJ-EX04": {
//     nombre: "Sistema centralizado de control de sala multisensorial",
//     texto: "Descripción: ...\nFuncionalidad: ...\nCertificación CE ...",
//     fuente: "Nombre del ejecutivo · dd-mm-aaaa · archivo de origen"
//   }
// ════════════════════════════════════════════════════════════════════════════
window.SPECS_LICITACION = {
  // (vacío por ahora — se llena con lo que entregue el ejecutivo, sin editarlo)
};

// Nombres que la cotización escribe distinto al SKU. Solo para ENCONTRAR la ficha,
// nunca para cambiar su contenido.
window.SPECS_LICITACION_ALIAS = {
  // "nombre normalizado de la cotizacion": "SKU"
};
