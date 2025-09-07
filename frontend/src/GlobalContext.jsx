import React, { createContext, useState, useEffect } from 'react';
import { api, setErrorHandler } from './api';

export const GlobalContext = createContext({
  roles: [],
  structures: [],
  notify: () => {},
});

export function GlobalProvider({ children }) {
  const [roles, setRoles] = useState([]);
  const [structures, setStructures] = useState([]);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'danger') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setErrorHandler((err) => notify(err.message));
    api('/roles', {}, false)
      .then(setRoles)
      .catch(() => setRoles([]));
    api('/structures', {}, false)
      .then(setStructures)
      .catch(() => setStructures([]));
  }, []);

  const toastStyles = {
    primary: { backgroundColor: 'var(--color-primary)', color: '#fff' },
    secondary: { backgroundColor: 'var(--color-secondary)', color: '#fff' },
    success: { backgroundColor: 'var(--color-success)', color: '#fff' },
    danger: { backgroundColor: 'var(--color-danger)', color: '#fff' },
  };

  return (
    <GlobalContext.Provider value={{ roles, structures, notify }}>
      {children}
      <div
        className="toast-container position-fixed top-0 end-0 p-3"
        style={{ zIndex: 1060 }}
      >
        {toast && (
          <div
            className="toast show"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={toastStyles[toast.type]}
          >
            <div className="d-flex">
              <div className="toast-body">{toast.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Fermer"
                onClick={() => setToast(null)}
              ></button>
            </div>
          </div>
        )}
      </div>
    </GlobalContext.Provider>
  );
}
