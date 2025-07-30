import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Equipments from './Equipments';
import Loans from './Loans';
import Profile from './Profile';
import Catalog from './Catalog';

const token = () => localStorage.getItem('token');

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={token() ? <Equipments /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/inventory"
          element={token() ? <Equipments /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/catalog"
          element={token() ? <Catalog /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/loans"
          element={token() ? <Loans /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={token() ? <Profile /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
