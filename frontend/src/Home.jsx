import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [runTour, setRunTour] = useState(false);

  const structureId = useMemo(
    () => user?.structure?._id || user?.structure,
    [user],
  );

  const isOwnerLoan = useCallback(
    (loan) =>
      Boolean(
        structureId &&
          (loan.owner?._id === structureId || loan.owner === structureId),
      ),
    [structureId],
  );

  const refreshLoans = useCallback(
    async (withLoader = false) => {
      if (withLoader) setLoading(true);
      setError('');
      try {
        const data = await api('/loans');
        if (Array.isArray(data)) setLoans(data);
        else setLoans([]);
      } catch {
        setError(t('home.error_fetch'));
        setLoans([]);
      } finally {
        if (withLoader) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    refreshLoans(true);
  }, [refreshLoans]);

  const now = useMemo(() => new Date(), []);

  const pending = useMemo(
    () => loans.filter((l) => l.status === 'pending' && isOwnerLoan(l)),
    [loans, isOwnerLoan],
  );

  const updateLoanStatus = useCallback(
    async (loanId, status) => {
      setActionLoadingId(loanId);
      setError('');
      setMessage('');
      try {
        await api(`/loans/${loanId}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        setMessage(
          t('home.status_update_success', { status: t(`loans.status.${status}`) }),
        );
        await refreshLoans();
      } catch (err) {
        setError(err.message || t('home.status_update_error'));
      } finally {
        setActionLoadingId('');
      }
    },
    [refreshLoans, t],
  );

  const currentLoans = useMemo(
    () =>
      loans.filter((l) => {
        if (l.borrower?._id !== (user?.structure?._id || user?.structure))
          return false;
        if (['cancelled', 'refused'].includes(l.status)) return false;
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
        if (['pending', 'cancelled', 'refused'].includes(l.status)) return false;
        const start = l.startDate ? new Date(l.startDate) : null;
        return start && start > now;
      }),
    [loans, user, now],
  );

  const counts = useMemo(
    () => ({
      pending: pending.length,
      ongoing: currentLoans.length,
      upcoming: upcomingLoans.length,
    }),
    [pending, currentLoans, upcomingLoans],
  );

  if (loading) {
    return <Loading />;
  }

  const previewCount = 5;

  return (
    <>
      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-outline-secondary" onClick={() => setRunTour(true)}>
          {t('tour.help')}
        </button>
      </div>
      <div className="tutorial-notifications">
        <Notifications />
      </div>
      <h1 className="h1">{t('home.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={message} />
      {user && (
        <p>{t('home.greeting', { name: user.firstName || user.username })}</p>
      )}
      {user && <DashboardSummary counts={counts} />}
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
        onAccept={(loanId) => updateLoanStatus(loanId, 'accepted')}
        onDecline={(loanId) => updateLoanStatus(loanId, 'refused')}
        actionInProgressId={actionLoadingId}
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
        <Link className="shortcut-card" to="/loans/history">
          <i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
          <span>{t('nav.loans_history')}</span>
        </Link>
        <Link className="shortcut-card" to="/cart">
          <i className="fa-solid fa-cart-shopping" aria-hidden="true"></i>
          <span>{t('nav.cart')}</span>
        </Link>
        <Link className="shortcut-card" to="/vehicles">
          <i className="fa-solid fa-car" aria-hidden="true"></i>
          <span>{t('nav.vehicles')}</span>
        </Link>
        <Link className="shortcut-card" to="/profile">
          <i className="fa-solid fa-user" aria-hidden="true"></i>
          <span>{t('nav.profile')}</span>
        </Link>
      </div>
      <OnboardingTour run={runTour} onClose={() => setRunTour(false)} />
    </>
  );
}

export default Home;
