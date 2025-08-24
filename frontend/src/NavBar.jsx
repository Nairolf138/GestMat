import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';

function NavBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light mb-4 shadow-sm">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          GestMat
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div
          className={`collapse navbar-collapse${isOpen ? ' show' : ''}`}
          id="navbarNav"
        >
          <div className="navbar-nav">
          <Link className="nav-link" to="/catalog">
            {t('nav.catalog')}
          </Link>
          {user && (
            <>
              <Link className="nav-link" to="/inventory">
                {t('nav.inventory')}
              </Link>
              <Link className="nav-link" to="/loans">
                {t('nav.loans')}
              </Link>
              <Link className="nav-link" to="/cart">
                {t('nav.cart')}
              </Link>
              <Link className="nav-link" to="/profile">
                {t('nav.profile')}
              </Link>
              <button className="btn btn-outline-primary ms-2" onClick={handleLogout}>
                {t('nav.logout')}
              </button>
            </>
          )}
          {!user && (
            <>
              <Link className="nav-link" to="/login">
                {t('nav.login')}
              </Link>
              <Link className="nav-link" to="/register">
                {t('register.title')}
              </Link>
            </>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
