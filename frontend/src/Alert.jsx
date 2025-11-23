import React, { useEffect, useState } from 'react';

const DEFAULT_AUTO_HIDE = 4000;

function Alert({
  message,
  type = 'danger',
  autoHideDuration = DEFAULT_AUTO_HIDE,
  onClose,
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);

    if (autoHideDuration === false) return undefined;

    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, autoHideDuration || DEFAULT_AUTO_HIDE);

    return () => clearTimeout(timer);
  }, [autoHideDuration, message, onClose]);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!message || !visible) return null;

  return (
    <div className={`alert alert-${type} alert-dismissible`} role="alert">
      {message}
      <button
        type="button"
        className="btn-close"
        aria-label="Close"
        onClick={handleClose}
      />
    </div>
  );
}

export default Alert;
