import React, { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDownload } from '../api';
import { GlobalContext } from '../GlobalContext.jsx';
import { downloadBlob } from '../utils';

function InvestmentsExportButton({ structureId, className = '' }) {
  const { t } = useTranslation();
  const { notify } = useContext(GlobalContext);
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);

  const selectId = useMemo(
    () => `investments-export-format-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const handleExport = async () => {
    if (!structureId) {
      notify(t('investments.export.error_structure_required'));
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ format });
      params.set('structure', String(structureId));
      const { blob, filename } = await apiDownload(
        `/reports/investments/export?${params.toString()}`,
      );
      downloadBlob(blob, filename, `investissements.${format}`);
      notify(t('investments.export.success'), 'success');
    } catch (err) {
      notify(err.message || t('investments.export.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`d-flex flex-wrap align-items-end gap-2 ${className}`.trim()}>
      <div>
        <label className="form-label mb-1" htmlFor={selectId}>
          {t('investments.export.format_label')}
        </label>
        <select
          id={selectId}
          className="form-select form-select-sm"
          value={format}
          onChange={(event) => setFormat(event.target.value)}
          disabled={loading}
        >
          <option value="csv">CSV</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? t('common.loading') : t('investments.export.button')}
      </button>
    </div>
  );
}

export default InvestmentsExportButton;
