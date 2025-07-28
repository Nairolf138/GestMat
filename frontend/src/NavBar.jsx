import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav style={{ marginBottom: '1em' }}>
      <Link to="/">Équipements</Link> |
      <Link to="/structures" style={{ marginLeft: '0.5em' }}>Structures</Link> |
      <Link to="/users" style={{ marginLeft: '0.5em' }}>Utilisateurs</Link> |
      <Link to="/loans" style={{ marginLeft: '0.5em' }}>Prêts</Link> |
      <Link to="/login" style={{ marginLeft: '0.5em' }}>Connexion</Link> |
      <Link to="/register" style={{ marginLeft: '0.5em' }}>Inscription</Link>
      <button onClick={handleLogout} style={{ marginLeft: '0.5em' }}>
        Se déconnecter
      </button>
    </nav>
  );
}

export default NavBar;
