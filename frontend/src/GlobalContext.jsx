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
    api('/roles', {}, false).then(setRoles).catch(() => setRoles([]));
    api('/structures', {}, false).then(setStructures).catch(() => setStructures([]));
  }, []);

  return (
    <GlobalContext.Provider value={{ roles, structures, notify }}>
      {children}
      <div
        className="toast-container position-fixed top-0 end-0 p-3"
        style={{ zIndex: 1060 }}
      >
        {toast && (
          <div className={`toast show text-bg-${toast.type}`} role="alert">
            <div className="toast-body">{toast.message}</div>
          </div>
        )}
      </div>
    </GlobalContext.Provider>
  );
}
