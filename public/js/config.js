// ============================================================================
//  CONTENIDO EDITABLE
//  - Las preguntas NO indican cuál es la correcta: eso vive en api/_answers.js.
//  - Usa *asteriscos* para la palabra clave en coral e itálica.
//  - Si agregas/quitas preguntas, mantén los mismos ids en api/_answers.js.
// ============================================================================

export const config = {
  caseCode: 'Exp. 0811',

  // Solo se usa si el servidor no responde. La fecha real la decide /api/time.
  unlockAt: '2026-11-08T00:00:00-05:00',
  stampDate: '08 · 11 · 2026',

  lock: {
    eyebrow: 'Cápsula del tiempo · Acceso: 1 persona',
    title: 'Esto se abre el *8 de noviembre*.',
    lede: 'Contenido sellado y clasificado. Solo una persona en el mundo tiene autorización, y el sistema sabe perfectamente quién es.',
    openEyebrow: 'Cápsula del tiempo · Estado: desclasificada',
    openTitle: 'Llegó el día. *Ábrela*.',
    openLede: 'El sello se rompió. Pero antes de mostrarte nada, el sistema necesita confirmar que de verdad eres tú.',
    cta: 'Abrir el expediente',
  },

  intro: {
    eyebrow: 'Protocolo de verificación',
    title: 'Antes de entrar, demuestra que *eres tú*.',
    lede: 'Te voy a hacer unas preguntas de seguridad sobre nuestra historia. Solo la verdadera dueña de este expediente se las sabe todas.',
    cta: 'Iniciar verificación',
  },

  // `image`: recuerdo que acompaña la pregunta (grande arriba y de fondo).
  // `classified: true` lo muestra borroso con sello hasta que acierta (para fotos
  // que soplarían la respuesta, como capturas con fecha).
  questions: [
    {
      id: 'q1',
      prompt: '¿Qué día *hablamos* por primera vez?',
      image: '/assets/recuerdo-1-primer-mensaje.jpg',
      classified: true,
      options: [
        { id: 'a', label: '10 de octubre' },
        { id: 'b', label: '8 de noviembre' },
        { id: 'c', label: '28 de septiembre' },
        { id: 'd', label: '1 de octubre' },
      ],
    },
    {
      id: 'q2',
      prompt: '¿Cuándo *salimos* por primera vez?',
      image: '/assets/recuerdo-2-primera-salida.jpg',
      classified: true,
      options: [
        { id: 'a', label: '10 de octubre' },
        { id: 'b', label: '8 de noviembre' },
        { id: 'c', label: '4 de octubre' },
        { id: 'd', label: '1 de octubre' },
      ],
    },
    {
      id: 'q3',
      prompt: '¿Qué día somos *oficialmente* novios?',
      image: '/assets/recuerdo-3-novios.jpg',
      options: [
        { id: 'a', label: '10 de octubre' },
        { id: 'b', label: '8 de noviembre' },
        { id: 'c', label: '4 de octubre' },
        { id: 'd', label: '1 de octubre' },
      ],
    },
    {
      id: 'q4',
      prompt: '¿Cuándo fue nuestro *primer beso*?',
      image: '/assets/recuerdo-4-nosotros.jpg',
      options: [
        { id: 'a', label: '1 de noviembre' },
        { id: 'b', label: '8 de noviembre' },
        { id: 'c', label: '4 de octubre' },
        { id: 'd', label: '1 de octubre' },
      ],
    },
  ],

  // Rotan cada vez que falla. Humor de sistema de seguridad.
  alarmLines: [
    'Esa respuesta no la daría ella. ¿Quién eres y qué hiciste con mi novia?',
    'Intento registrado. Ya se notificó a la central del amor.',
    'El sistema detecta un 87% de probabilidad de impostora.',
    'Error 404: recuerdo no encontrado. Te lo voy a recordar toda la vida.',
    'Sospechoso. Muy sospechoso. Inténtalo otra vez, por favor.',
    'Este incidente quedará en tu expediente permanente.',
  ],

  final: {
    eyebrow: 'Acceso concedido · Identidad confirmada',
    title: 'Feliz aniversario, *mi amor*.',
    gif: '/assets/regalo.gif',
    giftAlt: 'Tu regalo',
    giftHint: 'Toca el regalo',
    song: {
      eyebrow: 'Banda sonora del expediente',
      title: 'Loco enamorado',
      artist: 'Fonseca',
      uri: 'spotify:track:6E6a2T1KtGMYShq0rjK7A0',
      hint: 'Si no suena sola, dale play ▶',
    },
    letterEyebrow: 'Mensaje desclasificado',
    letter: [
      'Si estás leyendo esto, pasaste todas las preguntas de seguridad. Nunca lo dudé.',
      'Amorcito, quiero decirte que te amo con todo mi corazón. Eres todo lo que siempre he soñado; todos los días le doy gracias a Dios por tenerte a mi lado. Eres, por mucho, lo mejor que me ha pasado.',
      'Han sido 12 meses muy lindos en los que has sacado mi mejor versión. Hemos vivido momentos muy lindos y sé que seguiremos enfrentando todas las pruebas que el destino nos ponga.',
      'Te busqué 34 años y, ahora que te tengo, te voy a amar por siempre.',
    ],
    from: 'Tu amor bonito',
    to: 'Mi amor bonito',

    // Muro de evidencias al final (en orden cronológico). `wide` ocupa todo el ancho.
    galleryEyebrow: 'Evidencia recopilada · 12 meses',
    gallery: [
      { src: '/assets/recuerdo-1-primer-mensaje.jpg', caption: '28.09.25 · Primer mensaje' },
      { src: '/assets/recuerdo-2-primera-salida.jpg', caption: '04.10.25 · Primera salida' },
      { src: '/assets/recuerdo-4-nosotros.jpg', caption: '01.11.25 · Primer beso', wide: true },
      { src: '/assets/recuerdo-3-novios.jpg', caption: '08.11.25 · Oficialmente novios', wide: true },
    ],

    // Álbum completo (agrupado por mes). Fotos en /assets/galeria/NN.jpg y NN-mini.jpg.
    // `date` en formato AAAA-MM-DD; null si no tiene fecha. Se puede añadir `caption`.
    album: {
      eyebrow: 'Álbum desclasificado',
      hint: 'Toca una foto para verla en grande',
      base: '/assets/galeria/',
      photos: [
        { file: '01', date: '2025-11-01' },
        { file: '02', date: '2025-11-08' },
        { file: '03', date: '2025-11-16' },
        { file: '04', date: '2025-11-22' },
        { file: '05', date: '2025-11-29' },
        { file: '06', date: '2025-12-07' },
        { file: '07', date: '2025-12-30' },
        { file: '08', date: '2026-01-03' },
        { file: '09', date: '2026-01-04' },
        { file: '10', date: '2026-01-04' },
        { file: '11', date: '2026-01-05' },
        { file: '12', date: '2026-01-08' },
        { file: '13', date: '2026-01-24' },
        { file: '14', date: '2026-01-24' },
        { file: '15', date: '2026-01-24' },
        { file: '16', date: '2026-02-08' },
        { file: '17', date: '2026-03-01' },
        { file: '18', date: '2026-03-01' },
        { file: '19', date: '2026-03-15' },
        { file: '20', date: '2026-04-05' },
        { file: '21', date: '2026-05-03' },
        { file: '22', date: '2026-05-09' },
        { file: '23', date: '2026-05-09' },
        { file: '24', date: '2026-05-24' },
        { file: '25', date: '2026-05-30' },
        { file: '26', date: '2026-06-14' },
        { file: '27', date: '2026-06-20' },
        { file: '28', date: '2026-06-27' },
        { file: '29', date: '2026-06-28' },
        { file: '30', date: '2026-06-28' },
        { file: '31', date: '2026-07-12' },
        { file: '32', date: '2026-07-18' },
        { file: '33', date: '2026-07-18' },
        { file: '34', date: '2026-07-19' },
        { file: '35', date: '2026-07-19' },
        { file: '36', date: '2026-07-22' },
        { file: '37', date: '2026-07-26' },
        { file: '38', date: '2026-08-08' },
        { file: '39', date: '2026-09-13' },
        { file: '40', date: '2026-09-27' },
        { file: '41', date: '2026-10-11' },
        { file: '42', date: '2026-10-11' },
        { file: '43', date: null },
      ],
    },
    statusLabel: 'Te amo',
    resetLabel: 'Volver a verificarme',
  },
};
