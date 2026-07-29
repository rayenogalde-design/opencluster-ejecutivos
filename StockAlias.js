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

// PENDIENTE DE CONFIRMAR — no se aplica todavia:
//   "Cortina De Fibra Óptica" -> BJ-LFIB3 (Fibra óptica Luminea 3 mt)
//   Motivo: la cortina de fibra optica es BJ-LCFIB en Qinera (un producto
//   completo: soporte de techo + fibras + fuente de luz). BJ-LFIB3 es
//   "Fibra optica Luminea 3 mt", que son las fibras sueltas. Si se cruzan,
//   vender una cortina descontaria un producto distinto y mas barato.
