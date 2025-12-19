import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDownload } from '../api';
import { downloadBlob } from '../utils';

const SECTION_KEYS = [
  'users',
  'inventories',
  'vehicles',
  'loansHistory',
  'structures',
];

function GlobalExportModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [format, setFormat] = useState('xlsx');
  const [email, setEmail] = useState(false);
  const [selectedSections, setSelectedSections] = useState(() =>
    SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modalClasses = useMemo(
    () => `modal fade ${open ? 'show d-block' : 'd-none'}`,
    [open],
  );

  const toggleSection = (key) => {
    setSelectedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const sections = SECTION_KEYS.filter((key) => selectedSections[key]);
    if (!sections.length) {
      setError(t('admin_export.validation.sections'));
      return;
    }
    setLoading(true);
    try {
      const { blob, filename } = await apiDownload('/admin/export', {
        method: 'POST',
        body: JSON.stringify({ sections, format, email }),
      });
      downloadBlob(
        blob,
        filename,
        `admin-export.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      );
      onSuccess?.(
        email
          ? t('admin_export.success_email')
          : t('admin_export.success_download'),
      );
      onClose?.();
    } catch (err) {
      setError(err.message || t('admin_export.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className={modalClasses} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('admin_export.title')}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label={t('common.close')}
                onClick={onClose}
                disabled={loading}
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <div className="row">
                  {SECTION_KEYS.map((key) => (
                    <div className="col-md-6" key={key}>
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`section-${key}`}
                          checked={selectedSections[key]}
                          onChange={() => toggleSection(key)}
                          disabled={loading}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`section-${key}`}
                        >
                          {t(`admin_export.sections.${key}`)}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-3 mt-2">
                  <label className="form-label" htmlFor="admin-export-format">
                    {t('admin_export.format')}
                  </label>
                  <select
                    id="admin-export-format"
                    className="form-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    disabled={loading}
                  >
                    <option value="pdf">PDF</option>
                    <option value="xlsx">XLSX</option>
                  </select>
                </div>
                <div className="form-check">
                  <input
                    id="admin-export-email"
                    className="form-check-input"
                    type="checkbox"
                    checked={email}
                    onChange={(e) => setEmail(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="admin-export-email">
                    {t('admin_export.email_me')}
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('admin_export.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

export default GlobalExportModal;
