import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Equipments from "./Equipments";
import Home from "./Home";
import Loans from "./Loans";
import Profile from "./Profile";
import Catalog from "./Catalog";
import Cart from "./Cart";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/inventory" element={<Equipments />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
