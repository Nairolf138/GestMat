import React, { createContext, useState, useEffect } from 'react';
import { api } from './api';

export const AuthContext = createContext({ user: null, setUser: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api('/users/me', {}, false)
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
