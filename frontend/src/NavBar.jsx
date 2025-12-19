import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';
import logo from './logo.png';
import { ADMIN_ROLE } from '../roles';
import usePendingLoanRequestsCount from './hooks/usePendingLoanRequestsCount';

function NavBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navRef = useRef(null);
  const { count: pendingLoanCount } = usePendingLoanRequestsCount({
    enabled: Boolean(user),
    userId: user?._id,
  });
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

  const loansNavLabel = pendingLoanCount
    ? t('nav.loans_with_pending', {
        count: pendingLoanCount > 99 ? '99+' : pendingLoanCount,
      })
    : t('nav.loans');

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
    const params = new URLSearchParams(location.search);
    const searchFromUrl = params.get('search') || '';
    setSearchQuery(searchFromUrl);
  }, [location.search]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      api(`/equipments?search=${encodeURIComponent(searchQuery)}`, {
        signal: controller.signal,
      })
        .then((data) => {
          if (Array.isArray(data)) setSuggestions(data.slice(0, 5));
          else setSuggestions([]);
        })
        .catch(() => setSuggestions([]));
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

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

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    navigate(`/catalog?search=${encodeURIComponent(trimmedQuery)}`);
    setShowSuggestions(false);
    setIsOpen(false);
  };

  const handleSuggestionSelect = (item) => {
    const name = item?.name || '';
    if (!name) return;

    setSearchQuery(name);
    navigate(`/catalog?search=${encodeURIComponent(name)}`);
    setShowSuggestions(false);
    setIsOpen(false);
  };

  useLayoutEffect(() => {
    const updateNavbarHeight = () => {
      const navElement = navRef.current;
      if (!navElement) return;

      const computedStyles = window.getComputedStyle(navElement);
      const previousMinHeight = navElement.style.minHeight;
      navElement.style.minHeight = '0';

      const measuredHeight = navElement.getBoundingClientRect().height;
      navElement.style.minHeight = previousMinHeight;

      const minHeight = parseFloat(computedStyles.minHeight) || 0;
      const navbarHeight = Math.max(measuredHeight, minHeight);

      document.documentElement.style.setProperty(
        '--navbar-height',
        `${navbarHeight}px`,
      );
    };

    updateNavbarHeight();
    const rafId = requestAnimationFrame(updateNavbarHeight);
    window.addEventListener('resize', updateNavbarHeight);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateNavbarHeight);
    };
  }, [cartCount, isOpen, user]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('nav.skip')}
      </a>
      <nav
        ref={navRef}
        className={`navbar navbar-expand-lg ${isDarkTheme ? 'navbar-dark' : 'navbar-light'} shadow-sm py-2 navbar-fixed`}
      >
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
                    aria-label={loansNavLabel}
                  >
                    {t('nav.loans')}
                    {pendingLoanCount > 0 && (
                      <span className="loan-badge" aria-hidden="true">
                        {pendingLoanCount > 99 ? '99+' : pendingLoanCount}
                      </span>
                    )}
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
              <form
                ref={searchContainerRef}
                className="navbar-search d-flex align-items-center tutorial-search"
                autoComplete="off"
                onSubmit={handleSearchSubmit}
              >
                <label className="visually-hidden" htmlFor="navbar-search">
                  {t('nav.search_label')}
                </label>
                <div className="position-relative flex-grow-1">
                  <input
                    id="navbar-search"
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={t('nav.search_placeholder')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                    aria-label={t('nav.search_label')}
                  />
                  {showSuggestions && (suggestions.length > 0 || searchQuery.trim()) && (
                    <ul className="list-group position-absolute w-100 search-suggestions">
                      {suggestions.length > 0 ? (
                        suggestions.map((suggestion) => (
                          <li
                            key={suggestion._id}
                            className="list-group-item list-group-item-action"
                            onMouseDown={() => handleSuggestionSelect(suggestion)}
                          >
                            {suggestion.name}
                          </li>
                        ))
                      ) : (
                        <li className="list-group-item">{t('home.no_results')}</li>
                      )}
                    </ul>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm ms-2 d-flex align-items-center justify-content-center"
                  aria-label={t('nav.search_button')}
                >
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                </button>
              </form>
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
