import { Link } from 'react-router-dom';
import PaginaLegal from '../components/layout/PaginaLegal.jsx';
import { RESPONSABLE } from '../data/legal.js';

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p>
        Esta política explica qué datos personales recolectamos en este sitio, para qué los usamos y cómo podés ejercer tus
        derechos, de acuerdo con la Ley 25.326 de Protección de los Datos Personales.
      </p>

      <h2>Quién es responsable de tus datos</h2>
      <p>
        {RESPONSABLE.nombre}, CUIT {RESPONSABLE.cuit}, con domicilio en {RESPONSABLE.domicilio}. Para cualquier consulta sobre tus
        datos, escribinos a {RESPONSABLE.email}.
      </p>

      <h2>Qué datos recolectamos</h2>
      <ul>
        <li>
          <strong>Al pedir un turno:</strong> nombre y fecha de nacimiento del paciente, nombre del adulto responsable, teléfono,
          email, obra social, motivo de consulta y, si lo escribís, un detalle de la consulta.
        </li>
        <li>
          <strong>Al crear una cuenta:</strong> nombre, email, contraseña (guardada cifrada; nadie puede verla) y, si lo cargás,
          teléfono.
        </li>
        <li>
          <strong>Al comprar un curso:</strong> qué curso compraste, el monto y el estado del pago. Los datos de tu tarjeta o medio
          de pago los procesa Mercado Pago: nosotros no los vemos ni los guardamos.
        </li>
        <li>
          <strong>Al usar los cursos:</strong> qué clases completaste, para que puedas retomar donde dejaste y obtener tu
          certificado.
        </li>
      </ul>

      <h2>Datos de salud y de menores</h2>
      <p>
        El motivo y el detalle de la consulta son datos de salud, y los del paciente suelen ser de un menor de edad. Los carga el
        adulto responsable y se usan solo para organizar la atención. Se envían al sistema de turnos del consultorio [DrApp] y no se
        guardan en la base de datos de este sitio, que conserva solo el día, el horario, el motivo general y los datos de contacto
        del adulto.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Reservar, confirmar y recordarte los turnos.</li>
        <li>Darte acceso a los cursos que compraste y guardar tu progreso.</li>
        <li>Emitir tus certificados y permitir que cualquiera verifique su autenticidad con el código.</li>
        <li>Enviarte emails necesarios del servicio (confirmaciones, recuperación de contraseña). No enviamos publicidad sin tu consentimiento.</li>
        <li>Cumplir obligaciones legales, como la facturación.</li>
      </ul>

      <h2>Con quién los compartimos</h2>
      <p>
        No vendemos ni cedemos tus datos. Para que el sitio funcione, los procesan estos proveedores, que actúan por cuenta nuestra
        y algunos tienen servidores fuera de la Argentina:
      </p>
      <ul>
        <li>[DrApp]: agenda de turnos del consultorio.</li>
        <li>Supabase: base de datos y cuentas de usuario.</li>
        <li>Vercel: alojamiento del sitio.</li>
        <li>Bunny: alojamiento de los videos y materiales de los cursos.</li>
        <li>Mercado Pago: procesamiento de pagos.</li>
        <li>[Proveedor de email]: envío de emails del servicio.</li>
      </ul>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        [Plazos de conservación: datos de cuenta mientras esté activa; registros de compras por el plazo que exija la normativa
        fiscal; registro de turnos por [N] meses.] Si eliminás tu cuenta, borramos tus datos personales, salvo los que la ley nos
        obligue a conservar, que quedan sin asociarse a vos.
      </p>

      <h2>Almacenamiento en tu navegador</h2>
      <p>
        Usamos el almacenamiento local del navegador solo para mantener tu sesión iniciada y, si no tenés cuenta, recordar tu
        progreso en los cursos gratuitos. No usamos cookies de publicidad.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir acceder a tus datos, rectificarlos, actualizarlos o suprimirlos escribiendo a {RESPONSABLE.email}. Respondemos los
        pedidos de acceso dentro de los 10 días corridos y los de rectificación o supresión dentro de los 5 días hábiles. Para
        borrar tu cuenta, pedilo por el mismo medio. Para dejar de recibir un tipo de email, respondé ese email.
      </p>
      <p className="rounded-bloque border border-borde p-4 text-[15px]">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a
        intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el
        artículo 14, inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control
        de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus
        derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
      </p>

      <h2>Cambios en esta política</h2>
      <p>
        Si la cambiamos, publicamos la versión nueva acá con su fecha. Si el cambio es importante, te avisamos por email. Ver
        también los <Link to="/terminos">términos y condiciones</Link>.
      </p>
    </PaginaLegal>
  );
}
