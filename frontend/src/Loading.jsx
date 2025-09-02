import React from 'react';
import { useTranslation } from 'react-i18next';

function Loading() {
  const { t } = useTranslation();
  return (
    <div className="d-flex justify-content-center py-3">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">{t('common.loading')}</span>
      </div>
    </div>
  );
}

export default Loading;
