import React, { createContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import Loading from './Loading.jsx';

export const AuthContext = createContext({ user: null, setUser: () => {} });

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { data: user, status, isFetching } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await api('/users/me', {}, false);
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    initialData: null,
  });

  const setUser = (newUser) => queryClient.setQueryData(['currentUser'], newUser);

  if (status === 'pending') return <Loading />;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
