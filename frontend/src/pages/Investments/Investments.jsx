import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const createEmptyRow = () => ({
  item: '',
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

  const renderTable = (rows, setRows, ariaLabel) => (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">{columnLabels.item}</th>
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
