// Datos de contacto y textos fijos. Reemplazar los valores entre corchetes con los reales.
export const CONTACTO = {
  nombre: 'Dra. Felicitas Pino',
  matricula: '[M.N. 000000]',
  direccion: '[Dirección del consultorio]',
  horarios: '[Días y horarios de atención]',
  whatsappUrl: 'https://wa.me/5490000000000', // [Número de WhatsApp]
  email: 'contacto@ejemplo.com', // [Email]
  instagram: '@felicitas.pediatra',
  instagramUrl: 'https://instagram.com/felicitas.pediatra',
};

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

// Modo demo. Con Supabase salen de las tablas obras_sociales y testimonios.
export const OBRAS_SOCIALES = ['[Obra social 1]', '[Obra social 2]'];

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
