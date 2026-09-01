// Equivalencias entre como se escribe un producto en las COTIZACIONES
// y el SKU real de la bodega. Confirmadas con Rayen (29-jul-2026) usando
// la pagina UnificarNombres.html, mas las que se pudieron confirmar POR CODIGO.
// La clave es el nombre normalizado: minusculas, sin tildes ni espacios.
window.STOCK_ALIAS_SKU = {
  "linealedlumineaparatecho": "BJ-LLLT",
  // El nombre con que Qinera lo lista en su tarifa. Rayen quiere que en pantalla diga siempre
  // "Línea LED Luminea Para Techo 5 Metros", asi que este alias existe SOLO para el cruce
  // (cotizaciones ya hechas y la tarifa) y esta en STOCK_ALIAS_OCULTOS para no mostrarse.
  "linealedde5mluminea": "BJ-LLLT",
  "linealedluminea": "BJ-LLLT",
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
  "rinconluminea": "BJ-LRIN23",
  "kitdeboladeespejosmediana": "BJ-EKBE300",
  "kitdeboladeespejomediana": "BJ-EKBE300",
  "kitdeboladeespejo": "BJ-EKBE300",
  "kitdebolasdeespejosmediana": "BJ-EKBE300",
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
// Textos que aparecen en el campo "productos" de una cotizacion pero que NO son
// productos: servicios, instalaciones, fletes. Se ignoran al leer la cotizacion, asi
// que no cuentan como faltantes ni salen como producto en el informe a Mario.
// Decision de Rayen (2026-07-29): el servicio de implementacion no tiene nada que
// hacer en el stock.
window.STOCK_NO_PRODUCTO = [
  "serviciointegraldeimplementacionyhabilitaciontecnica",
  "servicionintegraldeimplementacionyhabilitaciontecnica",
  "serviciodeimplementacion",
  "serviciodeinstalacion",
  "instalacion",
  "flete",
  "transporte",
  "despacho"
];

window.STOCK_SIN_BODEGA = [
  "acolchadopared",
  "alfombraluminea",
  "allinonehpproone440238i71270016gbddr41tbssd",
  "basecuadradaparatubodeburbujas",
  "basecuadradaparatubodeburbujascentrado",
  "columpiocuddle",
  "dispositivodeseguimientoocular tobiipceye5",
  "dispositivodeseguimientooculartobiipceye5",
  "softwaretdsnaplicenciadigital",
  "cortinadefibraoptica",
  "fireballshx",
  "focodeluzshx",
  "liquidoparapompasdejabon1l",
  "looktolearn1licenciaelectronica",
  "munequerasytobilleras1kg",
  "notebookchuwiaubookpro14i51250p16gbramddr51tbssd",
  "pesoparahombroslolalaoruga1",
  "planetaluminea",
  "sensorygoluminea",
  "sensorygolumineaplus",
  "softwaresensorygurueyefx2licenciadigital",
  "soportedepierehadapt",
  "tablascooter",
  "tobiidynovoxi16"
];

// Corresponden a: la cortina de fibra optica (BJ-LCFIB, distinta de la fibra
// suelta BJ-LFIB3 — confirmado por Rayen), equipos de informatica, licencias de
// software, productos de la linea de control con la mirada, servicios,
// consumibles y variantes de otro tamano. Ninguno esta entre los 64 de bodega.
//
// Confirmados por Rayen el 29-jul-2026:
//   - Sensory Go: son TRES productos distintos (Luminea, Luminea Plus y SHX).
//     En bodega solo esta el SHX (BJ-SGSX), asi que Luminea y Luminea Plus
//     no se pueden descontar de bodega.
//   - "Foco de luz SHX" NO es el "Foco de luz UV LED" (BJ-EIFUVL): son productos
//     distintos y con precios distintos.
//
// Confirmados por Rayen el 29-jul-2026 (segunda tanda):
//   - "Rincon Luminea" SIEMPRE es el que lleva tablet -> BJ-LRIN23.
//   - "Kit de bolas de espejos" es el MEDIANO -> BJ-EKBE300.
//   - "Columpio cuddle" y "Base cuadrada para tubo de burbujas": no los tienen,
//     van a la lista de sin bodega.

// Alias que sirven para CRUZAR pero que no se muestran en pantalla como "tambien se llama".
// Rayen 2026-08-31: "no quiero el otro nombre en el cotizador".
window.STOCK_ALIAS_OCULTOS = ["linealedde5mluminea", "linealedluminea"];

// Productos que en pantalla llevan SOLO su nombre: nada de "también se llama".
// Rayen 2026-08-31 los nombro uno por uno y no quiere ver el nombre viejo en el cotizador.
// Son las CLAVES normalizadas (lo que devuelve _smProdNorm + alias), no los SKU.
window.STOCK_SIN_OTROS_NOMBRES = [
  "linea led luminea para techo",   // Línea LED Luminea Para Techo 5 Metros
  "shx compact",                    // Sistema SHX Compact (BJ-EX04, el que hay en bodega)
  "shx compact con ipad",           // Sistema SHX Compact con iPad (BJ-EX04-I, el de la tarifa)
  "shx compact sin proyeccion"      // Sistema SHX Compact sin proyección (BJ-EX04-SP)
];
