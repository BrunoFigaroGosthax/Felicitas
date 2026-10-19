import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import { BotonTexto, Estado, Etiqueta, Panel, Tabla, fecha, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { darAcceso, listarAccesos, listarCursosAdmin, listarUsuarios, quitarAcceso } from '../../services/admin.js';

async function cargar() {
  const [usuarios, accesos, cursos] = await Promise.all([listarUsuarios(), listarAccesos(), listarCursosAdmin()]);
  const ahora = new Date();
  const activos = accesos.filter((a) => !a.revocado_at && (!a.vence_at || new Date(a.vence_at) > ahora));
  return {
    cursosPagos: cursos.filter((c) => Number(c.precio) > 0),
    usuarios: usuarios.map((u) => ({ ...u, accesos: activos.filter((a) => a.usuario_id === u.id) })),
  };
}

export default function AdminAlumnos() {
  const { datos, error, cargando, recargar } = useCarga(cargar);
  const [buscar, setBuscar] = useState('');
  const [nuevo, setNuevo] = useState({ email: '', cursoId: '' });
  const { ocupado, error: errorAccion, accion } = useAccion();
  const [ok, setOk] = useState('');

  const q = buscar.trim().toLowerCase();
  const visibles = (datos?.usuarios || []).filter((u) => !q || `${u.email} ${u.nombre || ''}`.toLowerCase().includes(q));

  async function dar(e) {
    e.preventDefault();
    setOk('');
    const usuario = datos.usuarios.find((u) => u.email.toLowerCase() === nuevo.email.trim().toLowerCase());
    const hecho = await accion(async () => {
      if (!usuario) throw new Error('No hay ninguna cuenta con ese email. La persona tiene que registrarse primero.');
      if (!nuevo.cursoId) throw new Error('Elegí el curso.');
      await darAcceso(usuario.id, nuevo.cursoId);
    });
    if (hecho) {
      setOk(`Listo: ${usuario.email} ya tiene acceso.`);
      setNuevo({ email: '', cursoId: '' });
      recargar();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel titulo="Dar acceso a un curso">
        <p className="text-[15px] text-ink-muted">Para regalar un curso o resolver un problema de pago. La persona tiene que tener cuenta.</p>
        <form onSubmit={dar} className="flex flex-wrap items-end gap-4">
          <Field label="Email de la cuenta" type="email" list="emails-alumnos" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} className="min-w-0 flex-[2_1_260px]" />
          <datalist id="emails-alumnos">
            {(datos?.usuarios || []).map((u) => (
              <option key={u.id} value={u.email} />
            ))}
          </datalist>
          <Field label="Curso" as="select" value={nuevo.cursoId} onChange={(e) => setNuevo({ ...nuevo, cursoId: e.target.value })} className="min-w-0 flex-[2_1_240px]">
            <option value="">Elegí un curso</option>
            {(datos?.cursosPagos || []).map((c) => (
              <option key={c.id} value={c.id}>{c.titulo}</option>
            ))}
          </Field>
          <Button type="submit" variante="menta" disabled={ocupado}>Dar acceso</Button>
        </form>
        {errorAccion && <Aviso tono="error">{errorAccion}</Aviso>}
        {ok && <Aviso tono="ok">{ok}</Aviso>}
      </Panel>

      <Panel titulo={`Alumnos${datos ? ` (${datos.usuarios.length})` : ''}`}>
        <Estado cargando={cargando} error={error}>
          <Field label="Buscar por email o nombre" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} className="max-w-md" />
          <Tabla
            filas={visibles}
            clave={(u) => u.id}
            vacio="No hay alumnos con esa búsqueda."
            columnas={[
              {
                titulo: 'Alumno',
                render: (u) => (
                  <span className="flex flex-col">
                    <strong className="break-all">{u.email}</strong>
                    <span className="text-sm text-ink-muted">{u.nombre || 'Sin nombre'}{u.telefono ? ` · ${u.telefono}` : ''}</span>
                  </span>
                ),
              },
              { titulo: 'Alta', render: (u) => fecha(u.creado_at) },
              { titulo: 'Rol', render: (u) => (u.rol === 'admin' ? <Etiqueta tono="info">Admin</Etiqueta> : 'Alumno') },
              {
                titulo: 'Cursos pagos',
                render: (u) =>
                  u.accesos.length ? (
                    <ul className="flex flex-col gap-1">
                      {u.accesos.map((a) => (
                        <li key={a.curso_id} className="flex flex-wrap items-center gap-1">
                          <span>{a.cursos?.titulo}</span>
                          {a.origen === 'manual' && <Etiqueta>regalo</Etiqueta>}
                          <BotonTexto
                            peligro
                            disabled={ocupado}
                            onClick={async () =>
                              window.confirm(`¿Quitar el acceso de ${u.email} a "${a.cursos?.titulo}"?`) && (await accion(() => quitarAcceso(u.id, a.curso_id))) && recargar()
                            }
                          >
                            Quitar
                          </BotonTexto>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  ),
              },
            ]}
          />
        </Estado>
      </Panel>
    </div>
  );
}
