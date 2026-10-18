import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { config, configurado } from '../lib/config.js';
import { enviarSinFallar } from '../lib/email.js';
import { errorPublico, handler } from '../lib/errores.js';
import { limite } from '../lib/limite.js';
import { arrepentimientoAcuse, arrepentimientoAviso } from '../lib/plantillas.js';
import { admin, sinError } from '../lib/supabase.js';
import { esEmail, esTelefono, texto } from '../lib/validar.js';

const router = Router();

// POST /api/arrepentimiento → { codigo }
// Botón de arrepentimiento (Res. 424/2020): se entrega un código de seguimiento y se responde en 24 h.
router.post(
  '/',
  limite({ ventanaMs: 60 * 60_000, maximo: 5 }),
  handler(async (req, res) => {
    const d = req.body || {};
    const datos = {
      nombre: texto(d.nombre, 120),
      email: texto(d.email, 254),
      telefono: texto(d.telefono, 20),
      compra: texto(d.compra, 200),
      detalle: texto(d.detalle, 1000),
    };
    if (!datos.nombre) throw errorPublico(400, 'Escribí tu nombre y apellido.');
    if (!esEmail(datos.email)) throw errorPublico(400, 'Ingresá un email válido.');
    if (datos.telefono && !esTelefono(datos.telefono)) throw errorPublico(400, 'Revisá el teléfono.');

    const codigo = `ARR-${randomBytes(4).toString('hex').toUpperCase()}`;

    if (configurado.supabase) {
      sinError(
        await admin.from('arrepentimientos').insert({
          codigo,
          nombre: datos.nombre,
          email: datos.email,
          telefono: datos.telefono,
          compra_referencia: datos.compra,
          detalle: datos.detalle,
        }),
        'arrepentimientos',
      );
    }

    await enviarSinFallar({ para: datos.email, ...arrepentimientoAcuse({ nombre: datos.nombre, codigo }) });
    if (config.email.admin) {
      await enviarSinFallar({ para: config.email.admin, ...arrepentimientoAviso({ codigo, ...datos }) });
    }

    res.status(201).json({ codigo });
  }),
);

export default router;
