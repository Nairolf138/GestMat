import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import Loading from './Loading.jsx';
import Alert from './Alert.jsx';

function LoanDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/loans/${id}`)
      .then((data) => setLoan(data))
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Alert message={error} />;
  }

  if (!loan) {
    return <p>{t('home.no_loans')}</p>;
  }

  const start = loan.startDate
    ? new Date(loan.startDate).toLocaleDateString()
    : '';
  const end = loan.endDate ? new Date(loan.endDate).toLocaleDateString() : '';

  return (
    <>
      <h1 className="h1">{t('loans.title')}</h1>
      <p>
        {loan.owner?.name} → {loan.borrower?.name}
      </p>
      <p>
        {start}
        {end && ` – ${end}`}
      </p>
      <ul className="list-group mb-3">
        {loan.items?.map((it) => (
          <li key={it._id} className="list-group-item">
            {it.equipment ? `${it.equipment.name} x${it.quantity}` : ''}
          </li>
        ))}
      </ul>
      <Link to="/loans">{t('home.view_all')}</Link>
    </>
  );
}

export default LoanDetail;
