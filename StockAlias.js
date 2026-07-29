// Equivalencias entre como se escribe un producto en las COTIZACIONES
// y el SKU real de la bodega. Confirmadas una por una por Rayen (29-jul-2026)
// con la pagina UnificarNombres.html.
// La clave es el nombre normalizado: minusculas, sin tildes ni espacios.
// Para agregar una nueva, genera de nuevo UnificarNombres.html y responde ahi.
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
  "sacopropioceptivo": "BJ-EV2208"
};

// Nombres que aparecen en cotizaciones y que Rayen confirmo que NO tienen
// equivalente en la bodega. Se listan aparte para distinguir "ya se reviso y no
// esta" de "todavia no se ha revisado": al descontar una venta, estas lineas
// deben avisar que no se pueden descontar, en vez de pasar en silencio.
window.STOCK_SIN_BODEGA = [
  // La cortina de fibra optica es BJ-LCFIB en Qinera: producto completo, con
  // soporte de techo, fibras y fuente de luz. En bodega solo hay BJ-LFIB3
  // ("Fibra optica Luminea 3 mt"), que son las fibras sueltas: otro producto.
  // Confirmado por Rayen el 29-jul-2026.
  "cortinadefibraoptica"
];
