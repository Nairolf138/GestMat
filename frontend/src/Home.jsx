import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import Alert from './Alert.jsx';
import { AuthContext } from './AuthContext.jsx';
import LoanSectionsTabs from './components/LoanSectionsTabs.jsx';
import HomeHeader from './components/HomeHeader.jsx';
import ActivityRail from './components/ActivityRail.jsx';
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

  const previewCount = 5;

  const tabSections = useMemo(
    () => [
      {
        key: 'pending',
        title: t('home.tabs.pending'),
        loans: pending,
        emptyMessage: t('home.no_requests'),
        onAccept: (loanId) => updateLoanStatus(loanId, 'accepted'),
        onDecline: (loanId) => updateLoanStatus(loanId, 'refused'),
      },
      {
        key: 'ongoing',
        title: t('home.tabs.ongoing'),
        loans: currentLoans,
        emptyMessage: t('home.no_loans'),
      },
      {
        key: 'upcoming',
        title: t('home.tabs.upcoming'),
        loans: upcomingLoans,
        emptyMessage: t('home.no_loans'),
      },
    ],
    [currentLoans, pending, t, upcomingLoans, updateLoanStatus],
  );

  const dueSoonLoans = useMemo(() => {
    const nowDate = new Date();
    return loans
      .filter((loan) => {
        if (!loan.endDate) return false;
        if (['cancelled', 'refused'].includes(loan.status)) return false;
        if (loan.borrower?._id !== (user?.structure?._id || user?.structure)) return false;
        const end = new Date(loan.endDate);
        const diffDays = Math.ceil((end - nowDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      })
      .slice(0, 5);
  }, [loans, user]);

  const activityItems = useMemo(() => {
    const pendingEntries = pending.slice(0, 3).map((loan) => ({
      id: `pending-${loan._id}`,
      href: loan._id ? `/loans/${loan._id}` : '/loans',
      label: t('home.activity.pending_label'),
      tone: 'warning',
      title: loan.items?.map((item) => item.equipment?.name).filter(Boolean).join(', ') || t('home.activity.untitled'),
      description: t('home.activity.pending_description', {
        borrower: loan.borrower?.name,
      }),
      date: loan.createdAt,
    }));

    const dueEntries = dueSoonLoans.map((loan) => ({
      id: `due-${loan._id}`,
      href: loan._id ? `/loans/${loan._id}` : '/loans',
      label: t('home.activity.due_label'),
      tone: 'info',
      title: loan.items?.map((item) => item.equipment?.name).filter(Boolean).join(', ') || t('home.activity.untitled'),
      description: t('home.activity.due_description', {
        borrower: loan.borrower?.name,
      }),
      date: loan.endDate,
    }));

    return [...dueEntries, ...pendingEntries]
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date) : null;
        const bDate = b.date ? new Date(b.date) : null;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [dueSoonLoans, pending, t]);

  const shortcuts = useMemo(
    () => [
      {
        to: '/inventory',
        icon: 'fa-warehouse',
        label: t('nav.inventory'),
        description: t('home.shortcuts_descriptions.inventory'),
      },
      {
        to: '/catalog',
        icon: 'fa-book',
        label: t('nav.catalog'),
        description: t('home.shortcuts_descriptions.catalog'),
      },
      {
        to: '/loans',
        icon: 'fa-handshake',
        label: t('nav.loans'),
        description: t('home.shortcuts_descriptions.loans'),
      },
      {
        to: '/loans/history',
        icon: 'fa-clock-rotate-left',
        label: t('nav.loans_history'),
        description: t('home.shortcuts_descriptions.history'),
      },
      {
        to: '/cart',
        icon: 'fa-cart-shopping',
        label: t('nav.cart'),
        description: t('home.shortcuts_descriptions.cart'),
      },
      {
        to: '/vehicles',
        icon: 'fa-car',
        label: t('nav.vehicles'),
        description: t('home.shortcuts_descriptions.vehicles'),
      },
      {
        to: '/profile',
        icon: 'fa-user',
        label: t('nav.profile'),
        description: t('home.shortcuts_descriptions.profile'),
      },
    ],
    [t],
  );

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
      <HomeHeader user={user} counts={counts} />
      <Alert message={error} />
      <Alert type="success" message={message} />
      <LoanSectionsTabs
        sections={tabSections}
        loading={loading}
        previewCount={previewCount}
        onAccept={(loanId) => updateLoanStatus(loanId, 'accepted')}
        onDecline={(loanId) => updateLoanStatus(loanId, 'refused')}
        actionInProgressId={actionLoadingId}
      />
      <h2 className="h2">{t('home.shortcuts')}</h2>
      <div className="quick-actions">
        <div className="card-grid shortcuts tutorial-shortcuts">
          {shortcuts.map((shortcut) => (
            <Link key={shortcut.to} className="shortcut-card" to={shortcut.to}>
              <i className={`fa-solid ${shortcut.icon}`} aria-hidden="true"></i>
              <span className="shortcut-title">{shortcut.label}</span>
              <span className="shortcut-description">{shortcut.description}</span>
            </Link>
          ))}
        </div>
        <ActivityRail items={activityItems} />
      </div>
      <OnboardingTour run={runTour} onClose={() => setRunTour(false)} />
    </>
  );
}

export default Home;
