import { ButtonLink } from '../components/ui/Button.jsx';
import useTitulo from '../hooks/useTitulo.js';

export default function NoEncontrada() {
  useTitulo('Página no encontrada');
  return (
    <div className="container-page flex flex-col items-start gap-4 py-20">
      <h1 className="text-[clamp(32px,4vw,48px)] leading-tight">No encontramos esta página</h1>
      <p className="text-lg text-ink-muted">Puede que el enlace haya cambiado.</p>
      <ButtonLink to="/">Volver al inicio</ButtonLink>
    </div>
  );
}
