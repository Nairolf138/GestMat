import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import Loading from './Loading.jsx';
import { useLocation } from 'react-router-dom';

export const AuthContext = createContext({
  user: null,
  setUser: () => {},
  stayLoggedInPreference: false,
  setStayLoggedInPreference: () => {},
});

const DEFAULT_INACTIVITY_LIMIT = 30 * 60 * 1000;

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const timerRef = useRef(null);
  const previousStayLoggedIn = useRef(null);
  const location = useLocation();
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  const [stayLoggedInPreference, setStayLoggedInPreferenceState] = useState(() =>
    localStorage.getItem('stayLoggedIn') === 'true',
  );
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  const setStayLoggedInPreference = useCallback((value) => {
    setStayLoggedInPreferenceState(value);
    if (value) {
      localStorage.setItem('stayLoggedIn', 'true');
    } else {
      localStorage.removeItem('stayLoggedIn');
    }
  }, []);

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

  const resetTimer = useCallback(
    (
      timestamp = Date.now(),
      limit = DEFAULT_INACTIVITY_LIMIT,
      shouldTrack = !stayLoggedInPreference,
    ) => {
      if (!shouldTrack) return;
      localStorage.setItem('lastActivity', timestamp.toString());
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, limit);
    },
    [logout, stayLoggedInPreference],
  );

  const setUser = useCallback(
    (newUser, options = {}) => {
      const hasPreferenceOverride = Object.prototype.hasOwnProperty.call(
        options,
        'stayLoggedIn',
      );
      const targetStayLoggedIn = hasPreferenceOverride
        ? options.stayLoggedIn
        : stayLoggedInPreference;

      if (hasPreferenceOverride) {
        setStayLoggedInPreference(targetStayLoggedIn);
      }

      queryClient.setQueryData(['currentUser'], newUser);
      if (newUser) {
        if (!targetStayLoggedIn) {
          resetTimer(Date.now(), DEFAULT_INACTIVITY_LIMIT, true);
        } else {
          clearTimeout(timerRef.current);
          localStorage.removeItem('lastActivity');
        }
      } else {
        clearTimeout(timerRef.current);
        localStorage.removeItem('lastActivity');
      }
    },
    [queryClient, resetTimer, stayLoggedInPreference, setStayLoggedInPreference],
  );

  useEffect(() => {
    if (!isPublicRoute) {
      setIsCheckingSession(false);
      return;
    }

    const hasStayLoggedIn = stayLoggedInPreference;
    const hasSessionOrRefreshCookie = document.cookie
      .split(';')
      .some((cookie) => /session|refresh/i.test(cookie.trim().split('=')[0]));

    if (!hasStayLoggedIn && !hasSessionOrRefreshCookie) {
      setIsCheckingSession(false);
      return;
    }

    let cancelled = false;

    const attemptSessionRecovery = async () => {
      setIsCheckingSession(true);
      try {
        await api('/auth/refresh', { method: 'POST' });
        const refreshedUser = await api('/users/me', {}, false);

        if (cancelled) return;

        if (refreshedUser) {
          setUser(refreshedUser, { stayLoggedIn: stayLoggedInPreference });
          window.location.href = '/';
          return;
        }
      } catch {}

      if (!cancelled) {
        setIsCheckingSession(false);
      }
    };

    attemptSessionRecovery();

    return () => {
      cancelled = true;
    };
  }, [isPublicRoute, setUser, stayLoggedInPreference]);

  useEffect(() => {
    if (!user) return;

    if (stayLoggedInPreference) {
      clearTimeout(timerRef.current);
      localStorage.removeItem('lastActivity');
      previousStayLoggedIn.current = stayLoggedInPreference;
      return;
    }

    const storedActivity = Number(localStorage.getItem('lastActivity'));
    const preferenceChanged =
      previousStayLoggedIn.current !== stayLoggedInPreference;
    const initialTimestamp =
      preferenceChanged || Number.isNaN(storedActivity) || storedActivity <= 0
        ? Date.now()
        : storedActivity;
    const elapsed = Date.now() - initialTimestamp;
    if (elapsed >= DEFAULT_INACTIVITY_LIMIT) {
      logout();
      return;
    }

    localStorage.setItem('lastActivity', initialTimestamp.toString());
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      logout,
      DEFAULT_INACTIVITY_LIMIT - elapsed,
    );

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => user && resetTimer();
    events.forEach((e) => window.addEventListener(e, handler));

    const onStorage = (event) => {
      if (event.key !== 'lastActivity' || !event.newValue || !user) return;
      const lastActivityTime = Number(event.newValue);
      const elapsed = Date.now() - lastActivityTime;
      clearTimeout(timerRef.current);
      if (elapsed >= DEFAULT_INACTIVITY_LIMIT) {
        logout();
      } else {
        timerRef.current = setTimeout(
          logout,
          DEFAULT_INACTIVITY_LIMIT - elapsed,
        );
      }
    };

    window.addEventListener('storage', onStorage);
    previousStayLoggedIn.current = stayLoggedInPreference;
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      window.removeEventListener('storage', onStorage);
      clearTimeout(timerRef.current);
    };
  }, [logout, resetTimer, stayLoggedInPreference, user]);

  if (isPublicRoute) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          setUser,
          stayLoggedInPreference,
          setStayLoggedInPreference,
        }}
      >
        {isCheckingSession ? <Loading /> : children}
      </AuthContext.Provider>
    );
  }

  if (status === 'pending' || isCheckingSession) return <Loading />;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        stayLoggedInPreference,
        setStayLoggedInPreference,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
