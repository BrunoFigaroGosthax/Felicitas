// Servidor local de desarrollo (npm run dev:server). En producción la app corre como función de Vercel.
import app from './app.js';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API de Felicitas en http://localhost:${PORT}`));
