import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/">Équipements</Link>
      <Link to="/structures">Structures</Link>
      <Link to="/users">Utilisateurs</Link>
      <Link to="/loans">Prêts</Link>
      <Link to="/login">Connexion</Link>
      <Link to="/register">Inscription</Link>
      <button onClick={handleLogout}>Se déconnecter</button>
    </nav>
  );
}

export default NavBar;
