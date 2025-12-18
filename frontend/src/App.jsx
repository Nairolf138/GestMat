import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';
import ForgotUsername from './ForgotUsername.jsx';
import Equipments from './Equipments';
import Home from './Home';
import Loans from './Loans';
import LoansHistory from './LoansHistory.jsx';
import LoanDetail from './LoanDetail.jsx';
import Profile from './Profile';
import Catalog from './Catalog';
import Cart from './Cart';
import Vehicles from './pages/Vehicles/Vehicles.jsx';
import VehicleDetail from './pages/Vehicles/VehicleDetail.jsx';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import AdminDashboard from './AdminDashboard';
import ErrorBoundary from './ErrorBoundary';
import i18n from './i18n';
import AppLayout from './layouts/AppLayout.jsx';

function App() {
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);
  return (
    <ErrorBoundary>
      <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-username" element={<ForgotUsername />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Home />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Equipments />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/catalog"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Catalog />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Vehicles />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/vehicles/:id"
            element={
              <PrivateRoute>
                <AppLayout>
                  <VehicleDetail />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/loans"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Loans />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/loans/history"
            element={
              <PrivateRoute>
                <AppLayout>
                  <LoansHistory />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/loans/:id"
            element={
              <PrivateRoute>
                <AppLayout>
                  <LoanDetail />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Cart />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </AdminRoute>
            }
          />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
