import React, { useEffect, useState, useContext, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import NavBar from "./NavBar";
import { api } from "./api";
import Alert from "./Alert.jsx";
import { AuthContext } from "./AuthContext.jsx";
import Loading from "./Loading.jsx";
import LoanPreviewSection from "./components/LoanPreviewSection.jsx";
import DashboardSummary from "./components/DashboardSummary.jsx";

function Home() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [message] = useState(location.state?.message || "");

  useEffect(() => {
    api("/loans")
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
    () => loans.filter((l) => l.status === "pending"),
    [loans, user, now]
  );

  const currentLoans = useMemo(
    () =>
      loans.filter((l) => {
        if (l.borrower?._id !== (user?.structure?._id || user?.structure))
          return false;
        const start = l.startDate ? new Date(l.startDate) : null;
        const end = l.endDate ? new Date(l.endDate) : null;
        return start && end && start <= now && end >= now;
      }),
    [loans, user, now]
  );

  const upcomingLoans = useMemo(
    () =>
      loans.filter((l) => {
        if (l.borrower?._id !== (user?.structure?._id || user?.structure))
          return false;
        const start = l.startDate ? new Date(l.startDate) : null;
        return start && start > now;
      }),
    [loans, user, now]
  );

  if (loading) {
    return (
      <div className="container">
        <NavBar />
        <Loading />
      </div>
    );
  }

  const previewCount = 5;

  return (
    <div className="container">
      <NavBar />
      <h1 className="h1">{t('home.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={message} />
      {user && <p>{t('home.greeting', { name: user.firstName || user.username })}</p>}
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
      <div
        className="d-flex flex-wrap"
        style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}
      >
        <Link className="btn shortcut-btn" to="/inventory">
          {t('nav.inventory')}
        </Link>
        <Link className="btn shortcut-btn" to="/catalog">
          {t('nav.catalog')}
        </Link>
        <Link className="btn shortcut-btn" to="/loans">
          {t('nav.loans')}
        </Link>
        <Link className="btn shortcut-btn" to="/cart">
          {t('nav.cart')}
        </Link>
        <Link className="btn shortcut-btn" to="/profile">
          {t('nav.profile')}
        </Link>
      </div>
    </div>
  );
}

export default Home;
