// Mercado Pago: Checkout Pro (preferencias) y webhooks de pagos.
// Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { errorPublico } from './errores.js';

const API = 'https://api.mercadopago.com';

async function llamar(ruta, { method = 'GET', body, idempotencia } = {}) {
  const res = await fetch(`${API}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.mercadoPago.accessToken}`,
      'Content-Type': 'application/json',
      ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw errorPublico(502, 'No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos.',
      `Mercado Pago ${method} ${ruta} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/** Crea el checkout de una compra. Devuelve { preferenciaId, url } (url = init_point para redirigir). */
export async function crearPreferencia({ compra, curso, email }) {
  const volver = (estado) => `${config.siteUrl}/pago/resultado?estado=${estado}&curso=${encodeURIComponent(curso.slug)}`;
  const data = await llamar('/checkout/preferences', {
    method: 'POST',
    idempotencia: `preferencia-${compra.id}`,
    body: {
      items: [
        {
          id: curso.id,
          title: curso.titulo,
          quantity: 1,
          unit_price: Number(compra.monto),
          currency_id: compra.moneda,
        },
      ],
      payer: email ? { email } : undefined,
      external_reference: compra.id,
      back_urls: { success: volver('aprobado'), pending: volver('pendiente'), failure: volver('rechazado') },
      auto_return: 'approved',
      notification_url: `${config.siteUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'FELICITAS',
    },
  });
  return { preferenciaId: data.id, url: data.init_point };
}

export const obtenerPago = (id) => llamar(`/v1/payments/${encodeURIComponent(id)}`);

/** Estado de Mercado Pago → estado_compra de la base. */
export function estadoCompra(statusMp) {
  switch (statusMp) {
    case 'approved':
      return 'aprobada';
    case 'rejected':
      return 'rechazada';
    case 'cancelled':
      return 'cancelada';
    case 'refunded':
    case 'charged_back':
      return 'reembolsada';
    default:
      return 'pendiente'; // pending, in_process, authorized, in_mediation
  }
}

/**
 * Verifica la firma del webhook (header x-signature: "ts=...,v1=...").
 * Manifiesto: "id:<data.id de la URL, en minúsculas>;request-id:<x-request-id>;ts:<ts>;"
 * Las partes que no vienen se omiten.
 */
export function firmaValida({ xSignature, xRequestId, dataId, secreto }) {
  if (!xSignature || !secreto) return false;
  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  if (!partes.ts || !partes.v1) return false;

  let manifiesto = '';
  if (dataId) manifiesto += `id:${String(dataId).toLowerCase()};`;
  if (xRequestId) manifiesto += `request-id:${xRequestId};`;
  manifiesto += `ts:${partes.ts};`;

  const esperado = Buffer.from(createHmac('sha256', secreto).update(manifiesto).digest('hex'));
  const recibido = Buffer.from(partes.v1);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
