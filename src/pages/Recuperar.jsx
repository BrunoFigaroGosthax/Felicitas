import { useState } from 'react';
import { Link } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import PanelFormulario from '../components/ui/PanelFormulario.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { recuperarClave } from '../services/auth.js';

export default function Recuperar() {
  useTitulo('Recuperar contraseña');
  const [email, setEmail] = useState('');
  const [errorCampo, setErrorCampo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErrorCampo('Ingresá un email válido.');
    setErrorCampo('');
    setEnviando(true);
    setError('');
    try {
      await recuperarClave(email.trim());
      setEnviado(true);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PanelFormulario titulo="Recuperá tu contraseña" bajada="Te mandamos un enlace para que elijas una nueva.">
      {enviado ? (
        // Mismo mensaje exista o no la cuenta: no revela qué emails están registrados.
        <Aviso tono="ok">
          Si hay una cuenta con <strong>{email}</strong>, en unos minutos te llega el enlace. Revisá también el correo no deseado.
        </Aviso>
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
          <Field label="Email de tu cuenta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errorCampo} autoComplete="email" />
          {error && <Aviso tono="error">{error}</Aviso>}
          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}
      <Link to="/ingresar" className="self-start py-2 font-bold text-menta-deep underline">
        Volver a ingresar
      </Link>
    </PanelFormulario>
  );
}
