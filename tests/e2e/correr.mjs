// npm run test:e2e  → prueba el sitio local (http://localhost:5173 + backend en :3001; levantarlos antes).
// E2E_URL=https://felicitas-sable.vercel.app npm run test:e2e  → prueba el sitio publicado.
// Solo una: npm run test:e2e -- panel   (publico, compra, panel, video, turnos)
import { WEB } from './comun.mjs';

const TODAS = ['publico', 'turnos', 'video', 'compra', 'panel'];
const elegidas = process.argv.slice(2).length ? process.argv.slice(2) : TODAS;

console.log(`Probando ${WEB}`);
let fallas = 0;
for (const nombre of elegidas) {
  try {
    const { default: prueba } = await import(`./${nombre}.mjs`);
    fallas += await prueba();
  } catch (e) {
    fallas++;
    console.log(`  ERROR en ${nombre}: ${e.message}`);
  }
}
console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
