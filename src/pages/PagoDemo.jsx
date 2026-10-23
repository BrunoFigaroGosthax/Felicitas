import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button, { ButtonLink } from '../components/ui/Button.jsx';
import { useSesion } from '../context/Sesion.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { obtenerCompraDemo, resolverPagoDemo } from '../services/cursos.js';
import { pesos } from '../services/formato.js';

/**
 * Pago de demostración: reemplaza a Mercado Pago mientras no estén sus credenciales (PAGOS_DEMO=true).
 * No pide datos de tarjeta ni cobra nada; la compra recorre el mismo camino que una real.
 */
export default function PagoDemo() {
  useTitulo('Pago de demostración');
  const [params] = useSearchParams();
  const id = params.get('compra') || '';
  const { usuario, cargando } = useSesion();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [compra, setCompra] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!usuario || !id) return;
    let activo = true;
    obtenerCompraDemo(id)
      .then((c) => activo && setCompra(c))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [usuario, id]);

  if (cargando) return <p className="container-page py-16 text-ink-muted">Cargando…</p>;
  if (!usuario) return <Navigate to={`/ingresar?volver=${encodeURIComponent(pathname + search)}`} replace />;

  async function resolver(aprobado) {
    setEnviando(true);
    setError('');
    try {
      const r = await resolverPagoDemo(id, aprobado);
      navigate(`/pago/resultado?estado=${r.estado === 'aprobada' ? 'aprobado' : 'rechazado'}&curso=${encodeURIComponent(r.curso)}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="container-page flex justify-center py-12 sm:py-20 lg:pb-28">
      <div className="flex w-full max-w-[520px] flex-col gap-5 rounded-card border-2 border-dashed border-lavanda-deep bg-card p-6 sm:p-10">
        <p className="eyebrow text-menta-deep">Modo demostración</p>
        <h1 className="text-[clamp(28px,4vw,36px)] leading-tight">Pago de demostración</h1>
        <Aviso>
          Este sitio todavía no cobra. Esta pantalla reemplaza al pago real para poder probar la compra completa: no se piden datos de
          tarjeta ni se cobra nada.
        </Aviso>

        {!compra && !error && <p className="text-ink-muted">Cargando la compra…</p>}

        {compra && (
          <>
            <dl className="flex flex-col gap-3 rounded-bloque bg-amarillo p-5">
              <div>
                <dt className="text-[13px] font-semibold text-ink-muted">Curso</dt>
                <dd className="mt-0.5 font-bold">{compra.cursos?.titulo}</dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold text-ink-muted">Total</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-[30px] font-semibold">{pesos(Number(compra.monto))}</span>
                  {Number(compra.descuento) > 0 && <s className="text-ink-muted">{pesos(Number(compra.precio_lista))}</s>}
                </dd>
              </div>
            </dl>
            {compra.estado === 'pendiente' ? (
              <div className="flex flex-col gap-3">
                <Button size="lg" variante="menta" className="w-full" disabled={enviando} onClick={() => resolver(true)}>
                  {enviando ? 'Un momento…' : 'Simular pago aprobado'}
                </Button>
                <Button variante="secundario" className="w-full" disabled={enviando} onClick={() => resolver(false)}>
                  Simular pago rechazado
                </Button>
              </div>
            ) : (
              <>
                <Aviso>Esta compra ya está {compra.estado}.</Aviso>
                <ButtonLink to={`/cursos/${compra.cursos?.slug}`}>Ir al curso</ButtonLink>
              </>
            )}
          </>
        )}
        {error && <Aviso tono="error">{error}</Aviso>}
      </div>
    </div>
  );
}
