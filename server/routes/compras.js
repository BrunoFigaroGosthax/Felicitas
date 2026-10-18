import { Router } from 'express';
import { requiereUsuario } from '../lib/auth.js';
import { configurado } from '../lib/config.js';
import { enviarSinFallar } from '../lib/email.js';
import { errorPublico, handler, noConfigurado } from '../lib/errores.js';
import { limite } from '../lib/limite.js';
import { crearPreferencia } from '../lib/mercadopago.js';
import { compraAprobada } from '../lib/plantillas.js';
import { admin, rpc, sinError } from '../lib/supabase.js';
import { texto, UUID } from '../lib/validar.js';

const router = Router();

function leerPedido(body) {
  const { cursoId, codigo } = body || {};
  if (!UUID.test(cursoId || '')) throw errorPublico(400, 'Curso inválido.');
  return { cursoId, codigo: texto(codigo, 30) };
}

// POST /api/compras/precio { cursoId, codigo? } → { precioLista, descuento, monto, conCupon }
router.post(
  '/precio',
  limite({ ventanaMs: 10 * 60_000, maximo: 30 }),
  requiereUsuario,
  handler(async (req, res) => {
    const { cursoId, codigo } = leerPedido(req.body);
    const [p] = await rpc(admin, 'calcular_precio', {
      p_curso_id: cursoId,
      p_codigo: codigo,
      p_usuario_id: req.usuario.id,
    });
    res.json({
      precioLista: Number(p.precio_lista),
      descuento: Number(p.descuento),
      monto: Number(p.monto),
      conCupon: Boolean(p.cupon_id),
    });
  }),
);

// POST /api/compras { cursoId, codigo? } → { url } para ir a Mercado Pago, o { aprobada: true } si fue sin cargo.
// El monto lo calcula la base (crear_compra): nunca se toma un precio del frontend.
router.post(
  '/',
  limite({ ventanaMs: 10 * 60_000, maximo: 10 }),
  requiereUsuario,
  handler(async (req, res) => {
    if (!configurado.mercadoPago) throw noConfigurado('El pago online');
    const { cursoId, codigo } = leerPedido(req.body);

    const curso = sinError(
      await admin.from('cursos').select('id, slug, titulo').eq('id', cursoId).eq('publicado', true).maybeSingle(),
      'cursos',
    );
    if (!curso) throw errorPublico(404, 'No encontramos el curso.');

    const compra = await rpc(admin, 'crear_compra', {
      p_usuario_id: req.usuario.id,
      p_curso_id: cursoId,
      p_codigo: codigo,
    });

    if (compra.estado === 'aprobada') {
      await enviarSinFallar({ para: req.usuario.email, ...compraAprobada({ curso }) });
      return res.status(201).json({ aprobada: true });
    }

    const { preferenciaId, url } = await crearPreferencia({ compra, curso, email: req.usuario.email });
    sinError(await admin.from('compras').update({ preferencia_id: preferenciaId }).eq('id', compra.id), 'compras');
    res.status(201).json({ url });
  }),
);

export default router;
