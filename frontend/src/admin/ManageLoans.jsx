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
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setError('');
    setLoading(true);
    api(`/loans?page=${page}&limit=${limit}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setLoans(data);
          setTotalPages(null);
        } else {
          setLoans(data.loans || []);
          setTotalPages(
            data.total ? Math.ceil(data.total / limit) : null,
          );
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoans([]);
        setTotalPages(null);
      })
      .finally(() => setLoading(false));
  }, [limit, page]);

  useEffect(() => {
    load();
  }, [load]);

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
            return (
              <li key={l._id} className="list-group-item">
                <div>
                  <strong>{items || t('loans.items', { count: itemCount })}</strong> -{' '}
                  {borrower} - {statusLabel}
                </div>
                <select
                  className="form-select w-auto mt-2"
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

