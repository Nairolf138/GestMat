import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LoanPreviewSection from './LoanPreviewSection.jsx';

function LoanSectionsTabs({
  sections = [],
  loading = false,
  previewCount = 5,
  onAccept,
  onDecline,
  actionInProgressId,
}) {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState(sections[0]?.key);
  const [sortKey, setSortKey] = useState('startDate');

  const activeSection =
    sections.find((section) => section.key === activeKey) || sections[0];

  const sortedLoans = useMemo(() => {
    if (!activeSection?.loans) return [];
    return [...activeSection.loans].sort((a, b) => {
      const aDate = a[sortKey] ? new Date(a[sortKey]) : null;
      const bDate = b[sortKey] ? new Date(b[sortKey]) : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return bDate - aDate;
    });
  }, [activeSection, sortKey]);

  if (!sections.length) return null;

  const sortOptions = [
    { value: 'startDate', label: t('home.sort.start_date') },
    { value: 'endDate', label: t('home.sort.end_date') },
    { value: 'createdAt', label: t('home.sort.created_at') },
  ];

  return (
    <div className="loan-tabs">
      <div className="loan-tabs-header">
        <div className="loan-tab-list" role="tablist">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={section.key === activeSection?.key}
              className={`loan-tab ${section.key === activeSection?.key ? 'active' : ''}`}
              onClick={() => setActiveKey(section.key)}
            >
              <span>{section.title}</span>
              <span className="loan-tab-count">{section.loans.length}</span>
            </button>
          ))}
        </div>
        <label className="loan-sort">
          <span>{t('home.sort.label')}</span>
          <select
            className="form-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <LoanPreviewSection
        title={activeSection?.title}
        loans={sortedLoans}
        emptyMessage={activeSection?.emptyMessage}
        previewCount={previewCount}
        onAccept={activeSection?.onAccept || onAccept}
        onDecline={activeSection?.onDecline || onDecline}
        actionInProgressId={actionInProgressId}
        loading={loading}
        counterLabel={
          sortedLoans.length > previewCount
            ? t('home.counter', {
                shown: previewCount,
                total: sortedLoans.length,
                category: activeSection?.title?.toLowerCase(),
              })
            : ''
        }
      />
    </div>
  );
}

export default LoanSectionsTabs;
