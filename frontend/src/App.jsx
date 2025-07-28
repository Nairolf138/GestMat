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
import Structures from './Structures';
import Users from './Users';
import Loans from './Loans';

const token = () => localStorage.getItem('token');

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={token() ? <Equipments /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/structures"
          element={token() ? <Structures /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/users"
          element={token() ? <Users /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/loans"
          element={token() ? <Loans /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
