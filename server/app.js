// App de Express. En local la levanta server/index.js; en Vercel, api/index.js (función serverless).
import express from 'express';
import arrepentimiento from './routes/arrepentimiento.js';
import clases from './routes/clases.js';
import compras from './routes/compras.js';
import turnos from './routes/turnos.js';
import webhooks from './routes/webhooks.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api/turnos', turnos);
app.use('/api/compras', compras);
app.use('/api/clases', clases);
app.use('/api/arrepentimiento', arrepentimiento);
app.use('/api/webhooks', webhooks);

app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado.' }));

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos inválidos.' });
  const status = err.status || 500;
  if (status >= 500 && status !== 503) console.error(err); // 503 = integración sin configurar, ya avisado al iniciar
  res.status(status).json({ error: err.publicMessage || 'Ocurrió un error. Probá de nuevo en unos minutos.' });
});

export default app;
