import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Registro from './pages/Registro';
import Login from './pages/Login';
import RecuperarPassword from './pages/RecuperarPassword';
import ResetPassword from './pages/ResetPassword';
import CuentaEliminada from './pages/CuentaEliminada';
import Dashboard from './pages/Dashboard';
import PerfilUsuario from './pages/PerfilUsuario';
import ListaEventos from './components/dashboard/eventos/ListaEventos';
import FormularioEvento from './components/dashboard/eventos/FormularioEvento';
import Eventos from './pages/Eventos';
import Eventos from './pages/Recuperar';
import PerfilPage from "./pages/perfil";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-password" element={<RecuperarPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/cuenta-eliminada" element={<CuentaEliminada />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/perfil" element={<PerfilUsuario />} />
            <Route path="/dashboard/eventos" element={<ExplorarEventos />} />
            <Route path="/dashboard/evento/:id" element={<DetalleEvento />} />
            <Route path="/dashboard/mis-eventos" element={<ListaEventos />} />
            <Route path="/dashboard/crear-evento" element={<FormularioEvento />} />
            <Route path="/dashboard/evento/:id/editar" element={<FormularioEvento />} />
            <Route path="/Eventos" element={<Eventos />} />
            <Route path="/Recuperar" element={<Recuperar />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;