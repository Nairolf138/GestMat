import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Loading from '../Loading.jsx';

const statusOptions = ['pending', 'accepted', 'refused', 'cancelled'];

const summarizeItems = (items = []) =>
  items
    .map((item) => {
      const name = item?.equipment?.name;
      if (!name) return '';
      const quantity = item?.quantity;
      return `${name}${quantity ? ` x${quantity}` : ''}`;
    })
    .filter(Boolean)
    .join(', ');

function ManageLoans() {
  const { t } = useTranslation();
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(null);
  const [totalLoans, setTotalLoans] = useState(null);
  const [filteredTotal, setFilteredTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    borrower: '',
    from: '',
    to: '',
  });
  const [compact, setCompact] = useState(false);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ page, limit });
    if (filters.status) params.set('status', filters.status);
    if (filters.borrower) params.set('borrower', filters.borrower);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return params.toString();
  }, [filters, limit, page]);

  const load = useCallback(() => {
    setError('');
    setLoading(true);
    api(`/loans?${buildQuery()}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setLoans(data);
          setTotalPages(null);
          setFilteredTotal(data.length);
          setTotalLoans(data.length);
        } else {
          setLoans(data.loans || []);
          const total = data.total ?? data.filteredTotal ?? data.loans?.length;
          const overall = data.totalLoans ?? data.total ?? data.loans?.length;
          setFilteredTotal(total ?? null);
          setTotalLoans(overall ?? null);
          setTotalPages(total ? Math.ceil(total / limit) : null);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoans([]);
        setTotalPages(null);
      })
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const update = async (id, status) => {
    setError('');
    try {
      await api(`/loans/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label" htmlFor="loan-filter-status">
                {t('loans.status._', { defaultValue: 'Status' })}
              </label>
              <select
                id="loan-filter-status"
                className="form-select"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">{t('common.all')}</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {t(`loans.status.${status}`, { defaultValue: status })}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="loan-filter-borrower">
                {t('loans.borrower', { defaultValue: 'Borrower' })}
              </label>
              <input
                id="loan-filter-borrower"
                className="form-control"
                type="text"
                value={filters.borrower}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, borrower: e.target.value }))
                }
                placeholder={t('common.search')}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="loan-filter-from">
                {t('common.from', { defaultValue: 'From' })}
              </label>
              <input
                id="loan-filter-from"
                className="form-control"
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, from: e.target.value }))
                }
              />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="loan-filter-to">
                {t('common.to', { defaultValue: 'To' })}
              </label>
              <input
                id="loan-filter-to"
                className="form-control"
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, to: e.target.value }))
                }
              />
            </div>
            <div className="col-md-2 text-md-end">
              <div className="form-check form-switch mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="loan-compact-mode"
                  checked={compact}
                  onChange={(e) => setCompact(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="loan-compact-mode">
                  {t('common.compact_mode', { defaultValue: 'Compact list' })}
                </label>
              </div>
            </div>
          </div>
          <div className="mt-2 text-muted small">
            {t('admin_loans.summary', {
              defaultValue: 'Showing {{filtered}} / {{total}} loans',
              filtered: filteredTotal ?? loans.length,
              total: totalLoans ?? filteredTotal ?? loans.length,
            })}
          </div>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <ul className="list-group">
          {loans.map((l) => {
            const items = summarizeItems(l.items);
            const itemCount = l.items?.length ?? 0;
            const borrower = l.borrower?.name || l.borrower || '';
            const statusLabel = t(`loans.status.${l.status}`, {
              defaultValue: l.status,
            });
            const statusClassMap = {
              pending: 'bg-warning text-dark',
              accepted: 'bg-success',
              refused: 'bg-danger',
              cancelled: 'bg-secondary',
            };
            const statusClass = statusClassMap[l.status] || 'bg-light text-dark';
            return (
              <li
                key={l._id}
                className={`list-group-item d-flex justify-content-between ${
                  compact ? 'align-items-center' : 'flex-column'
                }`}
              >
                <div className={compact ? 'd-flex align-items-center w-100' : ''}>
                  <span className={`badge me-2 ${statusClass}`}>{statusLabel}</span>
                  <div className="flex-grow-1">
                    <div className={compact ? 'text-truncate' : ''}>
                      <strong>{items || t('loans.items', { count: itemCount })}</strong>
                      {borrower && ` - ${borrower}`}
                    </div>
                    {!compact && (
                      <div className="text-muted small mt-1">
                        {t('loans.items', { count: itemCount })}
                      </div>
                    )}
                  </div>
                </div>
                <select
                  className={`form-select ${compact ? 'ms-3 w-auto' : 'w-auto mt-2'}`}
                  value={l.status}
                  onChange={(e) => update(l._id, e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {t(`loans.status.${status}`, { defaultValue: status })}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2">
        <button
          className="btn btn-secondary me-2"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          {t('common.previous')}
        </button>
        <span>
          {loading
            ? t('common.loading')
            : totalPages !== null
            ? t('admin_loans.pagination.page_total', {
                page,
                total: totalPages,
              })
            : ''}
        </span>
        <button
          className="btn btn-secondary ms-2"
          disabled={
            totalPages !== null ? page >= totalPages : loans.length < limit
          }
          onClick={() => setPage(page + 1)}
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}

export default ManageLoans;

