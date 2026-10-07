// SALAS PROPUESTAS POR HERNAN — 6 listas de productos con su ORDEN DE IMPORTANCIA.
// Rayen (01-sep-2026): "esto es algo que Hernan me preparo para yo poder saber que elementos
// tengo que elegir para crear una lista. El numero te dice el orden de importancia del producto:
// si esta el 1, es el primero que debe estar; el dos, el segundo, y asi."
//
// El orden IMPORTA y por eso hay tres SHX con los mismos productos: "el orden va a implicar que
// la gente, al sacar producto, lo saca de abajo hacia arriba y se va a quedar con productos
// diferentes". Lo mismo con Manual Luminea A y B.
//
// DOS CORRECCIONES de Rayen sobre lo que mando Hernan:
//  · Manual Luminea A venia con el sistema SHX de la prioridad 12 en adelante (SHX Compact,
//    Proximity, Ventilador, Kit Voz...). "A el se le olvido quitarle todo lo que era el sistema
//    SHX": se corto en la 11.
//  · El rincon: Hernan puso BJ-LRIN (sin tablet). "Siempre va a ser el CON TABLET el que va a
//    cotizacion": los seis usan BJ-LRIN23.
//
// o = orden de importancia. El nombre y el precio NO se guardan aca: salen de SALAS_CATALOGO,
// asi el dia que cambie un precio estas salas quedan al dia solas.
//
// Rayen (07-oct-2026): toda sala con SHX Compact lleva el ARMARIO (BJ-EX4-C). Va justo despues
// del Compact (orden 2) para que nunca se separen al recortar la sala desde abajo.
window.SALAS_HERNAN = [{"id":"shx1","n":"SHX Equilibrio","tipo":"SHX","p":[{"sku":"BJ-EX04","o":1},{"sku":"BJ-EX4-C","o":2},{"sku":"BJ-LRIN23","o":3},{"sku":"BJ-EEGR","o":4},{"sku":"BJ-EMPT-V","o":5},{"sku":"BJ-LPIS-V","o":6},{"sku":"BJ-EMAVIBX","o":7},{"sku":"BJ-LLLT","o":8},{"sku":"BJ-EX47","o":9},{"sku":"BJ-EDA","o":10},{"sku":"BJ-EKIA","o":11},{"sku":"BJ-EXPRX","o":12},{"sku":"BJ-EIFUVLX","o":13},{"sku":"BJ-KUV","o":14},{"sku":"BJ-EX41","o":15},{"sku":"BJ-LCTRL","o":16},{"sku":"BJ-EXKV","o":17},{"sku":"BJ-EMCV","o":18},{"sku":"BJ-EMSC","o":19},{"sku":"BJ-LCTRL1","o":20}]},{"id":"shx2","n":"SHX Inmersión","tipo":"SHX","p":[{"sku":"BJ-EX04","o":1},{"sku":"BJ-EX4-C","o":2},{"sku":"BJ-LPIS-V","o":3},{"sku":"BJ-LRIN23","o":4},{"sku":"BJ-EEGR","o":5},{"sku":"BJ-EXPRX","o":6},{"sku":"BJ-LLLT","o":7},{"sku":"BJ-EX47","o":8},{"sku":"BJ-EDA","o":9},{"sku":"BJ-EKIA","o":10},{"sku":"BJ-EMCV","o":11},{"sku":"BJ-EMAVIBX","o":12},{"sku":"BJ-LCTRL","o":13},{"sku":"BJ-EIFUVLX","o":14},{"sku":"BJ-KUV","o":15},{"sku":"BJ-EXKV","o":16},{"sku":"BJ-EX41","o":17},{"sku":"BJ-EMPT-V","o":18},{"sku":"BJ-EMSC","o":19},{"sku":"BJ-LCTRL1","o":20}]},{"id":"shx3","n":"SHX Postural","tipo":"SHX","p":[{"sku":"BJ-EX04","o":1},{"sku":"BJ-EX4-C","o":2},{"sku":"BJ-EMPT-V","o":3},{"sku":"BJ-LRIN23","o":4},{"sku":"BJ-EEGR","o":5},{"sku":"BJ-LLLT","o":6},{"sku":"BJ-EX47","o":7},{"sku":"BJ-EDA","o":8},{"sku":"BJ-EKIA","o":9},{"sku":"BJ-EIFUVLX","o":10},{"sku":"BJ-KUV","o":11},{"sku":"BJ-EXPRX","o":12},{"sku":"BJ-LCTRL","o":13},{"sku":"BJ-EXKV","o":14},{"sku":"BJ-EX41","o":15},{"sku":"BJ-LPIS-V","o":16},{"sku":"BJ-EMAVIBX","o":17},{"sku":"BJ-EMCV","o":18},{"sku":"BJ-EMSC","o":19},{"sku":"BJ-LCTRL1","o":20}]},{"id":"man1","n":"Manual Luminea A","tipo":"Manual","p":[{"sku":"BJ-LRIN23","o":1},{"sku":"BJ-EEGR","o":2},{"sku":"BJ-EMPT-V","o":3},{"sku":"BJ-KVSL","o":4},{"sku":"BJ-LLLT","o":5},{"sku":"BJ-EX47","o":6},{"sku":"BJ-EDA","o":7},{"sku":"BJ-EKIA","o":8},{"sku":"BJ-EIFUVLX","o":9},{"sku":"BJ-KUV","o":10},{"sku":"BJ-LCTRL","o":11}]},{"id":"man2","n":"Manual Luminea B","tipo":"Manual","p":[{"sku":"BJ-LRIN23","o":1},{"sku":"BJ-EEGR","o":2},{"sku":"BJ-LLLT","o":3},{"sku":"BJ-EMPT-V","o":4},{"sku":"BJ-KVSL","o":5},{"sku":"BJ-EX47","o":6},{"sku":"BJ-EDA","o":7},{"sku":"BJ-EKIA","o":8},{"sku":"BJ-EIFUVLX","o":9},{"sku":"BJ-KUV","o":10},{"sku":"BJ-LCTRL","o":11}]},{"id":"man3","n":"Manual Vibroacústica","tipo":"Manual","p":[{"sku":"BJ-EMPT-V","o":1},{"sku":"BJ-KVSL","o":2},{"sku":"BJ-EX47","o":3},{"sku":"BJ-LLLT","o":4},{"sku":"BJ-EDA","o":5},{"sku":"BJ-EKIA","o":6},{"sku":"BJ-LRIN23","o":7},{"sku":"BJ-EEGR","o":8},{"sku":"BJ-EIFUVLX","o":9},{"sku":"BJ-KUV","o":10},{"sku":"BJ-LCTRL","o":11},{"sku":"BJ-EMCV","o":12}]}];
