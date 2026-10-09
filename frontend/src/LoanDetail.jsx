import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import Loading from './Loading.jsx';
import Alert from './Alert.jsx';
import { formatDate } from './utils/dateFormat.js';
import LoanLineDecisions from './components/LoanLineDecisions.jsx';

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

  const start = formatDate(loan.startDate);
  const end = formatDate(loan.endDate);
  const noteContent = loan.note?.trim();
  const decisionNoteContent = loan.decisionNote?.trim();

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
      <p>
        <strong>{t('loans.note_label')}:</strong>{' '}
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {noteContent || t('loans.note_not_provided')}
        </span>
      </p>
      {['accepted', 'refused'].includes(loan.status) && (
        <p>
          <strong>{t('loans.decision_note_label')}:</strong>{' '}
          <span style={{ whiteSpace: 'pre-wrap' }}>
            {decisionNoteContent || t('loans.decision_note_not_provided')}
          </span>
        </p>
      )}
      <LoanLineDecisions
        loan={loan}
        refresh={() => api(`/loans/${id}`).then(setLoan)}
      />
      {!!loan.history?.length && (
        <details className="mb-3">
          <summary>Historique des actions</summary>
          <ul>
            {loan.history.map((event, index) => (
              <li key={index}>
                {formatDate(event.at)} —{' '}
                {[event.actor?.firstName, event.actor?.lastName]
                  .filter(Boolean)
                  .join(' ') || event.actor?.username}{' '}
                — {event.action}
                {event.resourceName && ` — ${event.resourceName}`}
                {event.quantity && ` ×${event.quantity}`}
                {event.note && ` — ${event.note}`}
              </li>
            ))}
          </ul>
        </details>
      )}
      <Link to="/loans">{t('home.view_all')}</Link>
    </>
  );
}

export default LoanDetail;
