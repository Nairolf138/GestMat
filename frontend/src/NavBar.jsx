import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';
import logo from './logo.png';
import { ADMIN_ROLE } from '../roles';

function NavBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(
    () =>
      document.body.classList.contains('dark-theme') ||
      localStorage.getItem('theme') === 'dark',
  );
  const [cartCount, setCartCount] = useState(
    JSON.parse(localStorage.getItem('cart') || '[]').length,
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAdmin = user?.role === ADMIN_ROLE;
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

  useEffect(() => {
    const handleStorageChange = () => {
      setCartCount(JSON.parse(localStorage.getItem('cart') || '[]').length);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!accountOpen) {
      return undefined;
    }

    let inactivityTimer;

    const closeAccount = () => setAccountOpen(false);

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(closeAccount, 10000);
    };

    const handleDocumentClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeAccount();
      }
    };

    const handlePointerMove = () => {
      resetInactivityTimer();
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('pointermove', handlePointerMove);
    resetInactivityTimer();

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('pointermove', handlePointerMove);
      clearTimeout(inactivityTimer);
    };
  }, [accountOpen]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('nav.skip')}
      </a>
      <nav className="navbar navbar-expand-lg navbar-light mb-4 shadow-sm py-2 sticky-top">
        <div className="container-fluid">
          <NavLink
            className="navbar-brand"
            to="/"
            onClick={() => setIsOpen(false)}
          >
            <img src={logo} alt="GestMat" />
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
            <div className="navbar-nav align-items-center">
              <NavLink
                className={({ isActive }) =>
                  'nav-link' + (isActive ? ' active' : '')
                }
                to="/catalog"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.catalog')}
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  'nav-link' + (isActive ? ' active' : '')
                }
                to="/vehicles"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.vehicles')}
              </NavLink>
              {user && (
                <>
                  <NavLink
                    className={({ isActive }) =>
                      'nav-link' + (isActive ? ' active' : '')
                    }
                    to="/inventory"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.inventory')}
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      'nav-link' + (isActive ? ' active' : '')
                    }
                    to="/loans"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.loans')}
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      'nav-link' + (isActive ? ' active' : '')
                    }
                    to="/cart"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.cart')}
                    {cartCount > 0 && (
                      <span className="cart-badge">{cartCount}</span>
                    )}
                  </NavLink>
                  {isAdmin && (
                    <NavLink
                      className={({ isActive }) =>
                        'nav-link' + (isActive ? ' active' : '')
                      }
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                    >
                      {t('nav.admin')}
                    </NavLink>
                  )}
                </>
              )}
              {!user && (
                <>
                  <NavLink
                    className={({ isActive }) =>
                      'nav-link' + (isActive ? ' active' : '')
                    }
                    to="/login"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.login')}
                  </NavLink>
                  <NavLink
                    className={({ isActive }) =>
                      'nav-link' + (isActive ? ' active' : '')
                    }
                    to="/register"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('register.title')}
                  </NavLink>
                </>
              )}
            </div>
            <div className="navbar-utils d-flex ms-auto align-items-center gap-3">
              {user && (
                <div ref={dropdownRef} className="dropdown user-dropdown">
                  <button
                    className="btn dropdown-toggle d-flex align-items-center"
                    type="button"
                    aria-expanded={accountOpen}
                    aria-label={t('nav.account')}
                    onClick={() => setAccountOpen(!accountOpen)}
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="rounded-circle"
                      />
                    ) : (
                      user?.username
                    )}
                  </button>
                  <ul
                    className={`dropdown-menu dropdown-menu-end${accountOpen ? ' show' : ''}`}
                  >
                    <li>
                      <NavLink
                        className="dropdown-item"
                        to="/profile"
                        onClick={() => {
                          setAccountOpen(false);
                          setIsOpen(false);
                        }}
                      >
                        {t('nav.profile')}
                      </NavLink>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setAccountOpen(false);
                          handleLogout();
                        }}
                      >
                        {t('nav.logout')}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
              <button
                className="btn theme-toggle-btn"
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
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default NavBar;
