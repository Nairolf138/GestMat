import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext.jsx';
import { ADMIN_ROLE } from '../roles';

export default function AdminRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== ADMIN_ROLE) {
    return <Navigate to="/" replace />;
  }

  return children;
}
