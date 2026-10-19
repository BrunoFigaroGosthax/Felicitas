import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import { BotonTexto, Estado, Etiqueta, Panel, Tabla, fecha, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { borrarCupon, cambiarCupon, crearCupon, listarCupones, listarCursosAdmin } from '../../services/admin.js';
import { pesos } from '../../services/formato.js';

const VACIO = { codigo: '', descripcion: '', tipo: 'porcentaje', valor: '', curso_id: '', valido_hasta: '', usos_maximos: '', usos_por_usuario: '1' };

async function cargar() {
  const [cupones, cursos] = await Promise.all([listarCupones(), listarCursosAdmin()]);
  return { cupones, cursos: cursos.filter((c) => Number(c.precio) > 0) };
}

const vencido = (c) => c.valido_hasta && new Date(c.valido_hasta) < new Date();

export default function AdminCupones() {
  const { datos, error, cargando, recargar } = useCarga(cargar);
  const [d, setD] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const { ocupado, error: errorAccion, accion } = useAccion();
  const set = (campo) => (e) => setD({ ...d, [campo]: e.target.value });

  async function crear(e) {
    e.preventDefault();
    const err = {};
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(d.codigo.trim())) err.codigo = 'Entre 3 y 30 letras, números, guiones.';
    const valor = Number(d.valor);
    if (!(valor > 0) || (d.tipo === 'porcentaje' && valor > 100)) err.valor = d.tipo === 'porcentaje' ? 'Entre 1 y 100.' : 'Mayor que 0.';
    setErrores(err);
    if (Object.keys(err).length) return;
    if (await accion(() => crearCupon(d))) {
      setD(VACIO);
      recargar();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel titulo="Nuevo cupón">
        <form onSubmit={crear} noValidate className="flex flex-col gap-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
            <Field label="Código" value={d.codigo} onChange={set('codigo')} error={errores.codigo} placeholder="Ej.: BIENVENIDA15" ayuda="Se guarda en mayúsculas." />
            <Field label="Tipo" as="select" value={d.tipo} onChange={set('tipo')}>
              <option value="porcentaje">Porcentaje</option>
              <option value="monto">Monto fijo en pesos</option>
            </Field>
            <Field label={d.tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento ($)'} type="number" min="1" value={d.valor} onChange={set('valor')} error={errores.valor} />
            <Field label="Curso" as="select" value={d.curso_id} onChange={set('curso_id')}>
              <option value="">Todos los cursos pagos</option>
              {(datos?.cursos || []).map((c) => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </Field>
            <Field label="Vence (opcional)" type="date" value={d.valido_hasta} onChange={set('valido_hasta')} />
            <Field label="Usos en total (opcional)" type="number" min="1" value={d.usos_maximos} onChange={set('usos_maximos')} ayuda="Vacío = sin límite." />
            <Field label="Usos por persona" type="number" min="1" value={d.usos_por_usuario} onChange={set('usos_por_usuario')} ayuda="Vacío = sin límite." />
          </div>
          <Field label="Nota interna (opcional)" value={d.descripcion} onChange={set('descripcion')} placeholder="Ej.: sorteo de Instagram de octubre" />
          {errorAccion && <Aviso tono="error">{errorAccion}</Aviso>}
          <div>
            <Button type="submit" disabled={ocupado}>Crear cupón</Button>
          </div>
        </form>
      </Panel>

      <Panel titulo="Cupones">
        <Estado cargando={cargando} error={error}>
          <Tabla
            filas={datos?.cupones || []}
            clave={(c) => c.id}
            vacio="Todavía no hay cupones."
            columnas={[
              {
                titulo: 'Código',
                render: (c) => (
                  <span className="flex flex-col">
                    <strong>{c.codigo}</strong>
                    {c.descripcion && <span className="text-sm text-ink-muted">{c.descripcion}</span>}
                  </span>
                ),
              },
              { titulo: 'Descuento', render: (c) => (c.tipo === 'porcentaje' ? `${Number(c.valor)} %` : pesos(Number(c.valor))) },
              { titulo: 'Curso', render: (c) => c.cursos?.titulo || 'Todos' },
              { titulo: 'Vence', render: (c) => (c.valido_hasta ? fecha(c.valido_hasta) : '—') },
              { titulo: 'Usos', render: (c) => `${c.usos}${c.usos_maximos ? ` de ${c.usos_maximos}` : ''}` },
              {
                titulo: 'Estado',
                render: (c) =>
                  vencido(c) ? <Etiqueta tono="neutro">Vencido</Etiqueta> : c.activo ? <Etiqueta tono="ok">Activo</Etiqueta> : <Etiqueta tono="pendiente">Pausado</Etiqueta>,
              },
              {
                titulo: 'Acciones',
                render: (c) => (
                  <span className="flex flex-wrap">
                    <BotonTexto disabled={ocupado} onClick={async () => (await accion(() => cambiarCupon(c.id, { activo: !c.activo }))) && recargar()}>
                      {c.activo ? 'Pausar' : 'Activar'}
                    </BotonTexto>
                    {c.usos === 0 && (
                      <BotonTexto peligro disabled={ocupado} onClick={async () => window.confirm(`¿Borrar el cupón ${c.codigo}?`) && (await accion(() => borrarCupon(c.id))) && recargar()}>
                        Borrar
                      </BotonTexto>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </Estado>
      </Panel>
    </div>
  );
}
