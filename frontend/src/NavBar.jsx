import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';

function NavBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      navigate('/login');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light mb-4 shadow-sm">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          GestMat
        </Link>
        <div className="navbar-nav">
          <Link className="nav-link" to="/catalog">
            {t('nav.catalog')}
          </Link>
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
          <Link className="nav-link" to="/login">
            {t('nav.login')}
          </Link>
          <Link className="nav-link" to="/register">
            {t('register.title')}
          </Link>
          <button className="btn btn-outline-primary ms-2" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
