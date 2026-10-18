import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import PanelFormulario from '../components/ui/PanelFormulario.jsx';
import { useSesion } from '../context/Sesion.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { cambiarClave } from '../services/auth.js';

/** Elegir contraseña nueva: llega desde el enlace del email (que inicia sesión) o desde Mi cuenta. */
export default function NuevaClave() {
  useTitulo('Nueva contraseña');
  const { usuario, cargando } = useSesion();
  const navigate = useNavigate();
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (cargando) return <p className="container-page py-16 text-ink-muted">Cargando…</p>;

  if (!usuario) {
    return (
      <PanelFormulario titulo="El enlace venció" bajada="Por seguridad, los enlaces para cambiar la contraseña duran poco tiempo.">
        <Link to="/recuperar" className="self-start py-2 font-bold text-menta-deep underline">
          Pedir un enlace nuevo
        </Link>
      </PanelFormulario>
    );
  }

  async function enviar(e) {
    e.preventDefault();
    const err = {};
    if (clave.length < 8) err.clave = 'Usá al menos 8 caracteres.';
    if (repetir !== clave) err.repetir = 'Las contraseñas no coinciden.';
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    setError('');
    try {
      await cambiarClave(clave);
      navigate('/mi-cuenta', { replace: true, state: { aviso: 'Listo, cambiaste tu contraseña.' } });
    } catch (e2) {
      setError(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PanelFormulario titulo="Elegí una contraseña nueva" bajada={`Para ${usuario.email}.`}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <Field label="Contraseña nueva" type="password" value={clave} onChange={(e) => setClave(e.target.value)} error={errores.clave} autoComplete="new-password" ayuda="Mínimo 8 caracteres." />
        <Field label="Repetila" type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} error={errores.repetir} autoComplete="new-password" />
        {error && <Aviso tono="error">{error}</Aviso>}
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </PanelFormulario>
  );
}
