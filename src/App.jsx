import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import RequiereSesion from './components/layout/RequiereSesion.jsx';
import Acceso from './pages/Acceso.jsx';
import Arrepentimiento from './pages/Arrepentimiento.jsx';
import CancelarTurno from './pages/CancelarTurno.jsx';
import Certificado from './pages/Certificado.jsx';
import Curso from './pages/Curso.jsx';
import Cursos from './pages/Cursos.jsx';
import Inicio from './pages/Inicio.jsx';
import MiCuenta from './pages/MiCuenta.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import NuevaClave from './pages/NuevaClave.jsx';
import PagoDemo from './pages/PagoDemo.jsx';
import PagoResultado from './pages/PagoResultado.jsx';
import Privacidad from './pages/Privacidad.jsx';
import Recuperar from './pages/Recuperar.jsx';
import Terminos from './pages/Terminos.jsx';
import Turnos from './pages/Turnos.jsx';

// Panel de administración: se descarga solo al entrar (no pesa en el sitio público).
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminCursos = lazy(() => import('./pages/admin/AdminCursos.jsx'));
const AdminCurso = lazy(() => import('./pages/admin/AdminCurso.jsx'));
const AdminVentas = lazy(() => import('./pages/admin/AdminVentas.jsx'));
const AdminAlumnos = lazy(() => import('./pages/admin/AdminAlumnos.jsx'));
const AdminCupones = lazy(() => import('./pages/admin/AdminCupones.jsx'));
const AdminTurnos = lazy(() => import('./pages/admin/AdminTurnos.jsx'));
const AdminArrepentimientos = lazy(() => import('./pages/admin/AdminArrepentimientos.jsx'));
const AdminContenido = lazy(() => import('./pages/admin/AdminContenido.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="turnos" element={<Turnos />} />
        <Route path="turnos/cancelar" element={<CancelarTurno />} />
        <Route path="cursos" element={<Cursos />} />
        <Route path="cursos/:slug" element={<Curso />} />
        <Route path="ingresar" element={<Acceso modo="ingresar" />} />
        <Route path="crear-cuenta" element={<Acceso modo="crear" />} />
        <Route path="recuperar" element={<Recuperar />} />
        <Route path="nueva-clave" element={<NuevaClave />} />
        <Route path="mi-cuenta" element={<RequiereSesion><MiCuenta /></RequiereSesion>} />
        <Route path="pago/resultado" element={<PagoResultado />} />
        <Route path="pago/demo" element={<PagoDemo />} />
        <Route path="certificados" element={<Certificado />} />
        <Route path="certificados/:codigo" element={<Certificado />} />
        <Route path="privacidad" element={<Privacidad />} />
        <Route path="terminos" element={<Terminos />} />
        <Route path="arrepentimiento" element={<Arrepentimiento />} />
        <Route path="admin" element={<Suspense fallback={<p className="container-page py-16 text-ink-muted">Cargando…</p>}><AdminLayout /></Suspense>}>
          <Route index element={<Navigate to="cursos" replace />} />
          <Route path="cursos" element={<AdminCursos />} />
          <Route path="cursos/:id" element={<AdminCurso />} />
          <Route path="ventas" element={<AdminVentas />} />
          <Route path="alumnos" element={<AdminAlumnos />} />
          <Route path="cupones" element={<AdminCupones />} />
          <Route path="turnos" element={<AdminTurnos />} />
          <Route path="arrepentimientos" element={<AdminArrepentimientos />} />
          <Route path="contenido" element={<AdminContenido />} />
        </Route>
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
