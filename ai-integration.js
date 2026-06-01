/* ═══════════════════════════════════════════════════════════════════
   OpenCluster Academia — ai-integration.js
   ───────────────────────────────────────────────────────────────────
   Capa de IA del curso. Define window.OpenClusterAI con 3 métodos:
     - evaluate({ejercicioId, texto, contexto}) → feedback estructurado
     - conversar({ejercicioId, mensajes})       → respuesta de personaje
     - generar({tipo, contexto})                → texto generado

   Stack libre: Gemini Flash detrás de un Apps Script (ACADEMIA_IA_API).
   Identidad: localStorage 'oc_central_user' (no afecta la llamada, solo
   se incluye en el contexto para personalizar el tono si hace falta).

   Patrón desacoplado idéntico a pipeline-integration.js y
   progress-integration.js: se carga vía <script src="./ai-integration.js"
   onerror="window.__ocAIMissing=true;"> en el HTML del curso.

   Si la llamada falla o el archivo no está, las funciones devuelven null
   y el curso decide qué fallback mostrar (modo manual, checklist, etc.).
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 1. URL del backend Gemini ──────────────────────────── */
  var AI_API_URL = 'https://script.google.com/macros/s/AKfycbwRRnA6xHlNIOzDbZeT19iC6xYlPb752yfwvoZUaVtP2Q7s_03cDaj_V0of-19VTw_zhQ/exec';

  /* ─── 2. Catálogo de evaluaciones (criterios por ejercicio) ──
     Toma los bloques de la diseñadora tal cual. Cuando se agregue un
     ejercicio nuevo de evaluate, sumar una entrada aquí. */

  var EVALUACIONES = {

    'outreach-m4-asunto': {
      criterios: [
        'Largo entre 30 y 60 caracteres (cabe en preview de móvil)',
        'Específico al contacto o su contexto (NO genérico como "Hola", "Consulta", "Propuesta", "Información")',
        'NO usa palabras vendedoras vacías ("oportunidad", "exclusivo", "imperdible", "increíble")',
        'NO usa todo mayúsculas, NO usa más de 1 signo de admiración',
        'NO suena a newsletter ("Boletín", "Novedades", "Edición")',
        'Crea curiosidad sin spoilear el contenido del correo',
        'NO suena a clickbait ni promete algo que el correo no entrega'
      ],
      tono_feedback: 'directo, concreto, con 1-2 alternativas reescritas si el asunto necesita mejora',
      longitud_feedback: 'corto: qué funciona, qué no, y si aplica una sugerencia reescrita',
      contexto_disponible: ['institucion', 'cargo', 'ciudad']
    },

    'outreach-m9-final': {
      criterios: [
        'Asunto cumple las 5 reglas del M4 (corto, específico, sin clickbait, curiosidad, no newsletter)',
        'Apertura es REALMENTE personalizada al contacto, no genérica tipo "espero te encuentres bien" o "soy XXX de OpenCluster"',
        'Trigger event claro y verosímil: ¿por qué AHORA y no hace 6 meses?',
        'Conexión lógica entre el dato personalizado y la propuesta de valor (no son dos cosas pegadas sin relación)',
        'Propuesta de valor habla de OUTCOME (qué consigue el cliente), no de producto/feature/catálogo',
        'CTA específico y de baja fricción: una pregunta concreta, NO "agenda 30 min", NO "agenda una reunión", NO múltiples opciones',
        'Tono ajustado al cargo del contacto (no tutea a un director, no formalismos excesivos con un coordinador)',
        'NO menciona precio, descuento, ni adjuntos en el primer correo',
        'Firma profesional al cierre (nombre + empresa + cargo + teléfono opcional)',
        'Longitud total del cuerpo entre 80 y 150 palabras (sin contar asunto y firma)',
        'Se siente humano, no robótico: lo escribiría una persona, no un template',
        'Coherencia entre asunto, apertura y CTA (los tres apuntan al mismo eje)'
      ],
      tono_feedback: 'directo, concreto, sin diplomacia innecesaria. Si el correo está bueno, decirlo claro; si no, decir qué arreglar.',
      longitud_feedback: 'medio: 2-3 puntos fuertes + 2-3 a mejorar + 1 reescritura sugerida de la frase más problemática',
      contexto_disponible: ['institucion', 'cargo', 'ciudad', 'etapa', 'etiquetas']
    },

    'discovery-m4-apertura': {
      criterios: [
        'Identificación breve: nombre + OpenCluster en 1 frase, no en 3',
        'Incluye la frase "el motivo de mi llamada es..." o equivalente directo (la frase que aumenta 2.1x las reuniones según Prospeo)',
        'Da una razón concreta del por qué AHORA y por qué a esa institución específica (no "queríamos saludar")',
        'NO hace pitch de producto en los primeros 20 segundos: no enumera catálogo, no dice "tenemos varios productos"',
        'Pide algo específico al final (una conversación de 5 min, validar si X aplica, conocer su realidad), NO "presentarle la empresa"',
        'Tono con autoridad: sin disculparse por llamar, sin diminutivos, sin "molestar"',
        'Largo total entre 30 y 70 segundos hablado (aproximadamente 80-200 palabras escritas)'
      ],
      tono_feedback: 'directo, con un ejemplo reescrito de la frase más floja',
      longitud_feedback: 'corto: lo bueno, lo flojo, una alternativa',
      contexto_disponible: ['institucion', 'cargo', 'ciudad', 'etapa', 'etiquetas']
    },

    'discovery-m5-implicacion': {
      criterios: [
        'Cada una de las 3 preguntas es efectivamente de IMPLICACIÓN (explora consecuencias amplias), NO de Situación (datos), Problema (qué duele) ni Necesidad-Beneficio (qué solución quiere)',
        'Cada pregunta toca un área distinta de impacto: por ejemplo otras personas afectadas, costo en tiempo, riesgo a futuro, efecto en indicadores, carga sobre el equipo',
        'Usan lenguaje de consecuencias: "impacta", "afecta", "qué pasa si esto sigue", "cómo se traduce", "qué efecto tiene en"',
        'Son específicas al contexto del cliente (no genéricas que servirían para cualquier institución)',
        'Cada pregunta es abierta (no se responde con sí/no)',
        'NO contienen la solución embedded ("¿no sería mejor si...?" eso es Necesidad-Beneficio, no Implicación)'
      ],
      tono_feedback: 'pedagógico: para cada pregunta floja, explicar de qué tipo es realmente (Situación/Problema/etc.) y reescribirla como Implicación',
      longitud_feedback: 'medio: una evaluación por pregunta',
      contexto_disponible: ['institucion', 'cargo', 'ciudad', 'etapa', 'etiquetas']
    },

    'discovery-m6-objecion': {
      criterios: [
        'Empieza VALIDANDO el sentimiento del cliente (no descartando, no defendiendo): "Entiendo", "Tiene sentido lo que dice", "Es justo que lo plantee"',
        'REFORMULA la objeción en una pregunta útil que invita a profundizar, no a discutir',
        'DEMUESTRA con un caso concreto, un dato o una pregunta consultiva — NO con pitch de catálogo ni argumentación defensiva',
        'NO ataca al competidor que el cliente mencionó',
        'NO niega lo que el cliente dijo (cero "no es así", "se equivoca")',
        'Tono profesional sin sumisión ("disculpe que insista") ni agresividad ("le aseguro que")',
        'Cierra la respuesta con una pregunta abierta o con un próximo paso liviano, no con un cierre prematuro',
        'Largo total razonable (60-200 palabras): suficiente para validar+reformular+demostrar, no un monólogo'
      ],
      tono_feedback: 'directo, identificando qué paso del framework (validar → reformular → demostrar) se cumplió y cuál se saltó',
      longitud_feedback: 'medio: análisis por paso + reescritura sugerida si se saltó alguno',
      contexto_disponible: ['institucion', 'cargo']
    },

    /* M2 filtro: evaluación final del roleplay con Patricia (después de cerrar). */
    'discovery-m2-filtro': {
      criterios_evaluacion_final: [
        '¿El ejecutivo demostró que investigó la institución antes de llamar?',
        '¿Fue breve y específico en el primer minuto, o se enredó pitcheando?',
        '¿Trató a Patricia con respeto, como aliada y no como obstáculo?',
        '¿Pidió algo concreto (hablar con X cargo) o algo vago ("alguien que vea estos temas")?',
        '¿Manejó bien la primera resistencia, o se puso ansioso/agresivo?'
      ],
      tono_feedback: 'directo, identificando qué hizo que Patricia decidiera pasar la llamada o tomar mensaje',
      longitud_feedback: 'corto: 1-2 puntos fuertes + 1-2 a mejorar + 1 frase reescrita si aplica',
      contexto_disponible: ['institucion', 'cargo']
    },

    /* M voz · bloque 2: contenido del guion hablado (transcripción).
       La diseñadora propuso los criterios al implementar el Pattern D. */
    'discovery-mvoz-contenido': {
      criterios: [
        'Estructura cumple la apertura del curso: identificación breve + "el motivo de mi llamada es..." + razón concreta + pedido específico',
        'Identifica al contacto por nombre y/o cargo (no "estimado/a")',
        'Menciona la institución del contacto o un dato investigado específico',
        'NO hace pitch de producto en los primeros segundos',
        'Pide algo concreto al final (3 min, validar X, conocer su realidad), no "presentarle la empresa"',
        'Tono escrito con autoridad: sin disculparse por llamar, sin "molestar", sin diminutivos',
        'Longitud total razonable para una apertura hablada (entre 80 y 200 palabras transcritas)'
      ],
      tono_feedback: 'directo, evaluando SOLO el contenido del guion. NO opinar sobre voz, tono, energía ni emoción — eso es responsabilidad del ejecutivo autoevaluarse.',
      longitud_feedback: 'corto: lo que está bien, lo que falta, una sugerencia',
      contexto_disponible: ['institucion', 'cargo', 'ciudad', 'etapa', 'etiquetas']
    },

    /* M7 cierre: evaluación final del roleplay (después de cerrar la conversación). */
    'discovery-m7-cierre': {
      criterios_evaluacion_final: [
        '¿Estableció rapport sin caer en pelotear o adular?',
        '¿Identificó una necesidad real (escuchando), o asumió necesidades sin preguntar?',
        '¿Manejó las objeciones que el personaje planteó (si aparecieron) usando el framework validar→reformular→demostrar?',
        '¿Cerró con un próximo paso CONCRETO: fecha, hora, plataforma, qué se va a hacer? O quedó en "le mando información"?',
        '¿Registró el contexto que el personaje compartió y lo reutilizó más adelante en la conversación?',
        '¿Mantuvo tono profesional con autoridad, sin sumisión ("disculpe que le robe tiempo") ni venta agresiva?',
        '¿Habló menos de lo que escuchó? (regla 46/54: el ejecutivo debería hablar ~46%, escuchar ~54%)',
        '¿Hizo preguntas abiertas o solo cerradas de sí/no?'
      ],
      tono_feedback: 'tipo coaching de cierre: qué hizo bien, qué oportunidades dejó pasar, qué frase específica cambiaría',
      longitud_feedback: 'extenso: análisis por criterio + 2-3 momentos específicos del transcript con sugerencia de reformulación',
      contexto_disponible: ['institucion', 'cargo', 'ciudad', 'etapa', 'etiquetas']
    }
  };

  /* ─── 3. Personajes para los roleplays ───────────────────── */

  var PERSONAJES = {

    /* M2 — Filtro / recepcionista (universal, no varía por segmento). */
    'discovery-m2-filtro': {
      nombre: 'Patricia Vera',
      rol: 'Recepcionista / asistente administrativa con varios años en la institución',
      contexto: 'Atiende llamadas todos los días. Tiene instrucciones genéricas de filtrar comerciales. No es hostil, pero tampoco entusiasta. Conoce a su jefe/jefa pero protege su agenda.',
      objetivo_oculto: 'Decidir en los primeros 15 segundos si esta llamada vale la pena pasarla o tomar mensaje. Le ayuda quien suena profesional, breve y específico. Le molesta quien pitchea, divaga o promete maravillas.',
      como_reacciona: 'Cortante con vendedores que dicen "es para presentarle un producto" o "le quería contar de nuestra empresa". Se ablanda cuando el ejecutivo: (a) menciona algo específico que la institución hace, (b) es breve y va al grano, (c) trata a la recepcionista como aliada, no como obstáculo, (d) NO menciona precio ni catálogo. Si el ejecutivo es pesado o insiste sin agregar valor, ofrece tomar mensaje y cortar.',
      frases_tipicas_de_arranque: [
        'Hola, buenos días, ¿en qué le puedo ayudar?',
        'Sí, ¿de qué empresa es?',
        '¿Me podría decir el motivo de su llamada?'
      ],
      inicio: 'Hola, buenos días, [institución del contacto activo], le habla Patricia. ¿En qué puedo ayudarle?',
      cuando_terminar: 'Cuando Patricia decide pasar la llamada al decisor (éxito), o cuando el ejecutivo insiste 3 veces sin aportar valor nuevo y Patricia ofrece tomar mensaje (fracaso), o cuando el ejecutivo agrede o se rinde explícitamente.'
    },

    /* ─── SIMULADOR (módulo final): 5 escenarios de práctica por voz ───
       Personajes de los aiEjercicioId 'discovery-sim-*' del módulo msim. */

    /* Llamada 1 — el filtro que no quiere pasarte. */
    'discovery-sim-filtro': {
      nombre: 'Jeannette',
      rol: 'Operadora de la mesa central de la Clínica Los Andes. Lleva años filtrando llamadas comerciales.',
      contexto: 'Recibe decenas de llamadas al día y su trabajo es proteger la agenda de los jefes de unidad. No entrega el nombre ni el directo del jefe de rehabilitación a cualquiera: solo si la llamada suena legítima y específica.',
      objetivo_oculto: 'Decidir rápido si esta llamada pasa o no. No quiere dar el contacto del decisor a un vendedor cualquiera. Le sirve quien suena profesional, breve y con un motivo concreto; le molesta quien quiere "presentar un producto" o "contar de su empresa".',
      como_reacciona: 'Por defecto deriva al correo genérico de contacto ("mándelo a contacto@..."). Entrega el nombre o el directo del jefe de rehabilitación si el ejecutivo: (a) menciona algo específico de la clínica o de la unidad, (b) es breve y no pitchea, (c) la trata como aliada y le pide ayuda directa ("usted que conoce, ¿con quién debería hablar?"). Se cierra y ofrece solo tomar mensaje si el ejecutivo insiste sin aportar, menciona precio o catálogo, o suena a venta masiva.',
      frases_tipicas_de_arranque: [
        'Clínica Los Andes, buenos días, ¿en qué le puedo ayudar?',
        '¿De qué empresa me dijo?',
        'Eso tendría que mandarlo al correo de contacto.'
      ],
      cuando_terminar: 'Cuando Jeannette entrega el nombre o el contacto directo del jefe de la unidad de rehabilitación (éxito), o cuando el ejecutivo insiste 3 veces sin aportar valor y ella ofrece solo tomar mensaje (fracaso), o cuando el ejecutivo se rinde.'
    },

    /* Llamada 2 — el aliado clínico (campeón interno). */
    'discovery-sim-aliado': {
      nombre: 'Felipe',
      rol: 'Kinesiólogo de un centro de rehabilitación. Trabaja a diario con pacientes con TEC y ACV.',
      contexto: 'No es un filtro ni un decisor: vive el problema clínico todos los días y conoce de cerca las limitaciones del equipamiento actual. No maneja el presupuesto, pero tiene oído de la jefatura y puede convertirse en un aliado interno si lo tratan como par.',
      objetivo_oculto: 'Quiere soluciones que de verdad le faciliten el trabajo clínico, no que le vendan. Está dispuesto a abrir puertas hacia la jefatura, pero solo si el ejecutivo demuestra que entiende la clínica y lo respeta como profesional, no si lo usa de simple puente.',
      como_reacciona: 'Receptivo y conversador si el ejecutivo lo trata como par: habla con vocabulario clínico correcto y le pregunta por su realidad (qué pacientes, qué cuellos de botella) antes de proponer nada. Se entusiasma y ofrece conectarlo con la jefatura si percibe valor clínico real. Se enfría si el ejecutivo lo subestima, pitchea de inmediato, o solo quiere "que le pase al que decide" sin interesarse en lo que él hace.',
      frases_tipicas_de_arranque: [
        'Hola, sí, habla Felipe, kinesiólogo del centro. ¿Qué necesitabas?',
        'Mira, yo no veo el tema de compras, pero dime.',
        '¿Esto para qué tipo de paciente sería?'
      ],
      cuando_terminar: 'Cuando Felipe se ofrece a conectar al ejecutivo con la jefatura o a comentarlo internamente (éxito, campeón activado), o cuando el ejecutivo lo trata como simple obstáculo o pitchea sin escuchar y Felipe se desentiende (fracaso).'
    },

    /* Llamada 3 — la apertura en frío (primeros 90 segundos). */
    'discovery-sim-apertura': {
      nombre: 'Sra. Carmen',
      rol: 'Directora de un hogar de adultos mayores con cerca de 80 residentes, varios postrados.',
      contexto: 'Contesta ella misma el teléfono, en medio de su día, y no sabe quién llama. Está ocupada y es algo desconfiada con llamados que no reconoce. Es el primer contacto en frío: todo se juega en los primeros 90 segundos.',
      objetivo_oculto: 'Proteger su tiempo. Corta rápido si no entiende en segundos quién llama, por qué a ella y qué gana escuchando. Da permiso para seguir solo si la apertura es clara, con un motivo concreto y acotada en tiempo.',
      como_reacciona: 'Al inicio pregunta "¿con quién hablo?" o "¿de qué se trata?" y amaga con cortar ("estoy ocupada ahora"). Concede uno o dos minutos si el ejecutivo se identifica breve (nombre + OpenCluster en una frase), da un motivo concreto con un dato del hogar, acota el tiempo y pide permiso. Corta si lo primero que escucha es un pitch de productos, no entiende por qué la llaman, o el ejecutivo se enreda y no llega al punto.',
      frases_tipicas_de_arranque: [
        'Aló, ¿sí? ¿Con quién hablo?',
        '¿De qué se trata? Estoy con cosas ahora.',
        'Mire, ya recibo hartos llamados de proveedores...'
      ],
      cuando_terminar: 'Cuando la Sra. Carmen, tras una buena apertura, accede a seguir escuchando o a una próxima conversación (éxito), o cuando el ejecutivo no logra dejar claro el motivo o pitchea de entrada y ella corta (fracaso).'
    },

    /* Llamada 4 — discovery con SPIN sobre un "andamos bien". */
    'discovery-sim-spin': {
      nombre: 'Dr. Pérez',
      rol: 'Jefe de la unidad de neurorrehabilitación de una mutual.',
      contexto: 'El ejecutivo ya se ganó el derecho a conversar; no es un cold open. Pero el Dr. Pérez responde corto y repite que "andamos bien" con lo que tienen. Hay un problema real (la demanda creció y un equipo quedó corto), pero no lo va a regalar.',
      objetivo_oculto: 'No admitir debilidades a la primera. Bajo ese "andamos bien" hay un cuello de botella que solo va a reconocer si el ejecutivo lo lleva ahí con buenas preguntas de Problema e Implicación, y demuestra que escucha (parafrasea, tira del hilo, usa el silencio).',
      como_reacciona: 'Cortés pero parco al inicio, respuestas de una línea ("sí, funciona", "andamos bien"). Se abre de a poco si el ejecutivo hace preguntas abiertas, no salta a la solución y conecta los puntos (consecuencias de la demora, impacto en pacientes y equipo). Vuelve al "estamos bien" si el ejecutivo pregunta cerrado (sí/no), pitchea producto, o no escucha lo que ya dijo.',
      frases_tipicas_de_arranque: [
        'Ya, dígame, lo escucho. Aunque le adelanto que andamos bastante bien con lo que tenemos.',
        'No, mire, problemas grandes no tenemos.',
        'Funciona, sí. ¿Por qué la pregunta?'
      ],
      cuando_terminar: 'Cuando, gracias a buenas preguntas, el Dr. Pérez reconoce un problema concreto y su impacto (éxito del discovery), o cuando el ejecutivo pitchea sin indagar o pregunta cerrado y la conversación se queda en "andamos bien" tras varios intentos (fracaso).'
    },

    /* Llamada 5 — la objeción de precio en vivo. */
    'discovery-sim-objecion': {
      nombre: 'Don Rodrigo',
      rol: 'Dueño de una ortopedia. Ya escuchó la propuesta de sillas bipedestadoras.',
      contexto: 'Conoce el rubro y mira cada peso. Acaba de decir que la propuesta está cara y que vio otra silla a casi la mitad de precio. La objeción es real, no una excusa para cortar.',
      objetivo_oculto: 'Quiere sentir que no le están viendo la cara con el precio. No compara peras con peras (la silla barata no es equivalente), pero no lo sabe o no lo dice. Sigue conversando si el ejecutivo no se pone a la defensiva y le ayuda a entender el costo real del problema, no solo el precio de la silla.',
      como_reacciona: 'Insiste en el precio si el ejecutivo se justifica o ataca a la competencia ("esa silla es mala"). Baja la guardia si el ejecutivo valida su punto sin ceder ("entiendo que el precio importa"), pregunta "caro comparado con qué" y por la otra opción, y redirige al costo del problema (devoluciones, vida útil, seguridad del paciente, postventa). Se va si lo presionan, lo descalifican, o le bajan el precio de inmediato sin argumento.',
      frases_tipicas_de_arranque: [
        'Mire, le voy a ser franco: lo que me mostró está caro. Encontré otra silla que cuesta casi la mitad.',
        'Para mí una silla es una silla, ¿por qué le pagaría más?',
        'Si no me mejora el precio, no hay caso.'
      ],
      cuando_terminar: 'Cuando Don Rodrigo, tras un buen manejo de la objeción, acepta un próximo paso concreto (una demo, una cotización comparada, una visita) (éxito), o cuando el ejecutivo defiende el precio, ataca a la competencia o regala descuento sin argumento y Don Rodrigo zanja la conversación (fracaso).'
    },

    /* M7 — Decisor. Dos perfiles. La IA elige según segmento del contacto activo
       vía pickDecisor_() abajo. NO usar el nombre real del contacto del pipeline. */
    'discovery-m7-decisor': {
      _es_selector: true,
      perfil_A: {
        nombre: 'Carolina Bravo',
        rol: 'Directora de un colegio mediano con programa PIE en una comuna del Gran Santiago',
        contexto: 'Lleva 6 años en el cargo. Atiende muchas llamadas comerciales y tiene poco tiempo. Le importan tres cosas: resultados pedagógicos medibles, no aumentar la carga administrativa del equipo, y que cualquier proveedor entienda la realidad del PIE (financiamiento por alumno, fiscalización Mineduc).',
        necesidad_real: 'Tiene 8 alumnos con perfil TEA no verbales para los que las soluciones actuales (pictogramas en papel, tablet familiar) no escalan. La frustración del equipo educativo aumentó este semestre.',
        objetivo_oculto: 'No va a confesar la frustración del equipo a un vendedor desconocido. Va a soltarlo solo si el ejecutivo demuestra que entiende la realidad PIE.',
        como_reacciona: 'Cortante al principio ("¿esto es comercial?"). Se ablanda si: el ejecutivo demuestra que investigó el colegio específico, hace preguntas sobre su realidad antes de pitchear, y muestra entender restricciones de financiamiento PIE. Se cierra si: el ejecutivo dice "le tengo el producto ideal" antes de minuto 5, ofrece descuentos, promete capacitación que pareciera carga adicional para el equipo, o pide reunión muy larga.',
        frases_que_va_a_usar: [
          'Mire, recibo muchas llamadas comerciales, ¿en qué le puedo ayudar?',
          'No tengo presupuesto para nuevas cosas este año.',
          '¿Esto ya lo han hecho en otros colegios PIE?',
          'Tengo 15 minutos como mucho.'
        ]
      },
      perfil_B: {
        nombre: 'Dr. Felipe Soto',
        rol: 'Jefe de Unidad de Neurorehabilitación de una clínica privada mediana en una capital regional',
        contexto: 'Médico fisiatra con 12 años en la institución. Combina rol clínico con gestión de la unidad. Tiene formación en evidencia y poca paciencia con afirmaciones vagas o marketing. Le importan tres cosas: resultados clínicos demostrables, integración con su flujo actual, y que el equipamiento no aumente la carga del staff.',
        necesidad_real: 'La unidad atiende cada vez más pacientes con TEC severo y ACV en fase subaguda. La transición a vertical es el cuello de botella clínico actual. Tiene un bipedestador antiguo que no cubre la demanda.',
        objetivo_oculto: 'No va a admitir el cuello de botella a un desconocido. Lo soltará si el ejecutivo demuestra conocimiento clínico real (no de marketing) y hace preguntas técnicas pertinentes.',
        como_reacciona: 'Profesional pero seco al principio. Se abre si: el ejecutivo habla con vocabulario clínico correcto (sin pretender ser médico), conoce limitaciones de equipos típicos (capacidades, contraindicaciones), pregunta por casos clínicos típicos antes de proponer. Se cierra si: el ejecutivo dice "es el mejor del mercado", da datos sin fuente, evita preguntas técnicas, o promete capacitación genérica.',
        frases_que_va_a_usar: [
          'Cuénteme, ¿qué necesita?',
          'Ya tenemos equipamiento, ¿qué propondría usted diferente?',
          '¿Tiene evidencia publicada de esos resultados?',
          '¿Quién está usándolo en Chile hoy?'
        ]
      },
      inicio_si_voz: 'Hola, le habla [nombre del perfil]. Me dijeron que quería hablar conmigo, cuénteme.',
      inicio_si_texto: 'Hola, le habla [nombre del perfil]. Me dijeron que quería hablar conmigo, cuénteme. (escribe tu respuesta)',
      cuando_terminar: 'Cuando el ejecutivo cierra con un próximo paso concreto (fecha, hora, plataforma) y el personaje lo acepta o lo modifica (éxito). O cuando el personaje dice explícitamente "le agradezco pero no es el momento" tras 3 intentos sin valor del ejecutivo. O cuando el ejecutivo se rinde.',
      duracion_estimada: '8-12 turnos por lado',
      reglas_para_la_IA: [
        'NO ser una caricatura: el personaje es profesional, tiene buenas razones para su escepticismo, no es hostil gratuito',
        'NO regalar la necesidad real: el ejecutivo tiene que ganársela con buenas preguntas',
        'NO interrumpir constantemente: dejar que el ejecutivo despliegue',
        'SÍ usar las objeciones típicas del perfil con frecuencia natural (1-2 a lo largo de la conversación)',
        'Si el ejecutivo hace bien la apertura → ablándate. Si pitchea sin escuchar → mantente cerrada.',
        'Cuando el ejecutivo propone un próximo paso concreto, evaluar si es razonable y aceptar/proponer alternativa. NO aceptar cualquier propuesta automáticamente.',
        'Mantener consistencia: si en el turno 3 dijiste algo, recordarlo en el turno 8.'
      ]
    }
  };

  /* Selección del perfil del decisor (M7) según el segmento del contacto activo.
     Educación → A (Carolina Bravo). Resto (salud, rehab, mutuales, ortopedias,
     adulto mayor) → B (Dr. Felipe Soto). */
  function pickDecisor_(contexto) {
    var sel = PERSONAJES['discovery-m7-decisor'];
    if (!contexto) return sel.perfil_B;
    var sig = '';
    ['tipo_categoria', 'sub_categoria', 'productoSugerido', 'cargo'].forEach(function (k) {
      if (contexto[k]) sig += ' ' + String(contexto[k]);
    });
    if (Array.isArray(contexto.etiquetas)) sig += ' ' + contexto.etiquetas.join(' ');
    sig = sig.toLowerCase();
    if (/coleg|escuel|jard[ií]n|educac|\bpie\b|director.*educ/.test(sig)) {
      return Object.assign({ _es_perfil: 'A' }, sel.perfil_A, {
        cuando_terminar: sel.cuando_terminar,
        reglas_para_la_IA: sel.reglas_para_la_IA
      });
    }
    return Object.assign({ _es_perfil: 'B' }, sel.perfil_B, {
      cuando_terminar: sel.cuando_terminar,
      reglas_para_la_IA: sel.reglas_para_la_IA
    });
  }

  function getPersonaje_(ejercicioId, contexto) {
    if (ejercicioId === 'discovery-m7-cierre' || ejercicioId === 'discovery-m7-decisor') {
      return pickDecisor_(contexto);
    }
    return PERSONAJES[ejercicioId];
  }

  /* ─── 4. Cliente del backend ──────────────────────────────── */

  function getEjecutivo() {
    try { return localStorage.getItem('oc_central_user') || ''; } catch (e) { return ''; }
  }

  async function callBackend(action, payload) {
    if (!AI_API_URL) throw new Error('AI_API_URL vacía: integración aún no configurada');
    var resp = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action, ejecutivo: getEjecutivo() }, payload))
    });
    if (!resp.ok) throw new Error('AI backend HTTP ' + resp.status);
    var data = await resp.json();
    if (!data || !data.ok) throw new Error((data && data.error) || 'AI backend error');
    return data.resultado;
  }

  /* ─── 5. API pública: window.OpenClusterAI ───────────────── */

  window.OpenClusterAI = {

    /* Evalúa un texto contra los criterios del ejercicio.
       Devuelve { feedback, puntos_fuertes, puntos_a_mejorar,
                  sugerencias, reescritura }
       o null si falla. */
    evaluate: async function (opts) {
      opts = opts || {};
      var cfg = EVALUACIONES[opts.ejercicioId];
      if (!cfg) return null;
      try {
        return await callBackend('evaluate', {
          ejercicioId: opts.ejercicioId,
          texto: String(opts.texto || ''),
          contexto: opts.contexto || null,
          config: cfg
        });
      } catch (e) {
        return null;
      }
    },

    /* Próxima línea del personaje en un roleplay.
       opts.mensajes  = [{rol:'ejecutivo'|'persona', texto}]
       opts.contexto  = contacto del pipeline (usado en M7 para elegir perfil A/B)
       Devuelve { respuesta, terminar } o null si falla. */
    conversar: async function (opts) {
      opts = opts || {};
      var pers = getPersonaje_(opts.ejercicioId, opts.contexto);
      if (!pers) return null;
      try {
        return await callBackend('conversar', {
          ejercicioId: opts.ejercicioId,
          personaje: pers,
          mensajes: Array.isArray(opts.mensajes) ? opts.mensajes : [],
          contexto: opts.contexto || null
        });
      } catch (e) {
        return null;
      }
    },

    /* Genera contenido a demanda (quiz, resumen, pregunta de cierre).
       Devuelve { texto } o null si falla. */
    generar: async function (opts) {
      opts = opts || {};
      try {
        return await callBackend('generar', {
          tipo: String(opts.tipo || ''),
          contexto: opts.contexto || null
        });
      } catch (e) {
        return null;
      }
    }
  };
})();
