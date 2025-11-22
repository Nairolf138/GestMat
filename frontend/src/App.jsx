import React, { useEffect } from 'react';
import { Routes, Route, BrowserRouter, useInRouterContext } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Equipments from './Equipments';
import Home from './Home';
import Loans from './Loans';
import LoanDetail from './LoanDetail.jsx';
import Profile from './Profile';
import Catalog from './Catalog';
import Cart from './Cart';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import AdminDashboard from './AdminDashboard';
import ErrorBoundary from './ErrorBoundary';
import i18n from './i18n';

function App() {
  const inRouter = useInRouterContext();
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const content = (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <PrivateRoute>
            <Equipments />
          </PrivateRoute>
        }
      />
      <Route
        path="/catalog"
        element={
          <PrivateRoute>
            <Catalog />
          </PrivateRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <PrivateRoute>
            <Loans />
          </PrivateRoute>
        }
      />
      <Route
        path="/loans/:id"
        element={
          <PrivateRoute>
            <LoanDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <PrivateRoute>
            <Cart />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
  return (
    <ErrorBoundary>
      {inRouter ? (
        content
      ) : (
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {content}
        </BrowserRouter>
      )}
    </ErrorBoundary>
  );
}

export default App;
