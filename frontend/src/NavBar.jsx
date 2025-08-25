import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';

function NavBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() =>
    document.body.classList.contains('dark-theme') ||
    localStorage.getItem('theme') === 'dark'
  );
  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };
  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  const themeLabel = isDarkTheme
    ? t('nav.toggle_theme.deactivate')
    : t('nav.toggle_theme.activate');

  const handleThemeToggle = () => {
    const body = document.body;
    body.classList.toggle('dark-theme');
    const newTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    setIsDarkTheme(newTheme === 'dark');
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
          <div className="d-flex ms-auto align-items-center">
            <button
              className="btn btn-outline-secondary me-2"
              onClick={handleThemeToggle}
              aria-pressed={isDarkTheme}
              aria-label={themeLabel}
              title={themeLabel}
            >
              {isDarkTheme ? '☀️' : '🌙'}
            </button>
            <select
              className="form-select"
              value={i18n.language}
              onChange={handleLanguageChange}
            >
              <option value="fr">fr</option>
              <option value="en">en</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
