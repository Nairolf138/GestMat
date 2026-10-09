import React, { createContext, useState, useEffect } from 'react';
import { api, setErrorHandler } from './api';
import { showToast } from './toast';

export const GlobalContext = createContext({
  roles: [],
  structures: [],
  notify: showToast,
});

export function GlobalProvider({ children }) {
  const [roles, setRoles] = useState([]);
  const [structures, setStructures] = useState([]);
  const notify = showToast;

  useEffect(() => {
    setErrorHandler((err) => showToast(err.message));
    api('/roles', {}, false)
      .then(setRoles)
      .catch(() => setRoles([]));
    api('/structures', {}, false)
      .then(setStructures)
      .catch(() => setStructures([]));
    return () => setErrorHandler(null);
  }, []);

  return (
    <GlobalContext.Provider value={{ roles, structures, notify }}>
      {children}
    </GlobalContext.Provider>
  );
}
