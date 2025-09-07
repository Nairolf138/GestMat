import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from './i18n.js';

function LoanSummaryItem({ loan }) {
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
    </div>
  );
}

export default LoanSummaryItem;
