import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();
  const loggedIn = Boolean(localStorage.getItem('token'));
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand bg-dark navbar-dark mb-3">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          GestMat
        </Link>
        <div className="navbar-nav">
          <Link className="nav-link" to="/">
            Équipements
          </Link>
          <Link className="nav-link" to="/structures">
            Structures
          </Link>
          <Link className="nav-link" to="/users">
            Utilisateurs
          </Link>
          <Link className="nav-link" to="/loans">
            Prêts
          </Link>
          <Link className="nav-link" to="/profile">
            Profil
          </Link>
          {!loggedIn && (
            <>
              <Link className="nav-link" to="/login">
                Connexion
              </Link>
              <Link className="nav-link" to="/register">
                Inscription
              </Link>
            </>
          )}
          {loggedIn && (
            <button className="btn btn-outline-light ms-2" onClick={handleLogout}>
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
