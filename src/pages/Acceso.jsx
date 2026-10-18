import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { destinoSeguro } from '../components/layout/RequiereSesion.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import Button from '../components/ui/Button.jsx';
import Casilla from '../components/ui/Casilla.jsx';
import Field from '../components/ui/Field.jsx';
import PanelFormulario from '../components/ui/PanelFormulario.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { ingresar, modoDemo, registrarse } from '../services/auth.js';

const esEmail = (s) => /^\S+@\S+\.\S+$/.test(s);

/** Ingresar (/ingresar) y crear cuenta (/crear-cuenta). Ambas respetan ?volver=/ruta. */
export default function Acceso({ modo }) {
  const crear = modo === 'crear';
  useTitulo(crear ? 'Crear cuenta' : 'Ingresar');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const volver = params.get('volver');
  const conVolver = (ruta) => (volver ? `${ruta}?volver=${encodeURIComponent(volver)}` : ruta);

  const [datos, setDatos] = useState({ nombre: '', email: '', clave: '', acepta: false });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e?.target ? e.target.value : e }));

  async function enviar(e) {
    e.preventDefault();
    const err = {};
    if (crear && !datos.nombre.trim()) err.nombre = 'Escribí tu nombre y apellido.';
    if (!esEmail(datos.email)) err.email = 'Ingresá un email válido.';
    if (crear ? datos.clave.length < 8 : !datos.clave) err.clave = crear ? 'Usá al menos 8 caracteres.' : 'Escribí tu contraseña.';
    if (crear && !datos.acepta) err.acepta = 'Para crear la cuenta tenés que aceptar los términos y la política de privacidad.';
    setErrores(err);
    if (Object.keys(err).length) return;

    setEnviando(true);
    setError('');
    try {
      if (crear) {
        const { confirmarEmail } = await registrarse({ nombre: datos.nombre.trim(), email: datos.email.trim(), clave: datos.clave });
        if (confirmarEmail) return setConfirmar(true);
      } else {
        await ingresar({ email: datos.email.trim(), clave: datos.clave });
      }
      navigate(destinoSeguro(volver), { replace: true });
    } catch (e2) {
      setError(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  if (confirmar) {
    return (
      <PanelFormulario titulo="Revisá tu email">
        <p>
          Te mandamos un enlace a <strong>{datos.email}</strong> para confirmar tu cuenta. Si no lo ves en unos minutos,
          buscalo en el correo no deseado.
        </p>
        <Link to={conVolver('/ingresar')} className="font-bold text-menta-deep underline">
          Ya la confirmé: ingresar
        </Link>
      </PanelFormulario>
    );
  }

  return (
    <PanelFormulario
      titulo={crear ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}
      bajada={crear ? 'Para comprar cursos y guardar tu progreso en cualquier dispositivo.' : 'Para ver tus cursos y retomar donde dejaste.'}
    >
      {modoDemo && <Aviso>Modo de prueba: funciona con cualquier email y contraseña.</Aviso>}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {crear && (
          <Field label="Nombre y apellido" value={datos.nombre} onChange={set('nombre')} error={errores.nombre} autoComplete="name" ayuda="Es el que va a figurar en tus certificados." />
        )}
        <Field label="Email" type="email" value={datos.email} onChange={set('email')} error={errores.email} autoComplete="email" />
        <Field
          label="Contraseña"
          type="password"
          value={datos.clave}
          onChange={set('clave')}
          error={errores.clave}
          autoComplete={crear ? 'new-password' : 'current-password'}
          ayuda={crear ? 'Mínimo 8 caracteres.' : undefined}
        />
        {!crear && (
          <Link to="/recuperar" className="-mt-2 self-start py-2 text-sm font-bold text-menta-deep underline">
            Olvidé mi contraseña
          </Link>
        )}
        {crear && (
          <Casilla checked={datos.acepta} onChange={set('acepta')} error={errores.acepta}>
            Acepto los{' '}
            <Link to="/terminos" target="_blank" className="font-bold underline">términos y condiciones</Link> y la{' '}
            <Link to="/privacidad" target="_blank" className="font-bold underline">política de privacidad</Link>.
          </Casilla>
        )}
        {error && <Aviso tono="error">{error}</Aviso>}
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Un momento…' : crear ? 'Crear cuenta' : 'Ingresar'}
        </Button>
      </form>
      <p className="border-t border-borde pt-5 text-center">
        {crear ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
        <Link to={conVolver(crear ? '/ingresar' : '/crear-cuenta')} className="font-bold text-menta-deep underline">
          {crear ? 'Ingresá' : 'Creá una'}
        </Link>
      </p>
    </PanelFormulario>
  );
}
