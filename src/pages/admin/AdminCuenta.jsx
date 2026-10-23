import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { Panel } from '../../components/admin/ui.jsx';
import { useSesion } from '../../context/Sesion.jsx';
import { salir } from '../../services/auth.js';
import { MisDatos } from '../MiCuenta.jsx';

/** Datos de la cuenta del administrador, dentro del panel (en el encabezado solo figura "Panel"). */
export default function AdminCuenta() {
  const { usuario } = useSesion();
  const navigate = useNavigate();

  return (
    <Panel
      titulo="Mis datos"
      acciones={
        <Button
          variante="secundario"
          size="sm"
          onClick={async () => {
            await salir();
            navigate('/', { replace: true });
          }}
        >
          Cerrar sesión
        </Button>
      }
    >
      <p className="text-[15px] text-ink-muted">{usuario.email}</p>
      <MisDatos email={usuario.email} />
      <p className="text-sm text-ink-muted">
        Para ver el sitio como lo ve un alumno (tus cursos y certificados), entrá a <Link to="/mi-cuenta" className="font-semibold underline">Mi cuenta</Link>.
      </p>
    </Panel>
  );
}
