import React from 'react';
import { Link } from 'react-router-dom';
import i18n from './i18n.js';

function LoanSummaryItem({ loan }) {
  const start = loan.startDate
    ? new Date(loan.startDate).toLocaleDateString(i18n.language)
    : '';
  const end = loan.endDate
    ? new Date(loan.endDate).toLocaleDateString(i18n.language)
    : '';
  const period = start && end ? ` (${start} – ${end})` : '';
  const link = loan._id ? `/loans/${loan._id}` : '/loans';

  return (
    <li className="list-group-item">
      <Link to={link} style={{ textDecoration: 'none', color: 'inherit' }}>
        {loan.owner?.name} → {loan.borrower?.name}
        {period}
      </Link>
    </li>
  );
}

export default LoanSummaryItem;
