import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
        <NavLink
          className="navbar-brand"
          to="/"
          onClick={() => setIsOpen(false)}
        >
          <img src="logo.png" alt="GestMat" />
        </NavLink>
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
          <NavLink
            className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
            to="/catalog"
            onClick={() => setIsOpen(false)}
          >
            {t('nav.catalog')}
          </NavLink>
          {user && (
            <>
              <NavLink
                className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
                to="/inventory"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.inventory')}
              </NavLink>
              <NavLink
                className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
                to="/loans"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.loans')}
              </NavLink>
              <NavLink
                className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
                to="/cart"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.cart')}
              </NavLink>
              <NavLink
                className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
                to="/profile"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.profile')}
              </NavLink>
              <button
                className="btn ms-2"
                style={{
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  backgroundColor: 'transparent',
                }}
                onClick={handleLogout}
              >
                {t('nav.logout')}
              </button>
            </>
          )}
          {!user && (
            <>
              <NavLink
                className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
                to="/login"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.login')}
              </NavLink>
              <NavLink
                className={({isActive}) => 'nav-link' + (isActive ? ' active' : '')}
                to="/register"
                onClick={() => setIsOpen(false)}
              >
                {t('register.title')}
              </NavLink>
            </>
          )}
          </div>
          <div className="d-flex ms-auto align-items-center">
            <button
              className="btn me-2 theme-toggle-btn"
              style={{
                color: isDarkTheme
                  ? 'var(--color-text)'
                  : 'var(--color-secondary)',
                borderColor: 'var(--color-secondary)',
                backgroundColor: isDarkTheme
                  ? 'var(--color-secondary)'
                  : 'transparent',
              }}
              onClick={handleThemeToggle}
              aria-pressed={isDarkTheme}
              aria-label={themeLabel}
              title={themeLabel}
            >
              <i
                className={`fa-solid ${isDarkTheme ? 'fa-sun' : 'fa-moon'} theme-toggle-icon`}
                aria-hidden="true"
              ></i>
            </button>
            <select
              className="form-select"
              value={i18n.language}
              onChange={handleLanguageChange}
              aria-label={t('nav.language')}
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
