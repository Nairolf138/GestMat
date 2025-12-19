import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDownload } from './api';
import { downloadBlob } from './utils';

const TYPE_OPTIONS = [
  { value: 'Tous', labelKey: 'equipments.export.type.all' },
  { value: 'Son', labelKey: 'equipments.export.type.sound' },
  { value: 'Lumière', labelKey: 'equipments.export.type.light' },
  { value: 'Vidéo', labelKey: 'equipments.export.type.video' },
  { value: 'Autres', labelKey: 'equipments.export.type.other' },
];
const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'XLSX' },
];

function EquipmentsExportModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [type, setType] = useState('Tous');
  const [format, setFormat] = useState('pdf');
  const [email, setEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modalClasses = useMemo(
    () => `modal fade ${open ? 'show d-block' : 'd-none'}`,
    [open],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { blob, filename } = await apiDownload('/equipments/export', {
        method: 'POST',
        body: JSON.stringify({ type, format, email }),
      });
      downloadBlob(
        blob,
        filename,
        `equipments.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      );
      onSuccess?.(
        email
          ? t('equipments.export.success_email')
          : t('equipments.export.success_download'),
      );
      onClose?.();
    } catch (err) {
      setError(err.message || t('equipments.export.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className={modalClasses} role="dialog" aria-modal="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('equipments.export.title')}</h5>
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
                <div className="mb-3">
                  <label className="form-label" htmlFor="export-type">
                    {t('equipments.export.type_label')}
                  </label>
                  <select
                    id="export-type"
                    className="form-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={loading}
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="export-format">
                    {t('equipments.export.format_label')}
                  </label>
                  <select
                    id="export-format"
                    className="form-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    disabled={loading}
                  >
                    {FORMAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-check">
                  <input
                    id="export-email"
                    className="form-check-input"
                    type="checkbox"
                    checked={email}
                    onChange={(e) => setEmail(e.target.checked)}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="export-email">
                    {t('equipments.export.email_me')}
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
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? t('common.loading') : t('equipments.export.submit')}
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

export default EquipmentsExportModal;
