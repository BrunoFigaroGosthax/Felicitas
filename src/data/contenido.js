// Datos de contacto y textos fijos.
export const CONTACTO = {
  nombre: 'Dra. Felicitas Pino Meneses',
  matricula: 'MP NQN 5643',
  whatsapp: '299 462-4870',
  whatsappUrl: 'https://wa.me/5492994624870',
  email: 'dra.felicitaspino@gmail.com',
  instagram: '@dra.felicitas.pediatra',
  instagramUrl: 'https://instagram.com/dra.felicitas.pediatra',
  // Ficha de Google (reseñas y cómo llegar a CIEV).
  googleUrl: 'https://www.google.com/maps/search/?api=1&query=Dra.+Pino+Meneses+Felicitas+Neuqu%C3%A9n',
};

const mapa = (direccion) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

/**
 * Dónde atiende. Las agendas no comparten días: la web reserva solo en CIEV (DrApp);
 * los consultorios OSPEPRI dan turnos por su propia app y solo a pacientes de OSPEPRI.
 */
export const SEDES = [
  {
    id: 'ciev',
    nombre: 'CIEV',
    direccion: 'Entre Ríos 1152, Neuquén',
    horarios: ['Martes de 17 a 21 h'],
    pacientes: 'Obras sociales del listado y particulares.',
    turnos: { texto: 'Pedir turno online', ruta: '/turnos' },
    mapa: mapa('Entre Ríos 1152, Neuquén, Argentina'),
  },
  {
    id: 'ospepri',
    nombre: 'Consultorios OSPEPRI',
    direccion: 'Mendoza 125, Neuquén',
    horarios: ['Lunes y jueves de 8 a 14 h', 'Miércoles y viernes de 14 a 18:30 h'],
    pacientes: 'Solo pacientes de OSPEPRI.',
    turnos: { texto: 'Turnos en la app Mi Sindicato', url: 'https://appsindicatopetroleros.org/#/home' },
    mapa: mapa('Mendoza 125, Neuquén, Argentina'),
  },
];

/** Agenda que se ofrece en la web (CIEV, por DrApp): martes de 17 a 21 h. */
export const AGENDA_WEB = { diasSemana: [2], sede: 'ciev' };

export const SERVICIOS = [
  {
    titulo: 'Controles de salud',
    texto: 'Seguimiento del crecimiento y desarrollo, vacunas y pautas para cada edad.',
    fondo: 'bg-amarillo',
    icono: 'corazon',
  },
  {
    titulo: 'Consultas por enfermedad',
    texto: 'Fiebre, tos, dolor de panza, erupciones. Te ayudo a saber cuándo es guardia y cuándo consultorio.',
    fondo: 'bg-lavanda',
    icono: 'termometro',
  },
  {
    titulo: 'Adolescencia',
    texto: 'Estar cerca, incluso cuando empiezan a alejarse. Un espacio propio para ellos y para la familia.',
    fondo: 'bg-menta',
    icono: 'familia',
  },
  {
    titulo: 'Orientación a familias',
    texto: 'Sueño, alimentación, límites y dudas del día a día, con información clara y confiable.',
    fondo: 'bg-page border-2 border-borde',
    icono: 'charla',
  },
];

// Modo demo (con Supabase salen de las tablas obras_sociales y testimonios). Obras sociales de CIEV;
// la misma lista está en supabase/seed.sql. Próximamente: OSDE, SMG y Galeno (cargadas inactivas).
export const OBRAS_SOCIALES = [
  'ISSN', 'Avalian', 'OMINT', 'Doctored', 'Gerdanna', 'Gilsa SRL (Integral Salud)', 'ITER Medicina S.A.', 'Jerárquicos Salud',
  'Medicus', 'Medifé', 'Mutual Federada', 'Nativus', 'OS Pasteleros', 'OSAPM', 'OSDIPP', 'OSPATLyF', 'OSMATA', 'OSP Bancarios',
  'OSP Ceramistas', 'OSPATCA', 'OSPEPRI', 'OSPI Maderera', 'OSPIL', 'OSSEG', 'Poder Judicial', 'Policía Federal', 'San Pedro',
  'Sancor Salud', 'SCIS', 'Servicio Penitenciario Federal', 'SOSUNC', 'TV Salud', 'UOM', 'UTEPLIM', 'Visitar / Andar',
];

export const TESTIMONIOS = [
  { texto: '[Testimonio real de una familia, publicado con su permiso.]', autor: '[Nombre], mamá de [nombre]' },
  { texto: '[Testimonio real de una familia, publicado con su permiso.]', autor: '[Nombre], papá de [nombre]' },
  { texto: '[Testimonio real de una familia, publicado con su permiso.]', autor: '[Nombre], mamá de [nombre]' },
];

export const MOTIVOS = [
  { id: 'control', label: 'Control de salud', ayuda: 'Crecimiento, vacunas, certificados' },
  { id: 'enfermedad', label: 'Consulta por enfermedad', ayuda: 'Fiebre, tos, dolor, erupciones' },
  { id: 'adolescencia', label: 'Adolescencia', ayuda: 'Consulta para adolescentes' },
  { id: 'primera', label: 'Primera consulta', ayuda: 'Si es la primera vez que venís' },
];
