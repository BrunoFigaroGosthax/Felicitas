/**
 * Límite de pedidos por IP, en memoria. En Vercel cada instancia tiene su memoria: frena abusos
 * simples (alguien llenando la agenda de turnos), no ataques distribuidos. Para eso, el firewall de Vercel.
 */
export function limite({ ventanaMs, maximo }) {
  const registros = new Map();
  return (req, res, next) => {
    const ahora = Date.now();
    const ip = req.get('x-real-ip') || req.ip || 'local';
    const r = registros.get(ip);
    if (!r || ahora > r.fin) {
      registros.set(ip, { n: 1, fin: ahora + ventanaMs });
    } else if (++r.n > maximo) {
      res.set('Retry-After', String(Math.ceil((r.fin - ahora) / 1000)));
      return res.status(429).json({ error: 'Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.' });
    }
    if (registros.size > 5000) {
      for (const [k, v] of registros) if (ahora > v.fin) registros.delete(k);
    }
    next();
  };
}
