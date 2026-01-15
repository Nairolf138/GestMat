import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import Alert from './Alert.jsx';
import { toLoanItemsPayload } from './utils';
import { formatDate } from './utils/dateFormat.js';

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

  const period = start && end ? `${formatDate(start)} – ${formatDate(end)}` : '';

  const promptDecisionNote = (status) => {
    if (!['accepted', 'refused'].includes(status)) return '';
    const promptMessage = t('loans.decision_note_prompt', {
      status: t(`loans.status.${status}`),
    });
    let lastInput = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-alert
      const decisionNote = window.prompt(promptMessage, lastInput);
      if (decisionNote === null) {
        return null;
      }
      if (decisionNote.length <= 500) {
        return decisionNote;
      }
      lastInput = decisionNote.slice(0, 500);
      // eslint-disable-next-line no-alert
      window.alert(t('loans.decision_note_too_long'));
    }
  };

  const changeStatus = async (status) => {
    setActionError('');
    const decisionNote = promptDecisionNote(status);
    if (decisionNote === null) return;
    const trimmedDecisionNote =
      typeof decisionNote === 'string' ? decisionNote.trim() : undefined;
    try {
      const payload =
        status === 'accepted' || status === 'refused'
          ? { status, decisionNote: trimmedDecisionNote }
          : { status };
      await api(`/loans/${loan._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
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
      startDate: loan.startDate,
      endDate: loan.endDate,
      items: toLoanItemsPayload(loan.items),
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

  const cancelLoan = async () => {
    await changeStatus('cancelled');
  };

  const borrowerCanModify = isFuture && loan.status === 'pending';
  const borrowerCanCancel =
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
          {['accepted', 'refused'].includes(loan.status) && (
            <div className="mt-1">
              <strong>{t('loans.decision_note_label')}:</strong>{' '}
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {loan.decisionNote?.trim() || t('loans.decision_note_not_provided')}
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
            <button
              onClick={cancelLoan}
              className="btn btn-danger btn-sm"
            >
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
