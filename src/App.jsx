import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import RequiereSesion from './components/layout/RequiereSesion.jsx';
import Acceso from './pages/Acceso.jsx';
import Arrepentimiento from './pages/Arrepentimiento.jsx';
import Certificado from './pages/Certificado.jsx';
import Curso from './pages/Curso.jsx';
import Cursos from './pages/Cursos.jsx';
import Inicio from './pages/Inicio.jsx';
import MiCuenta from './pages/MiCuenta.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import NuevaClave from './pages/NuevaClave.jsx';
import PagoResultado from './pages/PagoResultado.jsx';
import Privacidad from './pages/Privacidad.jsx';
import Recuperar from './pages/Recuperar.jsx';
import Terminos from './pages/Terminos.jsx';
import Turnos from './pages/Turnos.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="turnos" element={<Turnos />} />
        <Route path="cursos" element={<Cursos />} />
        <Route path="cursos/:slug" element={<Curso />} />
        <Route path="ingresar" element={<Acceso modo="ingresar" />} />
        <Route path="crear-cuenta" element={<Acceso modo="crear" />} />
        <Route path="recuperar" element={<Recuperar />} />
        <Route path="nueva-clave" element={<NuevaClave />} />
        <Route path="mi-cuenta" element={<RequiereSesion><MiCuenta /></RequiereSesion>} />
        <Route path="pago/resultado" element={<PagoResultado />} />
        <Route path="certificados" element={<Certificado />} />
        <Route path="certificados/:codigo" element={<Certificado />} />
        <Route path="privacidad" element={<Privacidad />} />
        <Route path="terminos" element={<Terminos />} />
        <Route path="arrepentimiento" element={<Arrepentimiento />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
