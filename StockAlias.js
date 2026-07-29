// Equivalencias entre como se escribe un producto en las COTIZACIONES
// y el SKU real de la bodega. Confirmadas con Rayen (29-jul-2026) usando
// la pagina UnificarNombres.html, mas las que se pudieron confirmar POR CODIGO.
// La clave es el nombre normalizado: minusculas, sin tildes ni espacios.
window.STOCK_ALIAS_SKU = {
  "linealedlumineaparatecho": "BJ-LLLT",
  "linealedlumineaparatecho5metros": "BJ-LLLT",
  "linealedparatecho": "BJ-LLLT",
  "linealedlumineaparatecho5mts": "BJ-LLLT",
  "cubosensorial": "BJ-EMSC",
  "pufftransformablevibracustico": "BJ-EMPT-V",
  "piscinavibracusticaluminea": "BJ-LPIS-V",
  "cojinvibracustico": "BJ-EMCV",
  "burbujasshx": "MP-EX46-1",
  "difusoraromateria": "BJ-EDA",
  "setdiscostactilespiesymanos": "BJ-E16807",
  "conjuntodediscostactilesparapiesymanos": "BJ-E16807",
  "pelotadeterapiadediametro55cm": "BJ-51091000",
  "kitdeestimulacionsensorial": "BJ-KMAS",
  "sacopropioceptivo": "BJ-EV2208",
  "kitdematerialuv": "BJ-KUV",
  "pelotacacahuete": "BJ-43700100",
  "tubodeburbujasluminea": "BJ-LTUB",
  "amplificadorvibracustico": "BJ-EMAVIBX"
};

// Confirmados por CODIGO, sin criterio manual (mismo SKU, distinto nombre):
//   "Kit de Material UV" -> BJ-KUV — en bodega figura como "Bolsa material Ultravioleta", mismo SKU
//   "Pelota cacahuete" -> BJ-43700100 — es el nombre de Qinera del Mani terapeutico, mismo SKU
//   "Tubo de Burbujas Luminea" -> BJ-LTUB — en bodega figura como "Tubo de burbujas pequeno", mismo SKU
//   "Amplificador Vibracustico" -> BJ-EMAVIBX — error de tipeo de "vibroacustico"
//   "Amplificador Vibracústico" -> BJ-EMAVIBX — error de tipeo de "vibroacustico"

// Nombres que aparecen en cotizaciones y que NO tienen equivalente en bodega.
// Se listan aparte para distinguir "ya se reviso y no esta" de "sin revisar":
// al descontar una venta, estas lineas deben AVISAR, no pasar en silencio.
window.STOCK_SIN_BODEGA = [
  "acolchadopared",
  "alfombraluminea",
  "allinonehpproone440238i71270016gbddr41tbssd",
  "cortinadefibraoptica",
  "fireballshx",
  "liquidoparapompasdejabon1l",
  "looktolearn1licenciaelectronica",
  "munequerasytobilleras1kg",
  "notebookchuwiaubookpro14i51250p16gbramddr51tbssd",
  "pesoparahombroslolalaoruga1",
  "planetaluminea",
  "serviciointegraldeimplementacionyhabilitaciontecnica",
  "softwaresensorygurueyefx2licenciadigital",
  "soportedepierehadapt",
  "tablascooter",
  "tobiidynovoxi16"
];

// Corresponden a: la cortina de fibra optica (BJ-LCFIB, distinta de la fibra
// suelta BJ-LFIB3 — confirmado por Rayen), equipos de informatica, licencias de
// software, productos de la linea de control con la mirada, servicios,
// consumibles y variantes de otro tamano. Ninguno esta entre los 64 de bodega.
