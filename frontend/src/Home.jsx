import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';
import { AuthContext } from './AuthContext.jsx';
import Loading from './Loading.jsx';
import LoanPreviewSection from './components/LoanPreviewSection.jsx';
import DashboardSummary from './components/DashboardSummary.jsx';
import Notifications from './components/Notifications.jsx';
import OnboardingTour from './components/OnboardingTour.jsx';

function Home() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [message] = useState(location.state?.message || '');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    api('/loans')
      .then((data) => {
        if (Array.isArray(data)) setLoans(data);
        else setLoans([]);
      })
      .catch(() => {
        setError(t('home.error_fetch'));
        setLoans([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const now = useMemo(() => new Date(), []);

  const pending = useMemo(
    () => loans.filter((l) => l.status === 'pending'),
    [loans, user, now],
  );

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      api(`/equipments?search=${encodeURIComponent(query)}`, {
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
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/catalog?search=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
  };

  const handleSelect = (item) => {
    navigate(`/catalog?search=${encodeURIComponent(item.name)}`);
    setShowSuggestions(false);
  };

  const currentLoans = useMemo(
    () =>
      loans.filter((l) => {
        if (l.borrower?._id !== (user?.structure?._id || user?.structure))
          return false;
        const start = l.startDate ? new Date(l.startDate) : null;
        const end = l.endDate ? new Date(l.endDate) : null;
        return start && end && start <= now && end >= now;
      }),
    [loans, user, now],
  );

  const upcomingLoans = useMemo(
    () =>
      loans.filter((l) => {
        if (l.borrower?._id !== (user?.structure?._id || user?.structure))
          return false;
        const start = l.startDate ? new Date(l.startDate) : null;
        return start && start > now;
      }),
    [loans, user, now],
  );

  if (loading) {
    return (
      <div className="container">
        <NavBar />
        <main id="main-content">
          <Loading />
        </main>
      </div>
    );
  }

  const previewCount = 5;

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <div className="d-flex justify-content-end mt-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setRunTour(true)}
          >
            {t('tour.help')}
          </button>
        </div>
        <div className="tutorial-notifications">
          <Notifications />
        </div>
        <form
          className="mb-3 position-relative tutorial-search"
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            className="form-control"
            placeholder={t('home.search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          />
          {showSuggestions && (suggestions.length > 0 || query.trim()) && (
            <ul
              className="list-group position-absolute w-100"
              style={{ zIndex: 1000 }}
            >
              {suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <li
                    key={s._id}
                    className="list-group-item list-group-item-action"
                    onMouseDown={() => handleSelect(s)}
                  >
                    {s.name}
                  </li>
                ))
              ) : (
                <li className="list-group-item">{t('home.no_results')}</li>
              )}
            </ul>
          )}
        </form>
        <h1 className="h1">{t('home.title')}</h1>
        <Alert message={error} />
        <Alert type="success" message={message} />
        {user && (
          <p>{t('home.greeting', { name: user.firstName || user.username })}</p>
        )}
        {user && <DashboardSummary />}
        <LoanPreviewSection
          title={t('home.recent_requests')}
          loans={pending}
          emptyMessage={t('home.no_requests')}
          previewCount={previewCount}
          counterLabel={t('home.counter', {
            shown: previewCount,
            total: pending.length,
            category: t('home.recent_requests').toLowerCase(),
          })}
        />
        <LoanPreviewSection
          title={t('home.current_loans')}
          loans={currentLoans}
          emptyMessage={t('home.no_loans')}
          previewCount={previewCount}
          counterLabel={t('home.counter', {
            shown: previewCount,
            total: currentLoans.length,
            category: t('home.current_loans').toLowerCase(),
          })}
        />
        <LoanPreviewSection
          title={t('home.incoming_loans')}
          loans={upcomingLoans}
          emptyMessage={t('home.no_loans')}
          previewCount={previewCount}
          counterLabel={t('home.counter', {
            shown: previewCount,
            total: upcomingLoans.length,
            category: t('home.incoming_loans').toLowerCase(),
          })}
        />
        <h2 className="h2">{t('home.shortcuts')}</h2>
        <div className="card-grid shortcuts tutorial-shortcuts">
          <Link className="shortcut-card" to="/inventory">
            <i className="fa-solid fa-warehouse" aria-hidden="true"></i>
            <span>{t('nav.inventory')}</span>
          </Link>
          <Link className="shortcut-card" to="/catalog">
            <i className="fa-solid fa-book" aria-hidden="true"></i>
            <span>{t('nav.catalog')}</span>
          </Link>
          <Link className="shortcut-card" to="/loans">
            <i className="fa-solid fa-handshake" aria-hidden="true"></i>
            <span>{t('nav.loans')}</span>
          </Link>
          <Link className="shortcut-card" to="/cart">
            <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
            <span>{t('nav.cart')}</span>
          </Link>
          <Link className="shortcut-card" to="/profile">
            <i className="fa-solid fa-user" aria-hidden="true"></i>
            <span>{t('nav.profile')}</span>
          </Link>
        </div>
        <OnboardingTour run={runTour} onClose={() => setRunTour(false)} />
      </main>
    </div>
  );
}

export default Home;
