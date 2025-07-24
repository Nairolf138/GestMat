import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './Login';
import Equipments from './Equipments';

const token = () => localStorage.getItem('token');

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={token() ? <Equipments /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
