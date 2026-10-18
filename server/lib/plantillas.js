// Textos de los emails. Voz de la web: cálida, clara, con voseo. Sin datos de salud del paciente.
import { config } from './config.js';

const fmtFecha = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const fecha = (iso) => fmtFecha.format(new Date(`${iso}T12:00:00Z`));
const firma = '\n\nFelicitas · Pediatría con propósito';

export const turnoConfirmado = ({ responsable, fecha: dia, hora }) => ({
  asunto: 'Tu turno quedó reservado',
  texto:
    `Hola, ${responsable}:\n\nTu turno quedó reservado para el ${fecha(dia)} a las ${hora}.\n` +
    `Dirección: [Dirección del consultorio].\n\n` +
    `Si no podés venir, avisanos con 24 horas de anticipación respondiendo este email.\n` +
    `Ante una urgencia, no esperes al turno: acudí a la guardia más cercana.${firma}`,
});

export const compraAprobada = ({ curso }) => ({
  asunto: `Ya podés empezar: ${curso.titulo}`,
  texto:
    `¡Gracias por tu compra!\n\nYa tenés acceso a "${curso.titulo}". Entrá cuando quieras y retomá donde dejaste:\n` +
    `${config.siteUrl}/cursos/${curso.slug}\n\n` +
    `Si te arrepentiste, tenés 10 días corridos para pedir la baja desde ${config.siteUrl}/arrepentimiento.${firma}`,
});

export const arrepentimientoAcuse = ({ nombre, codigo }) => ({
  asunto: `Recibimos tu solicitud de arrepentimiento (${codigo})`,
  texto:
    `Hola, ${nombre}:\n\nRecibimos tu solicitud de revocación de compra.\n` +
    `Tu código de seguimiento es ${codigo}. Te vamos a responder dentro de las próximas 24 horas hábiles.${firma}`,
});

export const arrepentimientoAviso = ({ codigo, nombre, email, telefono, compra, detalle }) => ({
  asunto: `Nueva solicitud de arrepentimiento ${codigo}`,
  texto:
    `Código: ${codigo}\nNombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono || '-'}\n` +
    `Compra: ${compra || '-'}\nDetalle: ${detalle || '-'}\n\n` +
    `Hay que responder dentro de las 24 h (Res. 424/2020). Marcala como atendida en Supabase.`,
});
