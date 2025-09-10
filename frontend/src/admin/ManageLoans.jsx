import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Loading from '../Loading.jsx';

function ManageLoans() {
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
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
  };

  useEffect(() => {
    load();
  }, [page]);

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
          {loans.map((l) => (
            <li key={l._id} className="list-group-item">
              <div>
                <strong>{l.equipment?.name || l.equipment}</strong> -{' '}
                {l.borrower?.name || l.borrower} - {l.status}
              </div>
              <select
                className="form-select w-auto mt-2"
                value={l.status}
                onChange={(e) => update(l._id, e.target.value)}
              >
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="returned">returned</option>
                <option value="refused">refused</option>
              </select>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <button
          className="btn btn-secondary me-2"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          {loading
            ? '...'
            : totalPages !== null
            ? `${page}/${totalPages}`
            : ''}
        </span>
        <button
          className="btn btn-secondary ms-2"
          disabled={
            totalPages !== null ? page >= totalPages : loans.length < limit
          }
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default ManageLoans;

