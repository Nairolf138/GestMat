import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from 'react-router-dom';
import Login from './Login';
import Equipments from './Equipments';
import Loans from './Loans';

const token = () => localStorage.getItem('token');

function Private({ children }) {
  return token() ? children : <Navigate to="/login" replace />;
}

function NavBar() {
  const navigate = useNavigate();
  if (!token()) return null;
  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  return (
    <nav>
      <Link to="/">Équipements</Link> |{' '}
      <Link to="/loans">Prêts</Link> |{' '}
      <button onClick={logout}>Déconnexion</button>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Private><Equipments /></Private>} />
        <Route path="/loans" element={<Private><Loans /></Private>} />
      </Routes>
    </Router>
  );
}

export default App;
