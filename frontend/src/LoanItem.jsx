import React from 'react';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import { toLoanItemsPayload } from './utils';

function LoanItem({ loan, isOwner, refresh }) {
  const { t } = useTranslation();
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
      ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
      : '';

  const changeStatus = async (status) => {
    await api(`/loans/${loan._id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    refresh();
  };

  const modifyLoan = async () => {
    const payload = {
      startDate: loan.startDate,
      endDate: loan.endDate,
      status: loan.status,
      items: toLoanItemsPayload(loan.items),
    };

    await api(`/loans/${loan._id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    refresh();
  };

  const cancelLoan = async () => {
    await changeStatus('cancelled');
  };

  const borrowerCanManage =
    isFuture && loan.status && !['cancelled', 'refused'].includes(loan.status);

  return (
    <li className="list-group-item">
      <div className="d-flex justify-content-between align-items-start">
        <div className="ms-2 me-auto">
          <div>
            {loan.owner?.name} → {loan.borrower?.name} {period && `: ${period}`}
          </div>
          <div>
            {loan.items
              ?.map((it) =>
                it.equipment ? `${it.equipment.name} x${it.quantity}` : '',
              )
              .join(', ')}
          </div>
          <div className="mt-1">
            <strong>{t('loans.note_label')}:</strong>{' '}
            <span style={{ whiteSpace: 'pre-wrap' }}>
              {loan.note?.trim() || t('loans.note_not_provided')}
            </span>
          </div>
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
      {isOwner && loan.status === 'pending' && (
        <div className="mt-2">
          <button
            onClick={() => changeStatus('accepted')}
            className="btn btn-success btn-sm me-2"
          >
            {t('loans.accept')}
          </button>
          <button
            onClick={() => changeStatus('refused')}
            className="btn btn-danger btn-sm me-2"
          >
            {t('loans.refuse')}
          </button>
          <button
            onClick={cancelLoan}
            className="btn btn-secondary btn-sm"
          >
            {t('loans.cancel')}
          </button>
        </div>
      )}
      {!isOwner && borrowerCanManage && (
        <div className="mt-2">
          <button
            onClick={modifyLoan}
            className="btn btn-primary btn-sm me-2"
          >
            {t('loans.modify')}
          </button>
          <button
            onClick={cancelLoan}
            className="btn btn-danger btn-sm"
          >
            {t('loans.cancel')}
          </button>
        </div>
      )}
    </li>
  );
}

export default LoanItem;
