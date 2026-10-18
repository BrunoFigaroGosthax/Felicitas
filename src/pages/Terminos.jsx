import { Link } from 'react-router-dom';
import PaginaLegal from '../components/layout/PaginaLegal.jsx';
import { RESPONSABLE } from '../data/legal.js';

export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos y condiciones">
      <p>
        Estos términos regulan el uso de este sitio, la reserva de turnos y la compra de cursos. Al usar el sitio o crear una
        cuenta, los aceptás. El sitio pertenece a {RESPONSABLE.nombre}, CUIT {RESPONSABLE.cuit}, domicilio {RESPONSABLE.domicilio}.
      </p>

      <h2>La información del sitio no reemplaza la consulta</h2>
      <p>
        Los contenidos y cursos son educativos y de orientación general para familias. No son un diagnóstico ni reemplazan la
        consulta médica: cada niño o niña necesita una evaluación personal. Ante una urgencia, acudí a la guardia más cercana.
      </p>

      <h2>Turnos</h2>
      <ul>
        <li>El turno queda reservado cuando lo confirma el sistema y te llega la confirmación.</li>
        <li>Si no podés asistir, avisá con al menos 24 horas de anticipación. [Política ante ausencias sin aviso.]</li>
        <li>[Condiciones de obras sociales, coseguros y consultas particulares.]</li>
      </ul>

      <h2>Cuenta</h2>
      <p>
        Para comprar cursos necesitás una cuenta personal. Sos responsable de mantener tu contraseña en reserva. La cuenta es
        individual: no se comparte.
      </p>

      <h2>Cursos</h2>
      <ul>
        <li>
          Al comprar un curso obtenés una licencia personal e intransferible para verlo desde tu cuenta [de por vida, mientras el
          sitio esté en funcionamiento]. No está permitido descargar los videos, ni compartir, revender o publicar los contenidos.
        </li>
        <li>Los cursos gratuitos se pueden ver sin cuenta; para guardar el progreso hace falta una.</li>
        <li>
          Los cursos que otorgan certificado lo emiten al completar todas las clases. El certificado acredita que realizaste el
          curso; no es un título ni una habilitación profesional.
        </li>
      </ul>

      <h2>Precios y pagos</h2>
      <ul>
        <li>Los precios están en pesos argentinos e incluyen impuestos [según la condición fiscal del vendedor].</li>
        <li>Los pagos se procesan con Mercado Pago. El acceso se habilita cuando el pago se acredita.</li>
        <li>Los códigos de descuento tienen las condiciones de uso y vigencia que se informen en cada caso, y no son acumulables.</li>
        <li>Emitimos la factura correspondiente a cada compra. [Cómo y cuándo se envía.]</li>
      </ul>

      <h2>Derecho de arrepentimiento</h2>
      <p>
        Podés revocar la compra dentro de los 10 días corridos desde que la hiciste, sin dar motivos y sin costo, desde el{' '}
        <Link to="/arrepentimiento">botón de arrepentimiento</Link>. Te devolvemos el importe por el mismo medio de pago y se da de
        baja el acceso al curso. [Revisar con un abogado el alcance de la excepción del art. 1116 del Código Civil y Comercial para
        contenidos digitales ya accedidos.]
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        Los textos, videos, materiales, marca y diseño del sitio pertenecen a {RESPONSABLE.nombre} o se usan con autorización. No
        se pueden reproducir sin permiso escrito.
      </p>

      <h2>Datos personales</h2>
      <p>
        El tratamiento de tus datos se explica en la <Link to="/privacidad">política de privacidad</Link>.
      </p>

      <h2>Cambios y ley aplicable</h2>
      <p>
        Podemos actualizar estos términos; la versión vigente es la publicada en esta página. Rigen las leyes de la República
        Argentina. Ante cualquier conflicto, son competentes los tribunales de {RESPONSABLE.jurisdiccion}, sin perjuicio de los
        derechos que te reconoce la Ley 24.240 de Defensa del Consumidor.
      </p>
    </PaginaLegal>
  );
}
