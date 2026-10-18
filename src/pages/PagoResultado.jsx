import { useSearchParams } from 'react-router-dom';
import { ButtonLink } from '../components/ui/Button.jsx';
import Icono from '../components/ui/Icono.jsx';
import useTitulo from '../hooks/useTitulo.js';

// Mercado Pago vuelve acá con ?estado=aprobado|pendiente|rechazado&curso=slug.
// El acceso lo da el webhook (no esta página): puede tardar unos segundos más que la vuelta.
const TEXTOS = {
  aprobado: {
    titulo: '¡Listo! Ya tenés el curso',
    texto: 'Te mandamos un email con el acceso. Si todavía no lo ves habilitado, esperá un minuto y recargá la página del curso.',
    icono: 'check',
    fondo: 'bg-menta',
  },
  pendiente: {
    titulo: 'Tu pago está en proceso',
    texto: 'Mercado Pago todavía lo está confirmando (pasa con algunos medios de pago). Apenas se acredite, se habilita el curso y te avisamos por email.',
    icono: 'charla',
    fondo: 'bg-amarillo',
  },
  rechazado: {
    titulo: 'El pago no se completó',
    texto: 'No se hizo ningún cobro. Podés intentar de nuevo con otro medio de pago.',
    icono: 'candado',
    fondo: 'bg-lavanda',
  },
};

export default function PagoResultado() {
  const [params] = useSearchParams();
  const estado = TEXTOS[params.get('estado')] ? params.get('estado') : 'pendiente';
  const curso = params.get('curso');
  const t = TEXTOS[estado];
  useTitulo(t.titulo);

  return (
    <div className="container-page flex justify-center py-12 sm:py-20 lg:pb-28">
      <div className="flex w-full max-w-[560px] flex-col items-start gap-4 rounded-card border border-borde bg-card p-6 sm:p-10" role="status">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full ${t.fondo}`}>
          <Icono nombre={t.icono} size={30} strokeWidth={2.5} />
        </span>
        <h1 className="text-[clamp(30px,4vw,40px)] leading-tight">{t.titulo}</h1>
        <p className="text-[17px]">{t.texto}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          {curso && (
            <ButtonLink to={`/cursos/${encodeURIComponent(curso)}`}>
              {estado === 'rechazado' ? 'Volver a intentar' : 'Ir al curso'}
            </ButtonLink>
          )}
          <ButtonLink to="/mi-cuenta" variante="secundario">Mis cursos</ButtonLink>
        </div>
      </div>
    </div>
  );
}
