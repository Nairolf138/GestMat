import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const createEmptyRow = () => ({
  item: '',
  type: '',
  quantity: '',
  unitPrice: '',
});

function Investments() {
  const { t } = useTranslation();
  const [yearOneRows, setYearOneRows] = useState([createEmptyRow()]);
  const [yearTwoRows, setYearTwoRows] = useState([createEmptyRow()]);

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

  const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const normalized = String(value).replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const calculateRowTotal = (row) => {
    const quantity = parseNumber(row.quantity);
    const unitPrice = parseNumber(row.unitPrice);
    return quantity * unitPrice;
  };

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
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        onClick={() => addRow(setRows)}
      >
        {t('investments.actions.add_line')}
      </button>
    </div>
  );

  return (
    <div className="py-4">
      <header className="mb-4">
        <h1 className="h3 fw-bold">{t('investments.title')}</h1>
        <p className="text-muted mb-0">{t('investments.subtitle')}</p>
      </header>

      <form className="d-grid gap-4" onSubmit={(event) => event.preventDefault()}>
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
                      {t('investments.summary.year1')}: {summary.totals.year1.toFixed(2)} €
                    </li>
                    <li>
                      {t('investments.summary.year2')}: {summary.totals.year2.toFixed(2)} €
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
            <h2 className="h5">{t('investments.year_one')}</h2>
            {renderTable(yearOneRows, setYearOneRows, t('investments.year_one'))}
          </div>
        </section>

        <section className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5">{t('investments.year_two')}</h2>
            {renderTable(yearTwoRows, setYearTwoRows, t('investments.year_two'))}
          </div>
        </section>

        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={resetAll}>
            {t('investments.actions.reset')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('investments.actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Investments;
