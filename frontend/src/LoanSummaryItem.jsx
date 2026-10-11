import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatLoanDate } from './utils/dateFormat.js';

function LoanSummaryItem({ loan, showDecisionLink = false }) {
  const { t } = useTranslation();
  const start = formatLoanDate(loan.startDate, loan);
  const end = formatLoanDate(loan.endDate, loan);
  const period =
    start && end
      ? ` (${start} – ${end}${loan.reservationMode === 'time' && loan.timeZone ? ` ${loan.timeZone}` : ''})`
      : '';
  const link = loan._id ? `/loans/${loan._id}` : '/loans';
  const ownerName = loan.owner?.name || t('home.activity.untitled');
  const borrowerName = loan.borrower?.name || t('home.activity.untitled');
  const totalItems = loan.items?.reduce(
    (sum, it) => sum + (it.kind === 'vehicle' ? 1 : it.quantity || 0),
    0,
  );
  const noteContent = loan.note?.trim();
  const decisionNoteContent = loan.decisionNote?.trim();

  const urgency = useMemo(() => {
    if (!loan.endDate) return null;
    const now = new Date();
    const endDate = new Date(loan.endDate);
    const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        tone: 'danger',
        label: t('home.urgency.overdue', { count: Math.abs(diffDays) }),
      };
    }
    if (diffDays === 0) {
      return {
        tone: 'warning',
        label: t('home.urgency.due_today'),
      };
    }
    if (diffDays <= 3) {
      return {
        tone: 'warning',
        label: t('home.urgency.due_soon', { count: diffDays }),
      };
    }
    return null;
  }, [loan.endDate, t]);

  return (
    <div className={`card ${loan.status}`}>
      <Link to={link} style={{ textDecoration: 'none', color: 'inherit' }}>
        {ownerName} → {borrowerName}
        {period}
      </Link>
      <div className="loan-card-info">
        <div className="loan-chips">
          <span className={`status-chip ${loan.status}`}>
            {t(`loans.status.${loan.status}`)}
          </span>
          {urgency && (
            <span className={`status-chip ${urgency.tone}`}>
              {urgency.label}
            </span>
          )}
        </div>
        <span className="equipment-count">
          {t('loans.items', { count: totalItems || 0 })}
        </span>
      </div>
      <div className="mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
        <strong>{t('loans.note_label')}:</strong>{' '}
        {noteContent || t('loans.note_not_provided')}
      </div>
      {['accepted', 'refused'].includes(loan.status) && (
        <div className="mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
          <strong>{t('loans.decision_note_label')}:</strong>{' '}
          {decisionNoteContent || t('loans.decision_note_not_provided')}
        </div>
      )}
      {showDecisionLink && (
        <Link to={link} className="btn btn-sm btn-outline-primary mt-2">
          {t('loans.review_lines')}
        </Link>
      )}
    </div>
  );
}

export default LoanSummaryItem;
