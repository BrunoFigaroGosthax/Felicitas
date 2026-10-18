import { Router } from 'express';
import { config, configurado } from '../lib/config.js';
import { enviarSinFallar } from '../lib/email.js';
import { handler, noConfigurado } from '../lib/errores.js';
import { estadoCompra, firmaValida, obtenerPago } from '../lib/mercadopago.js';
import { compraAprobada } from '../lib/plantillas.js';
import { admin, sinError } from '../lib/supabase.js';
import { UUID } from '../lib/validar.js';

const router = Router();

/** ¿Puede una compra pasar de `actual` a `nuevo`? Una aprobada solo puede reembolsarse; una reembolsada queda así. */
export function transicionValida(actual, nuevo) {
  if (actual === nuevo || actual === 'reembolsada') return false;
  if (actual === 'aprobada') return nuevo === 'reembolsada';
  return true;
}

// POST /api/webhooks/mercadopago
// Mercado Pago reintenta si no recibe 200: ante un error propio se responde 500 para que lo vuelva a mandar.
router.post(
  '/mercadopago',
  handler(async (req, res) => {
    if (!configurado.supabase || !configurado.mercadoPago) throw noConfigurado('El pago online');

    const tipo = req.query.type || req.query.topic || req.body?.type;
    const dataId = req.query['data.id'] || req.body?.data?.id;
    if (tipo !== 'payment' || !dataId) return res.sendStatus(200); // otros avisos no se usan

    const firmado = firmaValida({
      xSignature: req.get('x-signature'),
      xRequestId: req.get('x-request-id'),
      dataId: req.query['data.id'] ?? dataId,
      secreto: config.mercadoPago.webhookSecret,
    });
    if (!firmado) return res.sendStatus(401);

    // Se consulta el pago a Mercado Pago: el cuerpo del aviso no se usa como fuente de verdad.
    const pago = await obtenerPago(dataId);
    const compraId = UUID.test(pago.external_reference || '') ? pago.external_reference : null;
    const estado = estadoCompra(pago.status);
    const eventoId = `pago-${pago.id}-${pago.status}`;

    // Idempotencia: un mismo pago en un mismo estado se procesa una sola vez.
    sinError(
      await admin.from('eventos_pago').upsert(
        {
          proveedor: 'mercadopago',
          evento_id: eventoId,
          tipo: 'payment',
          compra_id: compraId,
          // Solo lo necesario para auditar: sin datos personales del pagador.
          payload: {
            id: pago.id,
            status: pago.status,
            status_detail: pago.status_detail,
            transaction_amount: pago.transaction_amount,
            currency_id: pago.currency_id,
            external_reference: pago.external_reference,
            date_approved: pago.date_approved,
          },
        },
        { onConflict: 'proveedor,evento_id', ignoreDuplicates: true },
      ),
      'eventos_pago',
    );
    const evento = sinError(
      await admin.from('eventos_pago').select('id, procesado_at').eq('proveedor', 'mercadopago').eq('evento_id', eventoId).single(),
      'eventos_pago',
    );
    if (evento.procesado_at) return res.sendStatus(200);

    const cerrar = async (error = null) => {
      sinError(
        await admin.from('eventos_pago').update({ procesado_at: new Date().toISOString(), error }).eq('id', evento.id),
        'eventos_pago',
      );
      if (error) console.error(`Pago ${pago.id}: ${error}`);
      res.sendStatus(200);
    };

    const compra = compraId
      ? sinError(
          await admin.from('compras').select('id, estado, monto, moneda, usuario_id, curso_id').eq('id', compraId).maybeSingle(),
          'compras',
        )
      : null;
    if (!compra) return cerrar('La compra del pago no existe.');

    if (estado === 'aprobada' && (Number(pago.transaction_amount) !== Number(compra.monto) || pago.currency_id !== compra.moneda)) {
      return cerrar(`El monto pagado (${pago.transaction_amount} ${pago.currency_id}) no coincide con la compra (${compra.monto} ${compra.moneda}).`);
    }

    if (transicionValida(compra.estado, estado)) {
      // El trigger de la base da o quita el acceso al curso según el estado.
      sinError(
        await admin.from('compras').update({ estado, pago_id: String(pago.id) }).eq('id', compra.id),
        'compras',
      );

      if (estado === 'aprobada' && compra.usuario_id) {
        const [{ data: u }, curso] = await Promise.all([
          admin.auth.admin.getUserById(compra.usuario_id),
          admin.from('cursos').select('slug, titulo').eq('id', compra.curso_id).single().then((r) => sinError(r, 'cursos')),
        ]);
        if (u?.user?.email) await enviarSinFallar({ para: u.user.email, ...compraAprobada({ curso }) });
      }
    }

    return cerrar();
  }),
);

export default router;
