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
  const submit = async (event) => {
    event.preventDefault();
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
      aria-label="Décisions par matériel"
    >
      <ul className="list-group mb-2">
        {(loan.items || []).map((item, index) => {
          const lineId = item.lineId || `${loan._id}:${index}`;
          const decision = item.decision || { status: loan.status };
          const canDecide =
            !loan.archived &&
            item.permissions?.canDecide &&
            decision.status === 'pending';
          return (
            <li className="list-group-item" key={lineId}>
              <div>
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
                      <option value="accepted">Accepter toute la ligne</option>
                      <option value="refused">Refuser toute la ligne</option>
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
      {!!decisions.length && (
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t('common.loading') : 'Enregistrer les décisions'}
        </button>
      )}
      <Alert message={error} onClose={() => setError('')} />
    </form>
  );
}
