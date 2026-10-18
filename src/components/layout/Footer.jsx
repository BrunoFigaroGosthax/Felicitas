import { Link } from 'react-router-dom';
import { CONTACTO } from '../../data/contenido.js';

export default function Footer() {
  return (
    <footer id="contacto" className="bg-menta text-on-brand">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img
            src="/img/logo-insignia-menta.png"
            alt="Felicitas, pediatría con propósito"
            width="900"
            height="490"
            loading="lazy"
            className="h-auto w-56 max-w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-body text-base font-bold">Consultorio</h2>
          <p>{CONTACTO.direccion}</p>
          <p>{CONTACTO.horarios}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-body text-base font-bold">Contacto</h2>
          <a className="underline" href={CONTACTO.whatsappUrl}>WhatsApp</a>
          <a className="underline" href={CONTACTO.instagramUrl}>{CONTACTO.instagram}</a>
          <a className="underline" href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-body text-base font-bold">Navegar</h2>
          <Link className="underline" to="/turnos">Pedir turno</Link>
          <Link className="underline" to="/cursos">Cursos</Link>
          <Link className="underline" to="/certificados">Verificar un certificado</Link>
        </div>
      </div>
      <div className="container-page flex flex-col gap-4 border-t border-on-brand/20 py-6 text-sm">
        <p>La información de este sitio no reemplaza la consulta médica. Ante una urgencia, acudí a la guardia más cercana.</p>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link className="inline-flex min-h-11 items-center underline" to="/terminos">Términos y condiciones</Link>
          <Link className="inline-flex min-h-11 items-center underline" to="/privacidad">Política de privacidad</Link>
          {/* Res. 424/2020: acceso visible y directo desde la página de inicio. */}
          <Link className="inline-flex min-h-11 items-center rounded-full bg-page px-4 font-bold no-underline" to="/arrepentimiento">
            Botón de arrepentimiento
          </Link>
        </nav>
      </div>
    </footer>
  );
}
