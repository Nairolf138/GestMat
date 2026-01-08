import React, { useMemo } from 'react';
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
  const ownerName = loan.owner?.name || t('home.activity.untitled');
  const borrowerName = loan.borrower?.name || t('home.activity.untitled');
  const totalItems = loan.items?.reduce(
    (sum, it) => sum + (it.quantity || 0),
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

  const showActions =
    loan.status === 'pending' && (typeof onAccept === 'function' || typeof onDecline === 'function');
  const isProcessing = actionInProgressId === loan._id;

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
          {urgency && <span className={`status-chip ${urgency.tone}`}>{urgency.label}</span>}
        </div>
        <span className="equipment-count">
          {t('loans.items', { count: totalItems || 0 })}
        </span>
      </div>
      <div className="mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
        <strong>{t('loans.note_label')}:</strong> {noteContent || t('loans.note_not_provided')}
      </div>
      {['accepted', 'refused'].includes(loan.status) && (
        <div className="mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
          <strong>{t('loans.decision_note_label')}:</strong>{' '}
          {decisionNoteContent || t('loans.decision_note_not_provided')}
        </div>
      )}
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
