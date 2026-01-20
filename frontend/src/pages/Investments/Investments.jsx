import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const createEmptyRow = () => ({
  item: '',
  category: '',
  description: '',
  amount: '',
  source: '',
});

function Investments() {
  const { t } = useTranslation();
  const [yearOneRows, setYearOneRows] = useState([createEmptyRow()]);
  const [yearTwoRows, setYearTwoRows] = useState([createEmptyRow()]);

  const columnLabels = useMemo(
    () => ({
      item: t('investments.table.item'),
      category: t('investments.table.category'),
      description: t('investments.table.description'),
      amount: t('investments.table.amount'),
      source: t('investments.table.source'),
      actions: t('investments.table.actions'),
    }),
    [t],
  );

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
    const parseAmount = (value) => {
      if (typeof value === 'number') return value;
      if (!value) return 0;
      const normalized = String(value).replace(',', '.');
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const totals = { year1: 0, year2: 0 };
    const byCategory = new Map();

    const addRow = (row, targetYear) => {
      const amount = parseAmount(row.amount);
      const category = row.category?.trim() || t('investments.summary.uncategorized');
      if (!byCategory.has(category)) {
        byCategory.set(category, { category, year1: 0, year2: 0, total: 0 });
      }
      const entry = byCategory.get(category);
      if (!entry) return;
      entry[targetYear] += amount;
      entry.total += amount;
      totals[targetYear] += amount;
    };

    yearOneRows.forEach((row) => addRow(row, 'year1'));
    yearTwoRows.forEach((row) => addRow(row, 'year2'));

    const categoryTotals = Array.from(byCategory.values()).sort((a, b) =>
      a.category.localeCompare(b.category, 'fr'),
    );

    return {
      totals,
      categoryTotals,
      grandTotal: totals.year1 + totals.year2,
    };
  }, [t, yearOneRows, yearTwoRows]);

  const renderTable = (rows, setRows, ariaLabel) => (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">{columnLabels.item}</th>
            <th scope="col">{columnLabels.category}</th>
            <th scope="col">{columnLabels.description}</th>
            <th scope="col">{columnLabels.amount}</th>
            <th scope="col">{columnLabels.source}</th>
            <th scope="col">{columnLabels.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
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
                <input
                  type="text"
                  className="form-control"
                  value={row.category}
                  onChange={(event) =>
                    updateRow(setRows)(index, 'category', event.target.value)
                  }
                  placeholder={t('investments.placeholders.category')}
                  aria-label={`${ariaLabel} ${columnLabels.category}`}
                />
              </td>
              <td>
                <textarea
                  className="form-control"
                  rows={2}
                  value={row.description}
                  onChange={(event) =>
                    updateRow(setRows)(index, 'description', event.target.value)
                  }
                  placeholder={t('investments.placeholders.description')}
                  aria-label={`${ariaLabel} ${columnLabels.description}`}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={row.amount}
                  onChange={(event) =>
                    updateRow(setRows)(index, 'amount', event.target.value)
                  }
                  placeholder={t('investments.placeholders.amount')}
                  aria-label={`${ariaLabel} ${columnLabels.amount}`}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="form-control"
                  value={row.source}
                  onChange={(event) =>
                    updateRow(setRows)(index, 'source', event.target.value)
                  }
                  placeholder={t('investments.placeholders.source')}
                  aria-label={`${ariaLabel} ${columnLabels.source}`}
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
          ))}
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
                    {t('investments.summary.category_totals')}
                  </p>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('investments.summary.category')}</th>
                          <th>{t('investments.summary.year1')}</th>
                          <th>{t('investments.summary.year2')}</th>
                          <th>{t('investments.summary.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.categoryTotals.length ? (
                          summary.categoryTotals.map((category) => (
                            <tr key={category.category}>
                              <td>{category.category}</td>
                              <td>{category.year1.toFixed(2)} €</td>
                              <td>{category.year2.toFixed(2)} €</td>
                              <td className="fw-semibold">{category.total.toFixed(2)} €</td>
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
