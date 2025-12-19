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
import i18n from './i18n.js';

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

  const isBorrowerLoan = useCallback(
    (loan) =>
      Boolean(
        structureId &&
          (loan.borrower?._id === structureId || loan.borrower === structureId),
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

  const isActiveLoan = useCallback(
    (loan) => {
      const start = loan.startDate ? new Date(loan.startDate) : null;
      const end = loan.endDate ? new Date(loan.endDate) : null;
      if (!start || !end) return false;
      if (['cancelled', 'refused', 'pending'].includes(loan.status)) return false;
      return start <= now && end >= now;
    },
    [now],
  );

  const isUpcomingLoan = useCallback(
    (loan) => {
      const start = loan.startDate ? new Date(loan.startDate) : null;
      if (!start) return false;
      if (['cancelled', 'refused', 'pending'].includes(loan.status)) return false;
      return start > now;
    },
    [now],
  );

  const pendingApprovals = useMemo(
    () => loans.filter((l) => l.status === 'pending' && isOwnerLoan(l)),
    [loans, isOwnerLoan],
  );

  const pendingUnderReview = useMemo(
    () =>
      loans.filter(
        (l) => l.status === 'pending' && isBorrowerLoan(l) && !isOwnerLoan(l),
      ),
    [isBorrowerLoan, isOwnerLoan, loans],
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

  const ownerActiveLoans = useMemo(
    () => loans.filter((l) => isOwnerLoan(l) && isActiveLoan(l)),
    [isActiveLoan, isOwnerLoan, loans],
  );

  const ownerUpcomingLoans = useMemo(
    () => loans.filter((l) => isOwnerLoan(l) && isUpcomingLoan(l)),
    [isOwnerLoan, isUpcomingLoan, loans],
  );

  const borrowerActiveLoans = useMemo(
    () => loans.filter((l) => isBorrowerLoan(l) && isActiveLoan(l)),
    [isActiveLoan, isBorrowerLoan, loans],
  );

  const borrowerUpcomingLoans = useMemo(
    () => loans.filter((l) => isBorrowerLoan(l) && isUpcomingLoan(l)),
    [isBorrowerLoan, isUpcomingLoan, loans],
  );

  const currentLoans = borrowerActiveLoans;

  const upcomingLoans = borrowerUpcomingLoans;

  const badgeCounts = useMemo(
    () => ({
      pendingApprovals: pendingApprovals.length,
      pendingUnderReview: pendingUnderReview.length,
      ownerActiveUpcoming: ownerActiveLoans.length + ownerUpcomingLoans.length,
      borrowerActiveUpcoming:
        borrowerActiveLoans.length + borrowerUpcomingLoans.length,
    }),
    [
      borrowerActiveLoans.length,
      borrowerUpcomingLoans.length,
      ownerActiveLoans.length,
      ownerUpcomingLoans.length,
      pendingApprovals.length,
      pendingUnderReview.length,
    ],
  );

  const previewCount = 5;

  const tabSections = useMemo(
    () => [
      {
        key: 'pending',
        title: t('home.tabs.pending'),
        loans: pendingApprovals,
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
    [currentLoans, pendingApprovals, t, upcomingLoans, updateLoanStatus],
  );

  const formatDateLabel = useCallback(
    (date) => {
      if (!date) return t('home.activity.date_unknown');
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
      }).format(new Date(date));
    },
    [t],
  );

  const formatPeriod = useCallback(
    (start, end) => {
      const startLabel = start ? formatDateLabel(start) : '';
      const endLabel = end ? formatDateLabel(end) : '';
      if (startLabel && endLabel) {
        return t('home.activity.period', { start: startLabel, end: endLabel });
      }
      if (startLabel) {
        return t('home.activity.period_start', { start: startLabel });
      }
      if (endLabel) {
        return t('home.activity.period_end', { end: endLabel });
      }
      return '';
    },
    [formatDateLabel, t],
  );

  const getStructureName = useCallback(
    (entity) => entity?.name || t('home.activity.unknown_structure'),
    [t],
  );

  const { activityItems, totalActivityCount } = useMemo(() => {
    const nowDate = new Date();
    const itemsList = [];

    loans.forEach((loan) => {
      const ownerRelated = isOwnerLoan(loan);
      const borrowerRelated = isBorrowerLoan(loan);
      if (!ownerRelated && !borrowerRelated) return;

      const ownerName = getStructureName(loan.owner);
      const borrowerName = getStructureName(loan.borrower);
      const counterpartName = ownerRelated ? borrowerName : ownerName;
      const title =
        loan.items?.map((item) => item.equipment?.name).filter(Boolean).join(', ') ||
        t('home.activity.untitled');
      const href = loan._id ? `/loans/${loan._id}` : '/loans';

      const addEntry = (type, date, data) => {
        if (!date) return;
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return;
        itemsList.push({
          id: `${type}-${loan._id || href}-${parsed.getTime()}`,
          href,
          title,
          date: parsed.toISOString(),
          ...data,
        });
      };

      addEntry('created', loan.createdAt, {
        label: ownerRelated
          ? t('home.activity.request_received')
          : t('home.activity.request_sent'),
        description: ownerRelated
          ? t('home.activity.request_received_description', {
              borrower: borrowerName,
            })
          : t('home.activity.request_sent_description', { owner: ownerName }),
        tone: ownerRelated ? 'warning' : 'info',
        icon: 'fa-circle-plus',
      });

      if (loan.status === 'accepted') {
        const descKey = ownerRelated
          ? 'home.activity.request_validated_description_owner'
          : 'home.activity.request_validated_description_borrower';
        const descParts = [
          t(descKey, { counterpart: counterpartName }),
          formatPeriod(loan.startDate, loan.endDate),
        ].filter(Boolean);
        addEntry('accepted', loan.updatedAt || loan.createdAt, {
          label: t('home.activity.request_validated'),
          description: descParts.join(' • '),
          tone: 'success',
          icon: 'fa-circle-check',
        });
      }

      if (loan.status === 'cancelled') {
        const descKey = ownerRelated
          ? 'home.activity.request_cancelled_description_owner'
          : 'home.activity.request_cancelled_description_borrower';
        addEntry('cancelled', loan.updatedAt || loan.endDate || loan.createdAt, {
          label: t('home.activity.request_cancelled'),
          description: t(descKey, { counterpart: counterpartName }),
          tone: 'danger',
          icon: 'fa-circle-xmark',
        });
      }

      if (loan.status === 'refused') {
        addEntry('refused', loan.updatedAt || loan.createdAt, {
          label: t('home.activity.request_refused'),
          description: t('home.activity.request_refused_description', {
            counterpart: counterpartName,
          }),
          tone: 'danger',
          icon: 'fa-ban',
        });
      }

      if (loan.status === 'accepted' && loan.startDate) {
        const startDate = new Date(loan.startDate);
        const isFutureStart = startDate > nowDate;
        const labelKey = isFutureStart
          ? 'home.activity.loan_start_planned'
          : 'home.activity.loan_started';
        const descKey = ownerRelated
          ? 'home.activity.loan_start_description_owner'
          : 'home.activity.loan_start_description_borrower';
        const descParts = [
          t(descKey, { counterpart: counterpartName }),
          formatPeriod(loan.startDate, loan.endDate),
        ].filter(Boolean);

        addEntry('start', loan.startDate, {
          label: t(labelKey),
          description: descParts.join(' • '),
          tone: isFutureStart ? 'info' : 'success',
          icon: isFutureStart ? 'fa-clock' : 'fa-play',
        });
      }

      if (loan.endDate && !['cancelled', 'refused'].includes(loan.status)) {
        const endDate = new Date(loan.endDate);
        const daysUntilEnd = Math.ceil(
          (endDate - nowDate) / (1000 * 60 * 60 * 24),
        );
        const isPast = endDate < nowDate;
        const labelKey = isPast
          ? 'home.activity.loan_returned'
          : daysUntilEnd <= 7
            ? 'home.activity.loan_return_due_soon'
            : 'home.activity.loan_return_due';
        const descKey = ownerRelated
          ? 'home.activity.loan_return_description_owner'
          : 'home.activity.loan_return_description_borrower';
        const descParts = [
          t(descKey, { counterpart: counterpartName }),
          t('home.activity.return_date', { date: formatDateLabel(loan.endDate) }),
        ].filter(Boolean);

        addEntry('return', loan.endDate, {
          label: t(labelKey),
          description: descParts.join(' • '),
          tone: isPast ? 'success' : daysUntilEnd <= 7 ? 'warning' : 'info',
          icon: isPast ? 'fa-box-archive' : 'fa-rotate-left',
        });
      }
    });

    const sorted = itemsList.sort((a, b) => new Date(b.date) - new Date(a.date));
    const maxItems = 8;
    return {
      activityItems: sorted.slice(0, maxItems),
      totalActivityCount: sorted.length,
    };
  }, [formatDateLabel, formatPeriod, getStructureName, isBorrowerLoan, isOwnerLoan, loans, t]);

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
      <HomeHeader user={user} counts={badgeCounts} />
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
        <ActivityRail
          items={activityItems}
          totalCount={totalActivityCount}
          seeAllHref="/loans/history"
        />
      </div>
      <OnboardingTour run={runTour} onClose={() => setRunTour(false)} />
    </>
  );
}

export default Home;
