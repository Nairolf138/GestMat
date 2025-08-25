import React from 'react';

function FormCard({ children, ...props }) {
  return (
    <div className="form-card-container">
      <div className="card form-card">
        <form {...props}>{children}</form>
      </div>
    </div>
  );
}

export default FormCard;
