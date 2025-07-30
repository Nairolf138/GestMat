import React, { createContext, useState, useEffect } from 'react';
import { api } from './api';

export const GlobalContext = createContext({ roles: [], structures: [] });

export function GlobalProvider({ children }) {
  const [roles, setRoles] = useState([]);
  const [structures, setStructures] = useState([]);

  useEffect(() => {
    api('/roles').then(setRoles).catch(() => setRoles([]));
    api('/structures').then(setStructures).catch(() => setStructures([]));
  }, []);

  return (
    <GlobalContext.Provider value={{ roles, structures }}>
      {children}
    </GlobalContext.Provider>
  );
}
