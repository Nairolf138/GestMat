import React from 'react';

function LoanPreviewSkeleton() {
  return (
    <div className="card loan-skeleton" aria-hidden="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text short" />
      <div className="skeleton skeleton-pill-group">
        <span className="skeleton skeleton-pill" />
        <span className="skeleton skeleton-pill" />
      </div>
    </div>
  );
}

export default LoanPreviewSkeleton;
