// Emails transaccionales con Resend (https://resend.com). Sin RESEND_API_KEY, se simulan en consola.
import { config, configurado } from './config.js';

export async function enviarEmail({ para, asunto, texto }) {
  if (!configurado.email) {
    console.info(`[email simulado] Para: ${para} · ${asunto}\n${texto}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.email.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.email.from, to: [para], subject: asunto, text: texto }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Igual, pero un email que falla no corta la operación principal (se registra y sigue). */
export async function enviarSinFallar(mensaje) {
  try {
    await enviarEmail(mensaje);
  } catch (err) {
    console.error('No se pudo enviar el email:', err.message);
  }
}
