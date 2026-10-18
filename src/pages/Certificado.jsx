import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Ondas from '../components/ui/Ondas.jsx';
import { CONTACTO } from '../data/contenido.js';
import useTitulo from '../hooks/useTitulo.js';
import { verificarCertificado } from '../services/cursos.js';

const fmtFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/** /certificados: buscar por código. /certificados/:codigo: ver, verificar e imprimir. */
export default function Certificado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [buscar, setBuscar] = useState(codigo || '');
  const [cert, setCert] = useState(undefined); // undefined = cargando, null = no existe
  const [error, setError] = useState('');
  useTitulo(cert ? `Certificado de ${cert.nombre_alumno}` : 'Verificar certificado');

  useEffect(() => {
    if (!codigo) return;
    let activo = true;
    setCert(undefined);
    setError('');
    verificarCertificado(codigo)
      .then((c) => activo && setCert(c))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [codigo]);

  const formulario = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (buscar.trim()) navigate(`/certificados/${encodeURIComponent(buscar.trim().toUpperCase())}`);
      }}
      className="no-imprimir flex flex-wrap items-end gap-3"
    >
      <Field label="Código del certificado" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej.: 3F9A1C07B2" className="min-w-0 flex-[1_1_240px]" />
      <Button type="submit" variante="menta">Verificar</Button>
    </form>
  );

  return (
    <div className="container-page flex flex-col gap-7 py-10 sm:py-14 lg:pb-24">
      <div className="no-imprimir flex max-w-2xl flex-col gap-2.5">
        <h1 className="text-[clamp(34px,4.4vw,52px)] leading-[1.05]">Verificar certificado</h1>
        <p className="text-[17px] text-ink-muted">Ingresá el código que figura en el certificado para confirmar que es auténtico.</p>
      </div>
      {formulario}

      {codigo && error && <Aviso tono="error">{error}</Aviso>}
      {codigo && !error && cert === undefined && <p className="text-ink-muted">Buscando…</p>}
      {codigo && cert === null && (
        <Aviso tono="error">No encontramos un certificado con el código {codigo}. Revisá que esté bien escrito.</Aviso>
      )}

      {cert && (
        <>
          <Aviso tono="ok" className="no-imprimir">
            Certificado válido, emitido el {fmtFecha.format(new Date(cert.emitido_at))}.
          </Aviso>
          <article className="certificado relative overflow-hidden rounded-card border-2 border-borde bg-card">
            <div className="h-24 bg-amarillo sm:h-28">
              <Ondas lineas={[{ trazo: 'a', color: 'menta' }, { trazo: 'd', color: 'lavanda' }]} grosor={14} />
            </div>
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-16 sm:py-14">
              <img src="/img/logo-principal.png" alt="Felicitas, pediatría con propósito" width="900" height="363" className="h-14 w-auto" />
              <p className="eyebrow pt-4 text-menta-deep">Certificado de finalización</p>
              <p className="text-ink-muted">Se certifica que</p>
              <p className="font-display text-[clamp(30px,5vw,48px)] font-semibold leading-tight">{cert.nombre_alumno}</p>
              <p className="text-ink-muted">completó el curso</p>
              <p className="font-display text-[clamp(22px,3vw,30px)] font-semibold leading-snug">{cert.curso_titulo}</p>
              <p className="pt-2">{fmtFecha.format(new Date(cert.emitido_at))}</p>
              <div className="mt-6 flex flex-col items-center gap-1 border-t border-borde pt-4">
                <p className="font-bold">{CONTACTO.nombre}</p>
                <p className="text-sm text-ink-muted">Pediatra · {CONTACTO.matricula}</p>
              </div>
              <p className="pt-6 text-[13px] text-ink-muted">
                Código {cert.codigo} · Verificalo en {window.location.host}/certificados/{cert.codigo}
              </p>
            </div>
          </article>
          <div className="no-imprimir">
            <Button onClick={() => window.print()}>Imprimir o guardar en PDF</Button>
          </div>
        </>
      )}
    </div>
  );
}
