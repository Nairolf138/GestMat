import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '../../Alert.jsx';
import { api } from '../../api';
import {
  buildLines,
  calculateRowTotal,
  createEmptyRow,
  isRowEmpty,
  mapPlanToRows,
} from '../../investments/investmentPlanUtils';

function Investments() {
  const { t } = useTranslation();
  const [yearOneRows, setYearOneRows] = useState([createEmptyRow()]);
  const [yearTwoRows, setYearTwoRows] = useState([createEmptyRow()]);
  const [yearOneMeta, setYearOneMeta] = useState({
    id: null,
    status: 'draft',
  });
  const [yearTwoMeta, setYearTwoMeta] = useState({
    id: null,
    status: 'draft',
  });
  const [newWish, setNewWish] = useState({
    ...createEmptyRow(),
    targetYear: 'year1',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const yearLabels = useMemo(
    () => ({
      year1: t('investments.year_one', { year: currentYear }),
      year2: t('investments.year_two', { year: currentYear + 1 }),
    }),
    [t, currentYear],
  );

  const typeOptions = useMemo(
    () => [
      { value: 'sound', label: t('investments.types.sound') },
      { value: 'light', label: t('investments.types.light') },
      { value: 'stage', label: t('investments.types.stage') },
      { value: 'video', label: t('investments.types.video') },
      { value: 'other', label: t('investments.types.other') },
    ],
    [t],
  );

  const columnLabels = useMemo(
    () => ({
      item: t('investments.table.item'),
      type: t('investments.table.type'),
      quantity: t('investments.table.quantity'),
      unitPrice: t('investments.table.unit_price'),
      amount: t('investments.table.amount'),
      actions: t('investments.table.actions'),
    }),
    [t],
  );

  const mapPlanToRowsMemo = useCallback((plan) => mapPlanToRows(plan), []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const plans = await api('/investments');
      const yearOnePlan = plans.find((plan) => plan.targetYear === 'year1');
      const yearTwoPlan = plans.find((plan) => plan.targetYear === 'year2');
      setYearOneRows(mapPlanToRowsMemo(yearOnePlan));
      setYearTwoRows(mapPlanToRowsMemo(yearTwoPlan));
      setYearOneMeta({
        id: yearOnePlan?._id ?? null,
        status: yearOnePlan?.status ?? 'draft',
      });
      setYearTwoMeta({
        id: yearTwoPlan?._id ?? null,
        status: yearTwoPlan?.status ?? 'draft',
      });
    } catch (err) {
      setError(err.message || '');
    } finally {
      setLoading(false);
    }
  }, [mapPlanToRowsMemo]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const updateRow = (setRows) => (index, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const removeRow = (setRows) => (index) => {
    setRows((prevRows) => {
      if (prevRows.length === 1) {
        return [createEmptyRow()];
      }
      return prevRows.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const resetAll = () => {
    setYearOneRows([createEmptyRow()]);
    setYearTwoRows([createEmptyRow()]);
    setNewWish({
      ...createEmptyRow(),
      targetYear: 'year1',
    });
  };

  const appendRow = (setRows, row) => {
    setRows((prevRows) => {
      if (prevRows.length === 1 && isRowEmpty(prevRows[0])) {
        return [row];
      }
      return [...prevRows, row];
    });
  };

  const updateNewWish = (field) => (event) => {
    const value = event.target.value;
    setNewWish((prevWish) => ({
      ...prevWish,
      [field]: value,
    }));
  };

  const handleAddWish = () => {
    const row = {
      ...createEmptyRow(),
      item: newWish.item,
      type: newWish.type,
      quantity: newWish.quantity,
      unitPrice: newWish.unitPrice,
      priority: newWish.priority,
      justification: newWish.justification,
    };
    if (isRowEmpty(row)) {
      return;
    }
    if (newWish.targetYear === 'year2') {
      appendRow(setYearTwoRows, row);
    } else {
      appendRow(setYearOneRows, row);
    }
    setNewWish({
      ...createEmptyRow(),
      targetYear: newWish.targetYear,
    });
  };

  const persistPlan = async (targetYear, rows, meta) => {
    const lines = buildLines(rows, targetYear);
    if (!lines.length) {
      if (meta.id) {
        await api(`/investments/${meta.id}`, { method: 'DELETE' });
      }
      return;
    }
    const payload = {
      targetYear,
      status: meta.status ?? 'draft',
      lines,
    };
    if (meta.id) {
      await api(`/investments/${meta.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return;
    }
    await api('/investments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await persistPlan('year1', yearOneRows, yearOneMeta);
      await persistPlan('year2', yearTwoRows, yearTwoMeta);
      await loadPlans();
    } catch (err) {
      setError(err.message || '');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const totals = { year1: 0, year2: 0 };
    const byType = new Map();
    const typeLabelMap = new Map(typeOptions.map((option) => [option.value, option.label]));

    const addRow = (row, targetYear) => {
      const amount = calculateRowTotal(row);
      const typeValue = row.type?.trim();
      const typeLabel = typeLabelMap.get(typeValue) || typeValue || t('investments.summary.untyped');
      if (!byType.has(typeLabel)) {
        byType.set(typeLabel, { type: typeLabel, year1: 0, year2: 0, total: 0 });
      }
      const entry = byType.get(typeLabel);
      if (!entry) return;
      entry[targetYear] += amount;
      entry.total += amount;
      totals[targetYear] += amount;
    };

    yearOneRows.forEach((row) => addRow(row, 'year1'));
    yearTwoRows.forEach((row) => addRow(row, 'year2'));

    const typeTotals = Array.from(byType.values()).sort((a, b) =>
      a.type.localeCompare(b.type, 'fr'),
    );

    return {
      totals,
      typeTotals,
      grandTotal: totals.year1 + totals.year2,
    };
  }, [t, yearOneRows, yearTwoRows, typeOptions]);

  const summaryYearLabels = useMemo(
    () => ({
      year1: t('investments.summary.year1', { year: currentYear }),
      year2: t('investments.summary.year2', { year: currentYear + 1 }),
    }),
    [t, currentYear],
  );

  const renderTable = (rows, setRows, ariaLabel) => (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">{columnLabels.item}</th>
            <th scope="col">{columnLabels.type}</th>
            <th scope="col">{columnLabels.quantity}</th>
            <th scope="col">{columnLabels.unitPrice}</th>
            <th scope="col">{columnLabels.amount}</th>
            <th scope="col">{columnLabels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowTotal = calculateRowTotal(row);
            const displayTotal =
              rowTotal || row.quantity || row.unitPrice ? rowTotal.toFixed(2) : '';
            return (
              <tr key={`row-${index}`}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={row.item}
                    onChange={(event) =>
                      updateRow(setRows)(index, 'item', event.target.value)
                    }
                    placeholder={t('investments.placeholders.item')}
                    aria-label={`${ariaLabel} ${columnLabels.item}`}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    value={row.type}
                    onChange={(event) =>
                      updateRow(setRows)(index, 'type', event.target.value)
                    }
                    aria-label={`${ariaLabel} ${columnLabels.type}`}
                  >
                    <option value="">{t('investments.placeholders.type')}</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={row.quantity}
                    onChange={(event) =>
                      updateRow(setRows)(index, 'quantity', event.target.value)
                    }
                    placeholder={t('investments.placeholders.quantity')}
                    aria-label={`${ariaLabel} ${columnLabels.quantity}`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={row.unitPrice}
                    onChange={(event) =>
                      updateRow(setRows)(index, 'unitPrice', event.target.value)
                    }
                    placeholder={t('investments.placeholders.unit_price')}
                    aria-label={`${ariaLabel} ${columnLabels.unitPrice}`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={displayTotal}
                    readOnly
                    aria-label={`${ariaLabel} ${columnLabels.amount}`}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => removeRow(setRows)(index)}
                  >
                    {t('investments.actions.remove_line')}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="py-4">
      <header className="mb-4">
        <h1 className="h3 fw-bold">{t('investments.title')}</h1>
        <p className="text-muted mb-0">{t('investments.subtitle')}</p>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm mt-3"
          onClick={loadPlans}
          disabled={loading}
        >
          {loading ? t('common.loading') : t('admin_dashboard.summary.refresh')}
        </button>
      </header>

      <Alert message={error} onClose={() => setError('')} />

      <form
        className="d-grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{t('investments.summary.title')}</h2>
            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <div className="border rounded p-3 bg-light h-100">
                  <p className="text-uppercase text-muted small mb-2">
                    {t('investments.summary.year_totals')}
                  </p>
                  <ul className="list-unstyled mb-0">
                    <li>
                      {summaryYearLabels.year1}: {summary.totals.year1.toFixed(2)} €
                    </li>
                    <li>
                      {summaryYearLabels.year2}: {summary.totals.year2.toFixed(2)} €
                    </li>
                    <li className="fw-semibold">
                      {t('investments.summary.total')}: {summary.grandTotal.toFixed(2)} €
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-12 col-lg-8">
                <div className="border rounded p-3 h-100">
                  <p className="text-uppercase text-muted small mb-2">
                    {t('investments.summary.type_totals')}
                  </p>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('investments.summary.type')}</th>
                          <th>{summaryYearLabels.year1}</th>
                          <th>{summaryYearLabels.year2}</th>
                          <th>{t('investments.summary.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.typeTotals.length ? (
                          summary.typeTotals.map((type) => (
                            <tr key={type.type}>
                              <td>{type.type}</td>
                              <td>{type.year1.toFixed(2)} €</td>
                              <td>{type.year2.toFixed(2)} €</td>
                              <td className="fw-semibold">{type.total.toFixed(2)} €</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-muted">
                              {t('investments.summary.empty')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{t('investments.form.title')}</h2>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-lg-4">
                <label className="form-label" htmlFor="investment-item">
                  {columnLabels.item}
                </label>
                <input
                  id="investment-item"
                  type="text"
                  className="form-control"
                  value={newWish.item}
                  onChange={updateNewWish('item')}
                  placeholder={t('investments.placeholders.item')}
                />
              </div>
              <div className="col-12 col-lg-3">
                <label className="form-label" htmlFor="investment-type">
                  {columnLabels.type}
                </label>
                <select
                  id="investment-type"
                  className="form-select"
                  value={newWish.type}
                  onChange={updateNewWish('type')}
                >
                  <option value="">{t('investments.placeholders.type')}</option>
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="investment-quantity">
                  {columnLabels.quantity}
                </label>
                <input
                  id="investment-quantity"
                  type="number"
                  min="0"
                  className="form-control"
                  value={newWish.quantity}
                  onChange={updateNewWish('quantity')}
                  placeholder={t('investments.placeholders.quantity')}
                />
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="investment-unit-price">
                  {columnLabels.unitPrice}
                </label>
                <input
                  id="investment-unit-price"
                  type="number"
                  min="0"
                  className="form-control"
                  value={newWish.unitPrice}
                  onChange={updateNewWish('unitPrice')}
                  placeholder={t('investments.placeholders.unit_price')}
                />
              </div>
              <div className="col-12 col-lg-1">
                <label className="form-label" htmlFor="investment-year">
                  {t('investments.form.year_label')}
                </label>
                <select
                  id="investment-year"
                  className="form-select"
                  value={newWish.targetYear}
                  onChange={updateNewWish('targetYear')}
                >
                  <option value="year1">{yearLabels.year1}</option>
                  <option value="year2">{yearLabels.year2}</option>
                </select>
              </div>
              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleAddWish}
                >
                  {t('investments.actions.add_wish')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{yearLabels.year1}</h2>
            {renderTable(yearOneRows, setYearOneRows, yearLabels.year1)}
          </div>
        </section>

        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{yearLabels.year2}</h2>
            {renderTable(yearTwoRows, setYearTwoRows, yearLabels.year2)}
          </div>
        </section>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={resetAll}
            disabled={saving}
          >
            {t('investments.actions.reset')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('common.loading') : t('investments.actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Investments;
