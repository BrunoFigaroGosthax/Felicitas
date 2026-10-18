import { useState } from 'react';
import { Link } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { enviarArrepentimiento } from '../services/contenido.js';

// Botón de arrepentimiento (Res. 424/2020): sin registro previo, con código de seguimiento.
export default function Arrepentimiento() {
  useTitulo('Botón de arrepentimiento');
  const [datos, setDatos] = useState({ nombre: '', email: '', telefono: '', compra: '', detalle: '' });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState('');

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    const err = {};
    if (!datos.nombre.trim()) err.nombre = 'Escribí tu nombre y apellido.';
    if (!/^\S+@\S+\.\S+$/.test(datos.email)) err.email = 'Ingresá el email con el que compraste.';
    if (!datos.compra.trim()) err.compra = 'Contanos qué compraste y cuándo.';
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    setError('');
    try {
      const r = await enviarArrepentimiento(datos);
      setCodigo(r.codigo);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container-page flex flex-col gap-7 py-10 sm:py-14 lg:pb-24">
      <div className="flex max-w-2xl flex-col gap-2.5">
        <h1 className="text-[clamp(34px,4.4vw,52px)] leading-[1.05]">Botón de arrepentimiento</h1>
        <p className="text-[17px] text-ink-muted">
          Tenés 10 días corridos desde la compra para revocarla, sin dar motivos y sin costo. Completá el formulario y te
          respondemos dentro de las 24 horas. Más información en los <Link to="/terminos" className="underline">términos y condiciones</Link>.
        </p>
      </div>

      <section className="max-w-[720px] rounded-card border border-borde bg-card p-5 sm:p-10">
        {codigo ? (
          <div className="flex flex-col items-start gap-3" role="status">
            <h2 className="text-[28px] leading-tight">Recibimos tu solicitud</h2>
            <p className="text-[17px]">
              Tu código de seguimiento es <strong className="font-display text-[22px]">{codigo}</strong>. Te mandamos una copia por
              email y te respondemos dentro de las 24 horas.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
              <Field label="Nombre y apellido" value={datos.nombre} onChange={set('nombre')} error={errores.nombre} autoComplete="name" />
              <Field label="Email" type="email" value={datos.email} onChange={set('email')} error={errores.email} autoComplete="email" ayuda="El que usaste para comprar." />
              <Field label="Teléfono (opcional)" type="tel" value={datos.telefono} onChange={set('telefono')} autoComplete="tel" />
            </div>
            <Field label="¿Qué compra querés revocar?" value={datos.compra} onChange={set('compra')} error={errores.compra} placeholder="Ej.: curso Adolescencia, comprado el 3 de octubre" />
            <Field label="Comentarios (opcional)" as="textarea" rows={3} value={datos.detalle} onChange={set('detalle')} />
            {error && <Aviso tono="error">{error}</Aviso>}
            <div>
              <Button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
