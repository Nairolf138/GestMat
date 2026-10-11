import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import Alert from '../Alert.jsx';
import { formatLoanItemLabel } from '../utils';
import { formatDate } from '../utils/dateFormat';

const actorName = (actor) =>
  [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
  actor?.username ||
  '';

export default function LoanLineDecisions({ loan, refresh }) {
  const { t } = useTranslation();
  const [choices, setChoices] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const setChoice = (lineId, field, value) =>
    setChoices((previous) => ({
      ...previous,
      [lineId]: { ...previous[lineId], [field]: value },
    }));
  const decisions = Object.entries(choices)
    .filter(([, choice]) => choice.status)
    .map(([lineId, choice]) => ({
      lineId,
      ...choice,
      expectedStatus: 'pending',
      ...(loan.items?.find((item) => item.lineId === lineId)?.decisionVersion
        ? {
            expectedVersion: loan.items.find((item) => item.lineId === lineId)
              .decisionVersion,
          }
        : {}),
    }));
  const canDecideAny = loan.items?.some(
    (item) =>
      !loan.archived &&
      item.permissions?.canDecide &&
      item.decision?.status === 'pending',
  );
  const hasMixedKinds =
    loan.items?.some((item) => item.kind === 'vehicle') &&
    loan.items?.some((item) => item.kind !== 'vehicle');
  const submit = async (event) => {
    event.preventDefault();
    if (!decisions.length || saving) return;
    setError('');
    setSaving(true);
    try {
      await api(`/loans/${loan._id}`, {
        method: 'PUT',
        body: JSON.stringify({ decisions }),
      });
      setChoices({});
      await refresh();
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="mt-2"
      aria-label={t('loans.line_decisions_form')}
    >
      <ul className="list-group mb-2">
        {(loan.items || []).map((item, index) => {
          const lineId = item.lineId || `${loan._id}:${index}`;
          const decision = item.decision || { status: loan.status };
          const canDecide =
            !loan.archived &&
            item.permissions?.canDecide &&
            decision.status === 'pending';
          const isVehicle = item.kind === 'vehicle';
          return (
            <li
              className={`list-group-item ${isVehicle ? 'loan-line-vehicle' : ''}`}
              key={lineId}
            >
              <div>
                {(isVehicle || hasMixedKinds) && (
                  <span className="loan-line-kind me-2">
                    {t(
                      `loans.resource_kind.${isVehicle ? 'vehicle' : 'equipment'}`,
                    )}
                  </span>
                )}
                <strong>{formatLoanItemLabel(item)}</strong> —{' '}
                {t(`loans.status.${decision.status}`)}
              </div>
              {actorName(decision.actor) && (
                <div className="small">
                  {actorName(decision.actor)}{' '}
                  {decision.at && `— ${formatDate(decision.at)}`}
                </div>
              )}
              {decision.note && (
                <div style={{ whiteSpace: 'pre-wrap' }}>{decision.note}</div>
              )}
              {canDecide && (
                <div className="row g-2 mt-1">
                  <div className="col-md-4">
                    <label
                      className="form-label"
                      htmlFor={`decision-${lineId}`}
                    >
                      Décision pour {formatLoanItemLabel(item)}
                    </label>
                    <select
                      id={`decision-${lineId}`}
                      className="form-select"
                      value={choices[lineId]?.status || ''}
                      onChange={(event) =>
                        setChoice(lineId, 'status', event.target.value)
                      }
                      disabled={saving}
                    >
                      <option value="">Ne pas décider maintenant</option>
                      <option value="accepted">
                        {isVehicle
                          ? t('loans.vehicle_decision.accept')
                          : t('loans.equipment_decision.accept')}
                      </option>
                      <option value="refused">
                        {isVehicle
                          ? t('loans.vehicle_decision.refuse')
                          : t('loans.equipment_decision.refuse')}
                      </option>
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label" htmlFor={`note-${lineId}`}>
                      Commentaire de décision
                    </label>
                    <input
                      id={`note-${lineId}`}
                      className="form-control"
                      maxLength={500}
                      value={choices[lineId]?.note || ''}
                      onChange={(event) =>
                        setChoice(lineId, 'note', event.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {canDecideAny && (
        <>
          <p className="small text-muted mb-2">
            {t('loans.line_decisions_hint')}
          </p>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !decisions.length}
          >
            {saving ? t('common.loading') : t('loans.line_decisions_submit')}
          </button>
        </>
      )}
      <Alert message={error} onClose={() => setError('')} />
    </form>
  );
}
