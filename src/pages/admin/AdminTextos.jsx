import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import { BotonTexto, Estado, Etiqueta, Panel, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { CONTACTO, SEDES, TEXTOS_INICIO } from '../../data/contenido.js';
import { emailValido, lineas, normalizarInstagram, normalizarWhatsapp } from '../../lib/textos.js';
import { guardarTextos, leerTextos } from '../../services/admin.js';

// Campos de cada formulario. `aTexto` / `deTexto`: para valores que no son texto (horarios = una línea cada uno).
const CAMPOS_INICIO = [
  { clave: 'titulo', label: 'Título de la portada', requerido: true },
  { clave: 'bajada', label: 'Texto de la portada', as: 'textarea', requerido: true },
  { clave: 'sobreMiTitulo', label: 'Título de "Sobre mí"', requerido: true },
  { clave: 'sobreMi', label: 'Texto de "Sobre mí"', as: 'textarea', rows: 8, requerido: true, ayuda: 'Separá los párrafos con una línea en blanco. El primero se ve más grande.' },
];

const CAMPOS_CONTACTO = [
  {
    clave: 'whatsapp',
    label: 'WhatsApp',
    ayuda: 'Con código de área, sin 0 ni 15. Ej.: 299 462-4870.',
    validar: (v) => (normalizarWhatsapp(v) ? '' : 'Revisá el número: tienen que ser 10 dígitos con el código de área.'),
  },
  { clave: 'email', label: 'Email', type: 'email', validar: (v) => (emailValido(v) ? '' : 'Ingresá un email válido.') },
  { clave: 'instagram', label: 'Instagram', ayuda: 'El usuario, con o sin @.', validar: (v) => (normalizarInstagram(v) ? '' : 'Revisá el usuario: solo letras, números, puntos y guiones bajos.') },
];

const CAMPOS_SEDE = [
  { clave: 'nombre', label: 'Nombre', requerido: true },
  { clave: 'direccion', label: 'Dirección', requerido: true, ayuda: 'Con la ciudad: se usa también para el botón "Cómo llegar".' },
  {
    clave: 'horarios',
    label: 'Horarios',
    as: 'textarea',
    requerido: true,
    ayuda: 'Uno por línea. Ej.: Martes de 17 a 21 h',
    aTexto: (v) => v.join('\n'),
    deTexto: lineas,
  },
  { clave: 'pacientes', label: 'A quién atiende', requerido: true },
];

/** Textos del sitio que la administradora puede cambiar. Se guarda solo lo que difiere de los originales. */
export default function AdminTextos() {
  const { datos, error, cargando } = useCarga(leerTextos);
  const [guardados, setGuardados] = useState(null);
  const textos = guardados || datos || {};
  const guardar = (seccion) => async (valor) => setGuardados(await guardarTextos(seccion, valor));

  return (
    <Estado cargando={cargando} error={error}>
      <div className="flex flex-col gap-6">
        <Formulario
          titulo="Inicio"
          descripcion={'La portada (lo primero que se ve) y la sección "Sobre mí".'}
          campos={CAMPOS_INICIO}
          originales={TEXTOS_INICIO}
          guardados={textos.inicio}
          onGuardar={guardar('inicio')}
        />
        <Formulario
          titulo="Contacto"
          descripcion="Aparece en el pie de todas las páginas, en el aviso de mantenimiento y en los botones de WhatsApp."
          campos={CAMPOS_CONTACTO}
          originales={CONTACTO}
          guardados={textos.contacto}
          onGuardar={guardar('contacto')}
        />
        <Panel titulo="Dónde atiendo">
          <p className="text-[15px] text-ink-muted">Aparece en el inicio, en el pie de todas las páginas y en la página de turnos.</p>
          <Aviso>
            Esto cambia solo los textos. Los turnos online siguen ofreciendo los días y horarios de la agenda de DrApp: si cambia el horario de
            CIEV, avisá para actualizar también la agenda.
          </Aviso>
          {SEDES.map((sede) => (
            <Formulario
              key={sede.id}
              anidado
              titulo={sede.nombre}
              campos={CAMPOS_SEDE}
              originales={sede}
              guardados={textos.sedes?.[sede.id]}
              onGuardar={(valor) => {
                const sedes = { ...textos.sedes };
                if (valor) sedes[sede.id] = valor;
                else delete sedes[sede.id];
                return guardar('sedes')(sedes);
              }}
            />
          ))}
        </Panel>
      </div>
    </Estado>
  );
}

const aTexto = (campo, valor) => (campo.aTexto ? campo.aTexto(valor) : valor ?? '');

/** Formulario de una sección: muestra los textos actuales, guarda solo lo cambiado respecto de los originales. */
function Formulario({ titulo, descripcion, campos, originales, guardados, onGuardar, anidado = false }) {
  const actuales = () => Object.fromEntries(campos.map((c) => [c.clave, aTexto(c, guardados?.[c.clave] ?? originales[c.clave])]));
  const [valores, setValores] = useState(actuales);
  const [errores, setErrores] = useState({});
  const [listo, setListo] = useState('');
  const { ocupado, error, accion } = useAccion();
  const personalizado = guardados && Object.keys(guardados).length > 0;

  const set = (clave) => (e) => {
    setListo('');
    setValores({ ...valores, [clave]: e.target.value });
  };

  const enviar = async (e) => {
    e.preventDefault();
    const err = {};
    for (const c of campos) {
      const v = valores[c.clave].trim();
      if (!v && c.requerido !== false) err[c.clave] = 'Completá este campo (o usá "Volver a los originales").';
      else if (c.validar) err[c.clave] = c.validar(v);
    }
    Object.keys(err).forEach((k) => !err[k] && delete err[k]);
    setErrores(err);
    if (Object.keys(err).length) return;

    // Solo lo que difiere del original: si mañana cambia el texto original en el código, lo demás se actualiza solo.
    const cambios = {};
    for (const c of campos) {
      const v = c.deTexto ? c.deTexto(valores[c.clave]) : valores[c.clave].trim();
      if (JSON.stringify(v) !== JSON.stringify(originales[c.clave])) cambios[c.clave] = v;
    }
    if (await accion(() => onGuardar(Object.keys(cambios).length ? cambios : null))) setListo('Listo: ya se ve en el sitio.');
  };

  const restaurar = async () => {
    if (await accion(() => onGuardar(null))) {
      setValores(Object.fromEntries(campos.map((c) => [c.clave, aTexto(c, originales[c.clave])])));
      setErrores({});
      setListo('Listo: volvieron los textos originales.');
    }
  };

  const contenido = (
    <form className="flex flex-col gap-4" onSubmit={enviar} noValidate>
      {descripcion && <p className="text-[15px] text-ink-muted">{descripcion}</p>}
      {campos.map((c) => (
        <Field
          key={c.clave}
          label={c.label}
          as={c.as}
          type={c.type}
          rows={c.rows}
          ayuda={c.ayuda}
          value={valores[c.clave]}
          onChange={set(c.clave)}
          error={errores[c.clave]}
        />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar'}
        </Button>
        {personalizado && (
          <BotonTexto disabled={ocupado} onClick={restaurar}>
            Volver a los originales
          </BotonTexto>
        )}
      </div>
      {listo && <Aviso tono="ok">{listo}</Aviso>}
      {error && <Aviso tono="error">{error}</Aviso>}
    </form>
  );

  const etiqueta = personalizado ? <Etiqueta tono="info">Modificado</Etiqueta> : <Etiqueta>Original</Etiqueta>;
  if (anidado) {
    return (
      <section className="flex flex-col gap-4 border-t border-borde pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl leading-tight">{titulo}</h3>
          {etiqueta}
        </div>
        {contenido}
      </section>
    );
  }
  return (
    <Panel titulo={titulo} acciones={etiqueta}>
      {contenido}
    </Panel>
  );
}
