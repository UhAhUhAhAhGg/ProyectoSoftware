import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Registro from './pages/Registro';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ListaEventos from './components/dashboard/eventos/ListaEventos';
import FormularioEvento from './components/dashboard/eventos/FormularioEvento';
import Eventos from './pages/Eventos';
import Eventos from './pages/Recuperar';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/mis-eventos" element={<ListaEventos />} />
            <Route path="/dashboard/crear-evento" element={<FormularioEvento />} />
            <Route path="/dashboard/evento/:id/editar" element={<FormularioEvento />} />
            <Route path="/Eventos" element={<Eventos />} />
            <Route path="/Recuperar" element={<Recuperar />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;