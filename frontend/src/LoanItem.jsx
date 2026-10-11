import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import Alert from './Alert.jsx';
import LoanLineDecisions from './components/LoanLineDecisions.jsx';
import { toLoanItemsPayload } from './utils';
import { formatLoanDate } from './utils/dateFormat.js';

function LoanItem({ loan, isOwner, refresh }) {
  const { t } = useTranslation();
  const [actionError, setActionError] = useState('');
  const start = loan.startDate ? new Date(loan.startDate) : null;
  const end = loan.endDate ? new Date(loan.endDate) : null;
  const now = new Date();
  const isFuture = start && start > now;

  const statusStyles = {
    pending: {
      backgroundColor: 'var(--color-secondary)',
      color: '#fff',
    },
    accepted: {
      backgroundColor: 'var(--color-success)',
      color: '#fff',
    },
    refused: {
      backgroundColor: 'var(--color-danger)',
      color: '#fff',
    },
  };

  const period =
    start && end
      ? `${formatLoanDate(start, loan)} – ${formatLoanDate(end, loan)}`
      : '';
  const hasVehicle = loan.items?.some((item) => item.kind === 'vehicle');
  const hasEquipment = loan.items?.some((item) => item.kind !== 'vehicle');
  const requestKind = hasVehicle ? (hasEquipment ? 'mixed' : 'vehicle') : null;

  const cancelLoan = async () => {
    setActionError('');
    try {
      await api(`/loans/${loan._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      refresh();
    } catch (err) {
      setActionError(err.message || t('common.error'));
    }
  };

  const modifyLoan = async () => {
    if (!borrowerCanModify) {
      setActionError(
        t('loans.modify_not_allowed', {
          defaultValue: 'This request cannot be modified.',
        }),
      );
      return;
    }

    setActionError('');
    const payload = {
      ...(loan.permissions ? { expectedRevision: loan.revision || 0 } : {}),
      startDate: loan.startDate,
      endDate: loan.endDate,
      items: toLoanItemsPayload(
        loan.items?.filter(
          (item) => !['cancelled', 'refused'].includes(item.decision?.status),
        ),
      ),
    };

    try {
      await api(`/loans/${loan._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      refresh();
    } catch (err) {
      setActionError(err.message || t('common.error'));
    }
  };

  const closedStatuses = ['cancelled', 'refused'];
  const borrowerCanModify =
    loan.permissions?.canEdit ?? (isFuture && loan.status === 'pending');
  const borrowerCanCancel =
    loan.permissions?.canCancel ??
    (Boolean(loan.status) &&
      !closedStatuses.includes(loan.status) &&
      (loan.status === 'pending' || isFuture));

  return (
    <li className="list-group-item">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div className="ms-2 me-auto loan-request-heading">
          {requestKind && (
            <div className="mb-2">
              <span className={`loan-request-kind ${requestKind}`}>
                {t(`loans.request_kind.${requestKind}`)}
              </span>
            </div>
          )}
          <div>
            {loan.owner?.name} → {loan.borrower?.name}{' '}
            {!hasVehicle && period && `: ${period}`}
          </div>
          {hasVehicle && period && (
            <div className="mt-1 loan-request-period">
              <strong>{t('loans.requested_slot')} :</strong> {period}
              {loan.reservationMode === 'time' &&
                loan.timeZone &&
                ` (${loan.timeZone})`}
            </div>
          )}
          <div className="mt-1">
            <strong>{t('loans.note_label')}:</strong>{' '}
            <span style={{ whiteSpace: 'pre-wrap' }}>
              {loan.note?.trim() || t('loans.note_not_provided')}
            </span>
          </div>
          {['accepted', 'refused'].includes(loan.status) && (
            <div className="mt-1">
              <strong>{t('loans.decision_note_label')}:</strong>{' '}
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {loan.decisionNote?.trim() ||
                  t('loans.decision_note_not_provided')}
              </span>
            </div>
          )}
        </div>
        <span
          className="badge rounded-pill"
          style={
            statusStyles[loan.status] || {
              backgroundColor: 'var(--color-secondary)',
              color: '#fff',
            }
          }
        >
          {t(`loans.status.${loan.status}`)}
        </span>
      </div>
      <LoanLineDecisions loan={loan} refresh={refresh} />
      {!isOwner && (borrowerCanModify || borrowerCanCancel) && (
        <div className="mt-2">
          {borrowerCanModify && (
            <button
              onClick={modifyLoan}
              className="btn btn-primary btn-sm me-2"
            >
              {t('loans.modify')}
            </button>
          )}
          {borrowerCanCancel && (
            <button onClick={cancelLoan} className="btn btn-danger btn-sm">
              {t('loans.cancel')}
            </button>
          )}
        </div>
      )}
      <Alert message={actionError} onClose={() => setActionError('')} />
    </li>
  );
}

export default LoanItem;
