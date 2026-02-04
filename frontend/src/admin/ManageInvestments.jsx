import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '../Alert.jsx';
import { api } from '../api';
import { GlobalContext } from '../GlobalContext.jsx';
import {
  buildLines,
  calculateRowTotal,
  createEmptyRow,
  mapPlanToRows,
} from '../investments/investmentPlanUtils';

const resolveStructureId = (value, structures) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  const match = structures.find(
    (structure) =>
      structure._id === trimmed || structure.name?.toLowerCase() === lowered,
  );
  if (match?._id) return match._id;
  if (/^[a-fA-F0-9]{24}$/.test(trimmed)) return trimmed;
  return '';
};

function ManageInvestments() {
  const { t } = useTranslation();
  const { structures } = useContext(GlobalContext);
  const [structureInput, setStructureInput] = useState('');
  const [structureFilter, setStructureFilter] = useState('');
  const [viewMode, setViewMode] = useState('structure');
  const [allPlans, setAllPlans] = useState([]);
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [summarySortOrder, setSummarySortOrder] = useState('asc');

  const priorityOptions = useMemo(
    () => [
      { value: '4', label: t('investments.priorities.very_high') },
      { value: '3', label: t('investments.priorities.high') },
      { value: '2', label: t('investments.priorities.medium') },
      { value: '1', label: t('investments.priorities.low') },
    ],
    [t],
  );

  const allPriorityValues = useMemo(
    () => priorityOptions.map((option) => option.value),
    [priorityOptions],
  );

  const [priorityFilter, setPriorityFilter] = useState(allPriorityValues);

  const isAllPrioritiesSelected = useMemo(
    () => priorityFilter.length === allPriorityValues.length,
    [allPriorityValues.length, priorityFilter.length],
  );

  const shouldIncludePriority = useCallback(
    (priority) => {
      if (isAllPrioritiesSelected) return true;
      if (!priorityFilter.length) return false;
      const normalized = `${priority ?? ''}`.trim();
      if (!normalized) return false;
      return priorityFilter.includes(normalized);
    },
    [isAllPrioritiesSelected, priorityFilter],
  );

  const togglePriority = (value) => {
    setPriorityFilter((prev) => {
      const next = prev.includes(value)
        ? prev.filter((entry) => entry !== value)
        : [...prev, value];
      return allPriorityValues.filter((entry) => next.includes(entry));
    });
  };

  const resetPriorityFilter = () => {
    setPriorityFilter(allPriorityValues);
  };

  const selectedStructureId = useMemo(
    () => resolveStructureId(structureFilter, structures),
    [structureFilter, structures],
  );

  const selectedStructure = useMemo(
    () => structures.find((structure) => structure._id === selectedStructureId),
    [structures, selectedStructureId],
  );

  const structureNameById = useMemo(
    () =>
      new Map(
        structures.map((structure) => [
          structure._id,
          structure.name ?? structure._id,
        ]),
      ),
    [structures],
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
      priority: t('investments.table.priority'),
      amount: t('investments.table.amount'),
      actions: t('investments.table.actions'),
    }),
    [t],
  );

  const mapPlanToRowsMemo = useCallback((plan) => mapPlanToRows(plan), []);

  const loadPlans = useCallback(async () => {
    if (!selectedStructureId) {
      setYearOneRows([createEmptyRow()]);
      setYearTwoRows([createEmptyRow()]);
      setYearOneMeta({ id: null, status: 'draft' });
      setYearTwoMeta({ id: null, status: 'draft' });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ structure: selectedStructureId });
      const plans = await api(`/investments?${params.toString()}`);
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
  }, [mapPlanToRowsMemo, selectedStructureId]);

  const loadAllPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const plans = await api('/investments');
      setAllPlans(plans);
    } catch (err) {
      setError(err.message || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'global') {
      loadAllPlans();
      return;
    }
    loadPlans();
  }, [loadAllPlans, loadPlans, viewMode]);

  const updateRow = (setRows) => (index, field, value) => {
    setRows((prevRows) =>
      prevRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addRow = (setRows) => {
    setRows((prevRows) => [...prevRows, createEmptyRow()]);
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
      structure: selectedStructureId,
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
    if (!selectedStructureId) return;
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

  const filteredYearOneRows = useMemo(
    () => yearOneRows.filter((row) => shouldIncludePriority(row.priority)),
    [shouldIncludePriority, yearOneRows],
  );

  const filteredYearTwoRows = useMemo(
    () => yearTwoRows.filter((row) => shouldIncludePriority(row.priority)),
    [shouldIncludePriority, yearTwoRows],
  );

  const summary = useMemo(() => {
    const totals = { year1: 0, year2: 0 };
    const byType = new Map();
    const typeLabelMap = new Map(typeOptions.map((option) => [option.value, option.label]));

    const addRowToSummary = (row, targetYear) => {
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

    filteredYearOneRows.forEach((row) => addRowToSummary(row, 'year1'));
    filteredYearTwoRows.forEach((row) => addRowToSummary(row, 'year2'));

    const typeTotals = Array.from(byType.values()).sort((a, b) =>
      a.type.localeCompare(b.type, 'fr'),
    );

    return {
      totals,
      typeTotals,
      grandTotal: totals.year1 + totals.year2,
    };
  }, [filteredYearOneRows, filteredYearTwoRows, t, typeOptions]);

  const byStructure = useMemo(() => {
    const totals = new Map();
    allPlans.forEach((plan) => {
      if (!plan?.lines?.length) return;
      const targetYear = plan.targetYear;
      if (targetYear !== 'year1' && targetYear !== 'year2') return;
      const structureId = plan.structure?.toString() ?? plan.structure ?? '';
      const structureLabel =
        structureNameById.get(structureId) ?? structureId ?? t('users.select_structure');
      if (!structureLabel) return;
      if (!totals.has(structureLabel)) {
        totals.set(structureLabel, { structure: structureLabel, year1: 0, year2: 0 });
      }
      const entry = totals.get(structureLabel);
      if (!entry) return;
      plan.lines.forEach((line) => {
        if (!shouldIncludePriority(line.priority)) return;
        const amount = calculateRowTotal({
          quantity: line.quantity,
          unitPrice: line.unitCost ?? line.unitPrice,
        });
        entry[targetYear] += amount;
      });
    });
    return totals;
  }, [allPlans, shouldIncludePriority, structureNameById, t]);

  const summaryRows = useMemo(() => {
    const rows = Array.from(byStructure.values()).map((entry) => ({
      ...entry,
      total: entry.year1 + entry.year2,
    }));
    return rows.sort((a, b) => {
      if (a.total !== b.total) {
        return summarySortOrder === 'asc' ? a.total - b.total : b.total - a.total;
      }
      return a.structure.localeCompare(b.structure, 'fr');
    });
  }, [byStructure, summarySortOrder]);

  const summaryTotals = useMemo(
    () =>
      summaryRows.reduce(
        (acc, row) => ({
          year1: acc.year1 + row.year1,
          year2: acc.year2 + row.year2,
          total: acc.total + row.total,
        }),
        { year1: 0, year2: 0, total: 0 },
      ),
    [summaryRows],
  );

  const renderTable = (setRows, displayRows, ariaLabel) => (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">{columnLabels.item}</th>
            <th scope="col">{columnLabels.type}</th>
            <th scope="col">{columnLabels.quantity}</th>
            <th scope="col">{columnLabels.unitPrice}</th>
            <th scope="col">{columnLabels.priority}</th>
            <th scope="col">{columnLabels.amount}</th>
            <th scope="col">{columnLabels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map(({ row, index }) => {
            const rowTotal = calculateRowTotal(row);
            const displayTotal =
              rowTotal || row.quantity || row.unitPrice ? rowTotal.toFixed(2) : '';
            return (
              <tr key={row._id ?? `row-${index}`}>
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
                    type="number"
                    min="0"
                    className="form-control"
                    value={row.priority}
                    onChange={(event) =>
                      updateRow(setRows)(index, 'priority', event.target.value)
                    }
                    placeholder={columnLabels.priority}
                    aria-label={`${ariaLabel} ${columnLabels.priority}`}
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
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        onClick={() => addRow(setRows)}
      >
        {t('investments.actions.add_line')}
      </button>
    </div>
  );

  const renderGlobalSummaryTable = () => (
    <div className="table-responsive">
      <div className="d-flex justify-content-end mb-2">
        <label className="small text-muted d-flex align-items-center gap-2">
          <span>Tri</span>
          <select
            className="form-select form-select-sm"
            value={summarySortOrder}
            onChange={(event) => setSummarySortOrder(event.target.value)}
          >
            <option value="asc">Montant ascendant</option>
            <option value="desc">Montant descendant</option>
          </select>
        </label>
      </div>
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">{t('vehicles.filters.structure')}</th>
            <th scope="col">{t('investments.summary.year1')}</th>
            <th scope="col">{t('investments.summary.year2')}</th>
            <th scope="col">{t('investments.summary.total')}</th>
          </tr>
        </thead>
        <tbody>
          {summaryRows.length ? (
            summaryRows.map((row) => (
              <tr key={row.structure}>
                <td>{row.structure}</td>
                <td>{row.year1.toFixed(2)} €</td>
                <td>{row.year2.toFixed(2)} €</td>
                <td className="fw-semibold">{row.total.toFixed(2)} €</td>
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
        <tfoot>
          <tr className="fw-semibold">
            <td>Total général</td>
            <td>{summaryTotals.year1.toFixed(2)} €</td>
            <td>{summaryTotals.year2.toFixed(2)} €</td>
            <td>{summaryTotals.total.toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const yearOneDisplayRows = useMemo(
    () =>
      yearOneRows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => shouldIncludePriority(row.priority)),
    [shouldIncludePriority, yearOneRows],
  );

  const yearTwoDisplayRows = useMemo(
    () =>
      yearTwoRows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => shouldIncludePriority(row.priority)),
    [shouldIncludePriority, yearTwoRows],
  );

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
          <div>
            <h2 className="h4 mb-0">{t('admin_dashboard.tabs.investments')}</h2>
            {selectedStructure ? (
              <p className="text-muted mb-0">
                {t('structures.title')}: {selectedStructure.name}
              </p>
            ) : (
              <p className="text-muted mb-0">{t('users.select_structure')}</p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary align-self-lg-start"
            onClick={viewMode === 'global' ? loadAllPlans : loadPlans}
            disabled={loading || (viewMode === 'structure' && !selectedStructureId)}
          >
            {loading ? t('common.loading') : t('admin_dashboard.summary.refresh')}
          </button>
        </div>

        <Alert message={error} onClose={() => setError('')} />

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className={`btn ${
              viewMode === 'structure' ? 'btn-primary' : 'btn-outline-primary'
            }`}
            onClick={() => setViewMode('structure')}
          >
            {t('structures.title')}
          </button>
          <button
            type="button"
            className={`btn ${
              viewMode === 'global' ? 'btn-primary' : 'btn-outline-primary'
            }`}
            onClick={() => setViewMode('global')}
          >
            Toutes structures
          </button>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap align-items-center gap-3">
              <span className="fw-semibold">{columnLabels.priority}</span>
              {priorityOptions.map((option) => (
                <div key={option.value} className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`priority-filter-${option.value}`}
                    checked={priorityFilter.includes(option.value)}
                    onChange={() => togglePriority(option.value)}
                  />
                  <label
                    className="form-check-label"
                    htmlFor={`priority-filter-${option.value}`}
                  >
                    {option.label}
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={resetPriorityFilter}
              >
                {t('common.reset')}
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'structure' && (
          <form
            className="row g-2 align-items-end mb-4"
            onSubmit={(event) => {
              event.preventDefault();
              setStructureFilter(structureInput.trim());
            }}
          >
            <div className="col-md-6">
              <label className="form-label" htmlFor="admin-investments-structure">
                {t('vehicles.filters.structure')}
              </label>
              <input
                id="admin-investments-structure"
                className="form-control"
                list="admin-investments-structure-options"
                placeholder={t('users.select_structure')}
                value={structureInput}
                onChange={(event) => setStructureInput(event.target.value)}
              />
              <datalist id="admin-investments-structure-options">
                {structures.map((structure) => (
                  <option
                    key={structure._id}
                    value={structure.name}
                    label={structure._id}
                  />
                ))}
                {structures.map((structure) => (
                  <option
                    key={`${structure._id}-id`}
                    value={structure._id}
                    label={structure.name}
                  />
                ))}
              </datalist>
            </div>
            <div className="col-md-auto">
              <button type="submit" className="btn btn-primary">
                {t('vehicles.filters.apply')}
              </button>
            </div>
            <div className="col-md-auto">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setStructureInput('');
                  setStructureFilter('');
                }}
              >
                {t('common.reset')}
              </button>
            </div>
          </form>
        )}

        {viewMode === 'global' ? (
          <>
            <section className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h3 className="h5">{t('investments.summary.title')}</h3>
                {renderGlobalSummaryTable()}
              </div>
            </section>
          </>
        ) : selectedStructureId ? (
          <>
            <section className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h3 className="h5">{t('investments.summary.title')}</h3>
                <div className="row g-3">
                  <div className="col-12 col-lg-4">
                    <div className="border rounded p-3 bg-light h-100">
                      <p className="text-uppercase text-muted small mb-2">
                        {t('investments.summary.year_totals')}
                      </p>
                      <ul className="list-unstyled mb-0">
                        <li>
                          {t('investments.summary.year1')}:{' '}
                          {summary.totals.year1.toFixed(2)} €
                        </li>
                        <li>
                          {t('investments.summary.year2')}:{' '}
                          {summary.totals.year2.toFixed(2)} €
                        </li>
                        <li className="fw-semibold">
                          {t('investments.summary.total')}:{' '}
                          {summary.grandTotal.toFixed(2)} €
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
                              <th>{t('investments.summary.year1')}</th>
                              <th>{t('investments.summary.year2')}</th>
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
                                  <td className="fw-semibold">
                                    {type.total.toFixed(2)} €
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

            <section className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h3 className="h5">{t('investments.year_one')}</h3>
                {renderTable(
                  setYearOneRows,
                  yearOneDisplayRows,
                  t('investments.year_one'),
                )}
              </div>
            </section>

            <section className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h3 className="h5">{t('investments.year_two')}</h3>
                {renderTable(
                  setYearTwoRows,
                  yearTwoDisplayRows,
                  t('investments.year_two'),
                )}
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('common.loading') : t('investments.actions.save')}
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted">{t('users.select_structure')}</p>
        )}
      </div>
    </div>
  );
}

export default ManageInvestments;
