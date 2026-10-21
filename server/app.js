// App de Express. En local la levanta server/index.js; en Vercel, api/index.js (función serverless).
import express from 'express';
import adminRutas from './routes/admin.js';
import agenda from './routes/agenda.js';
import arrepentimiento from './routes/arrepentimiento.js';
import clases from './routes/clases.js';
import compras from './routes/compras.js';
import paginas, { paginaCurso, paginaSitemap } from './routes/paginas.js';
import turnos from './routes/turnos.js';
import webhooks from './routes/webhooks.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// rawBody: algunos sistemas firman el cuerpo exacto de sus avisos (webhooks).
app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => (req.rawBody = buf) }));

app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api/turnos', turnos);
app.use('/api/agenda', agenda);
app.use('/api/compras', compras);
app.use('/api/clases', clases);
app.use('/api/arrepentimiento', arrepentimiento);
app.use('/api/webhooks', webhooks);
app.use('/api/admin', adminRutas);
app.use('/api/paginas', paginas);

app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado.' }));

// Rutas públicas que Vercel reescribe a esta función (ver vercel.json).
app.get('/cursos/:slug', paginaCurso);
app.get('/sitemap.xml', paginaSitemap);

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos inválidos.' });
  const status = err.status || 500;
  if (status >= 500 && status !== 503) console.error(err); // 503 = integración sin configurar, ya avisado al iniciar
  res.status(status).json({ error: err.publicMessage || 'Ocurrió un error. Probá de nuevo en unos minutos.' });
});

export default app;
