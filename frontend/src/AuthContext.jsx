import React, { createContext, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import Loading from './Loading.jsx';
import { useLocation, useInRouterContext } from 'react-router-dom';

export const AuthContext = createContext({ user: null, setUser: () => {} });

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const timerRef = useRef(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000;
  const inRouter = useInRouterContext();
  const location = inRouter ? useLocation() : { pathname: '/' };
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = inRouter && publicRoutes.includes(location.pathname);

  const { data: user, status } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await api('/users/me', {}, false);
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !isPublicRoute,
  });

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('lastActivity');
    queryClient.setQueryData(['currentUser'], null);
    window.location.href = '/login';
  }, [queryClient]);

  const resetTimer = useCallback(() => {
    localStorage.setItem('lastActivity', Date.now().toString());
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, INACTIVITY_LIMIT);
  }, [INACTIVITY_LIMIT, logout]);

  const setUser = (newUser) => {
    queryClient.setQueryData(['currentUser'], newUser);
    if (newUser) {
      resetTimer();
    } else {
      clearTimeout(timerRef.current);
      localStorage.removeItem('lastActivity');
    }
  };

  useEffect(() => {
    if (!user) return;
    const last = Number(localStorage.getItem('lastActivity')) || Date.now();
    if (Date.now() - last > INACTIVITY_LIMIT) {
      logout();
    } else {
      timerRef.current = setTimeout(
        logout,
        INACTIVITY_LIMIT - (Date.now() - last),
      );
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => user && resetTimer();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearTimeout(timerRef.current);
    };
  }, [INACTIVITY_LIMIT, logout, resetTimer, user]);

  if (isPublicRoute) {
    return (
      <AuthContext.Provider value={{ user: null, setUser }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (status === 'pending') return <Loading />;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
