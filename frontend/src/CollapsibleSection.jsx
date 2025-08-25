import React from 'react';

function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <div className="mb-3">
      <h2 className="h2">
        <button
          type="button"
          className="btn btn-link p-0"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          {isOpen ? '▼' : '▶'} {title}
        </button>
      </h2>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

export default CollapsibleSection;
