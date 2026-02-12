import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '../../Alert.jsx';
import { api } from '../../api';
import { AuthContext } from '../../AuthContext.jsx';
import { GlobalContext } from '../../GlobalContext.jsx';
import {
  buildLines,
  calculateRowTotal,
  createEmptyRow,
  isRowEmpty,
  mapPlanToRows,
} from '../../investments/investmentPlanUtils';

function Investments() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const { notify } = useContext(GlobalContext);
  const structureId = useMemo(() => user?.structure?._id || user?.structure, [user]);
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
    priority: '1',
  });
  const [showWishForm, setShowWishForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editForm, setEditForm] = useState(createEmptyRow());
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

  const typeLabelMap = useMemo(
    () => new Map(typeOptions.map((option) => [option.value, option.label])),
    [typeOptions],
  );

  const priorityOptions = useMemo(
    () => [
      { value: '4', label: t('investments.priorities.very_high') },
      { value: '3', label: t('investments.priorities.high') },
      { value: '2', label: t('investments.priorities.medium') },
      { value: '1', label: t('investments.priorities.low') },
    ],
    [t],
  );

  const columnLabels = useMemo(
    () => ({
      item: t('investments.table.item'),
      type: t('investments.table.type'),
      quantity: t('investments.table.quantity'),
      unitPrice: t('investments.table.unit_price'),
      priority: t('investments.table.priority'),
      amount: t('investments.table.amount'),
      actions: t('investments.table.actions'),
    }),
    [t],
  );

  const mapPlanToRowsMemo = useCallback((plan) => mapPlanToRows(plan), []);

  const loadPlans = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ structure: String(structureId) });
      const plans = await api(`/investments?${query.toString()}`);
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
      setEditingRowId(null);
      setEditForm(createEmptyRow());
    } catch (err) {
      setError(err.message || '');
    } finally {
      setLoading(false);
    }
  }, [mapPlanToRowsMemo, structureId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const removeRow = (setRows) => (index) => {
    setRows((prevRows) => {
      if (prevRows.length === 1) {
        return [createEmptyRow()];
      }
      return prevRows.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const updateNewWish = (field) => (event) => {
    const value = event.target.value;
    setNewWish((prevWish) => ({
      ...prevWish,
      [field]: value,
    }));
  };

  const updateEditForm = (field) => (event) => {
    const value = event.target.value;
    setEditForm((prevForm) => ({
      ...prevForm,
      [field]: value,
    }));
  };

  const buildRowId = (tableKey, index) => `${tableKey}-${index}`;

  const startEdit = (tableKey, index, row) => {
    setEditingRowId(buildRowId(tableKey, index));
    setEditForm({
      ...createEmptyRow(),
      ...row,
    });
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditForm(createEmptyRow());
  };

  const saveEdit = (setRows, index) => {
    setRows((prevRows) =>
      prevRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...editForm } : row,
      ),
    );
    setEditingRowId(null);
    setEditForm(createEmptyRow());
  };

  const handleRemoveRow = (setRows, tableKey, index) => {
    const rowId = buildRowId(tableKey, index);
    if (editingRowId === rowId) {
      cancelEdit();
    }
    removeRow(setRows)(index);
  };

  const handleAddWish = async () => {
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
    setError('');
    const targetYear = newWish.targetYear === 'year2' ? 'year2' : 'year1';
    const currentRows = targetYear === 'year2' ? yearTwoRows : yearOneRows;
    const currentMeta = targetYear === 'year2' ? yearTwoMeta : yearOneMeta;
    const nextRows =
      currentRows.length === 1 && isRowEmpty(currentRows[0])
        ? [row]
        : [...currentRows, row];
    try {
      await persistPlan(targetYear, nextRows, currentMeta);
      await loadPlans();
      setNewWish({
        ...createEmptyRow(),
        targetYear,
        priority: '1',
      });
      setShowWishForm(false);
      notify(t('investments.form.add_success'), 'success');
    } catch (err) {
      setError(err.message || '');
    }
  };

  const persistPlan = async (targetYear, rows, meta) => {
    const lines = buildLines(rows, targetYear, structureId);
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

  const formatCurrency = useCallback(
    (value) =>
      Number(value || 0).toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }),
    [],
  );

  const renderTable = (rows, setRows, ariaLabel, tableKey) => (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">{columnLabels.item}</th>
            <th scope="col">{columnLabels.type}</th>
            <th scope="col" className="text-end">
              {columnLabels.quantity}
            </th>
            <th scope="col" className="text-end">
              {columnLabels.unitPrice}
            </th>
            <th scope="col" className="text-end">
              {columnLabels.amount}
            </th>
            <th scope="col">{columnLabels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = buildRowId(tableKey, index);
            const isEditing = editingRowId === rowId;
            const rowForTotal = isEditing ? editForm : row;
            const rowTotal = calculateRowTotal(rowForTotal);
            const displayTotal =
              rowTotal || rowForTotal.quantity || rowForTotal.unitPrice
                ? formatCurrency(rowTotal)
                : '';
            const typeLabel = typeLabelMap.get(row.type) || row.type || '';
            return (
              <tr key={`row-${index}`}>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.item}
                      onChange={updateEditForm('item')}
                      placeholder={t('investments.placeholders.item')}
                      aria-label={`${ariaLabel} ${columnLabels.item}`}
                    />
                  ) : (
                    row.item
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select
                      className="form-select"
                      value={editForm.type}
                      onChange={updateEditForm('type')}
                      aria-label={`${ariaLabel} ${columnLabels.type}`}
                    >
                      <option value="">{t('investments.placeholders.type')}</option>
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    typeLabel
                  )}
                </td>
                <td className="text-end">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editForm.quantity}
                      onChange={updateEditForm('quantity')}
                      placeholder={t('investments.placeholders.quantity')}
                      aria-label={`${ariaLabel} ${columnLabels.quantity}`}
                    />
                  ) : (
                    row.quantity
                  )}
                </td>
                <td className="text-end">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editForm.unitPrice}
                      onChange={updateEditForm('unitPrice')}
                      placeholder={t('investments.placeholders.unit_price')}
                      aria-label={`${ariaLabel} ${columnLabels.unitPrice}`}
                    />
                  ) : (
                    row.unitPrice || row.unitPrice === 0 ? formatCurrency(row.unitPrice) : ''
                  )}
                </td>
                <td className="text-end">
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-control"
                      value={displayTotal}
                      readOnly
                      aria-label={`${ariaLabel} ${columnLabels.amount}`}
                    />
                  ) : (
                    displayTotal
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => saveEdit(setRows, index)}
                      >
                        {t('investments.actions.save_line')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={cancelEdit}
                      >
                        {t('investments.actions.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => startEdit(tableKey, index, row)}
                      >
                        {t('investments.actions.edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleRemoveRow(setRows, tableKey, index)}
                      >
                        {t('investments.actions.delete')}
                      </button>
                    </div>
                  )}
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

      <div className="d-grid gap-4">
        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{t('investments.summary.title')}</h2>
            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <div className="border rounded p-3 bg-light h-100">
                  <p className="text-uppercase text-muted small mb-2">
                    {summaryYearLabels.year1}
                  </p>
                  <p className="h4 fw-bold mb-0">
                    {formatCurrency(summary.totals.year1)}
                  </p>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="border rounded p-3 bg-light h-100">
                  <p className="text-uppercase text-muted small mb-2">
                    {summaryYearLabels.year2}
                  </p>
                  <p className="h4 fw-bold mb-0">
                    {formatCurrency(summary.totals.year2)}
                  </p>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="border rounded p-3 bg-light h-100">
                  <p className="text-uppercase text-muted small mb-2">
                    {t('investments.summary.total')}
                  </p>
                  <p className="h4 fw-bold mb-0">
                    {formatCurrency(summary.grandTotal)}
                  </p>
                </div>
              </div>
              <div className="col-12">
                <div className="border rounded p-3 h-100">
                  <p className="text-uppercase text-muted small mb-2">
                    {t('investments.summary.type_totals')}
                  </p>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('investments.summary.type')}</th>
                          <th className="text-end">{summaryYearLabels.year1}</th>
                          <th className="text-end">{summaryYearLabels.year2}</th>
                          <th className="text-end">{t('investments.summary.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.typeTotals.length ? (
                          summary.typeTotals.map((type) => (
                            <tr key={type.type}>
                              <td>{type.type}</td>
                              <td className="text-end">{formatCurrency(type.year1)}</td>
                              <td className="text-end">{formatCurrency(type.year2)}</td>
                              <td className="text-end fw-semibold">
                                {formatCurrency(type.total)}
                              </td>
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

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowWishForm((prev) => !prev)}
          >
            {showWishForm
              ? t('investments.form.toggle_hide')
              : t('investments.form.toggle_show')}
          </button>
        </div>

        {showWishForm && (
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
                <div className="col-6 col-lg-2">
                  <label className="form-label" htmlFor="investment-priority">
                    {columnLabels.priority}
                  </label>
                  <select
                    id="investment-priority"
                    className="form-select"
                    value={newWish.priority}
                    onChange={updateNewWish('priority')}
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                    className="btn btn-primary"
                    onClick={handleAddWish}
                  >
                    {t('investments.actions.add_wish')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{yearLabels.year1}</h2>
            {renderTable(yearOneRows, setYearOneRows, yearLabels.year1, 'year1')}
          </div>
        </section>

        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{yearLabels.year2}</h2>
            {renderTable(yearTwoRows, setYearTwoRows, yearLabels.year2, 'year2')}
          </div>
        </section>

      </div>
    </div>
  );
}

export default Investments;
