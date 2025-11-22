import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from './i18n.js';

function LoanSummaryItem({ loan, onAccept, onDecline, actionInProgressId }) {
  const { t } = useTranslation();
  const start = loan.startDate
    ? new Date(loan.startDate).toLocaleDateString(i18n.language)
    : '';
  const end = loan.endDate
    ? new Date(loan.endDate).toLocaleDateString(i18n.language)
    : '';
  const period = start && end ? ` (${start} – ${end})` : '';
  const link = loan._id ? `/loans/${loan._id}` : '/loans';
  const totalItems = loan.items?.reduce(
    (sum, it) => sum + (it.quantity || 0),
    0,
  );

  const showActions =
    loan.status === 'pending' &&
    (typeof onAccept === 'function' || typeof onDecline === 'function');
  const isProcessing = actionInProgressId === loan._id;

  return (
    <div className={`card ${loan.status}`}>
      <Link to={link} style={{ textDecoration: 'none', color: 'inherit' }}>
        {loan.owner?.name} → {loan.borrower?.name}
        {period}
      </Link>
      <div className="loan-card-info">
        <span className={`status-badge ${loan.status}`}>
          {t(`loans.status.${loan.status}`)}
        </span>
        <span className="equipment-count">
          {t('loans.items', { count: totalItems || 0 })}
        </span>
      </div>
      {showActions && (
        <div className="d-flex gap-2 flex-wrap mt-2">
          {typeof onAccept === 'function' && (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => onAccept(loan._id)}
              disabled={isProcessing}
            >
              {t('loans.accept')}
            </button>
          )}
          {typeof onDecline === 'function' && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onDecline(loan._id)}
              disabled={isProcessing}
            >
              {t('loans.refuse')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LoanSummaryItem;
