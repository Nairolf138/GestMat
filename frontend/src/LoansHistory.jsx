import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NavBar from './NavBar';
import { api } from './api';
import { AuthContext } from './AuthContext.jsx';
import LoanItem from './LoanItem.jsx';
import Loading from './Loading.jsx';

const PAGE_SIZE = 10;

const getLoanDate = (loan) =>
  loan.endDate || loan.startDate || loan.createdAt || new Date().toISOString();

function LoansHistory() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [tab, setTab] = useState('owner');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const structureId = user?.structure?._id || user?.structure;

  const refresh = () => {
    setLoading(true);
    setError(null);
    api('/loans')
      .then((data) => {
        setLoans(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoans([]);
        setError(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
  }, []);

  const historyLoans = useMemo(() => {
    const now = new Date();
    const historyCandidates = loans.filter((loan) => {
      const end = loan.endDate ? new Date(loan.endDate) : null;
      const isHistoryStatus =
        loan.status === 'refused' || loan.status === 'cancelled';
      const isFinished = end && end < now;

      if (tab === 'owner') {
        return (
          (loan.owner?._id === structureId || loan.owner === structureId) &&
          (isHistoryStatus || isFinished)
        );
      }

      return (
        (loan.borrower?._id === structureId || loan.borrower === structureId) &&
        (isHistoryStatus || isFinished)
      );
    });

    const statusFiltered = historyCandidates.filter((loan) => {
      if (statusFilter === 'all') {
        return true;
      }
      if (statusFilter === 'finished') {
        const end = loan.endDate ? new Date(loan.endDate) : null;
        return end && end < now && !['refused', 'cancelled'].includes(loan.status);
      }
      return loan.status === statusFilter;
    });

    const periodFiltered = statusFiltered.filter((loan) => {
      if (!fromDate && !toDate) {
        return true;
      }
      const start = loan.startDate ? new Date(loan.startDate) : null;
      if (!start) {
        return true;
      }
      if (fromDate && start < new Date(fromDate)) {
        return false;
      }
      if (toDate && start > new Date(toDate)) {
        return false;
      }
      return true;
    });

    return periodFiltered.sort(
      (a, b) => new Date(getLoanDate(b)) - new Date(getLoanDate(a)),
    );
  }, [loans, statusFilter, fromDate, toDate, tab, structureId]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, fromDate, toDate, tab]);

  const totalPages = Math.max(1, Math.ceil(historyLoans.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLoans = historyLoans.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleResetFilters = () => {
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <h1 className="h1">{t('loans.history.title')}</h1>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="alert alert-danger">{t('common.error')}</div>
        ) : (
          <>
            <div className="card mb-3">
              <div className="card-body d-flex flex-column flex-md-row gap-3">
                <div className="d-flex flex-column flex-grow-1">
                  <label className="form-label" htmlFor="status-filter">
                    {t('loans.history.status_filter')}
                  </label>
                  <select
                    id="status-filter"
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">{t('common.all')}</option>
                    <option value="finished">{t('loans.finished')}</option>
                    <option value="accepted">{t('loans.status.accepted')}</option>
                    <option value="cancelled">{t('loans.status.cancelled')}</option>
                    <option value="refused">{t('loans.status.refused')}</option>
                  </select>
                </div>
                <div className="d-flex flex-column flex-grow-1">
                  <label className="form-label" htmlFor="from-date">
                    {t('loans.history.from')}
                  </label>
                  <input
                    id="from-date"
                    type="date"
                    className="form-control"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="d-flex flex-column flex-grow-1">
                  <label className="form-label" htmlFor="to-date">
                    {t('loans.history.to')}
                  </label>
                  <input
                    id="to-date"
                    type="date"
                    className="form-control"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="d-flex align-items-end">
                  <button className="btn btn-secondary" onClick={handleResetFilters}>
                    {t('common.reset')}
                  </button>
                </div>
              </div>
            </div>
            <ul className="nav nav-tabs mt-3">
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === 'owner' ? 'active' : ''}`}
                  onClick={() => setTab('owner')}
                >
                  {t('loans.as_owner')}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tab === 'borrower' ? 'active' : ''}`}
                  onClick={() => setTab('borrower')}
                >
                  {t('loans.as_borrower')}
                </button>
              </li>
            </ul>
            <div className="mt-3">
              <ul className="list-group mb-3">
                {paginatedLoans.map((loan) => (
                  <LoanItem
                    key={loan._id}
                    loan={loan}
                    isOwner={tab === 'owner'}
                    refresh={refresh}
                  />
                ))}
                {!paginatedLoans.length && (
                  <li className="list-group-item">
                    {t('loans.history.no_results')}
                  </li>
                )}
              </ul>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  {t('loans.history.pagination', {
                    start: historyLoans.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
                    end: Math.min(historyLoans.length, currentPage * PAGE_SIZE),
                    total: historyLoans.length,
                  })}
                </small>
                <div className="btn-group">
                  <button
                    className="btn btn-outline-primary"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t('common.previous')}
                  </button>
                  <button
                    className="btn btn-outline-primary"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t('common.next')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default LoansHistory;
