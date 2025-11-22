import React, { useState } from 'react';
import NavBar from './NavBar';
import AdminStats from './AdminStats';
import ManageUsers from './admin/ManageUsers';
import ManageLoans from './admin/ManageLoans';
import ManageInventory from './admin/ManageInventory';

function AdminDashboard() {
  const [tab, setTab] = useState('users');

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <h1 className="h1">Admin Dashboard</h1>
        <ul className="nav nav-tabs mt-4">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'users' ? 'active' : ''}`}
              onClick={() => setTab('users')}
            >
              Users
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'loans' ? 'active' : ''}`}
              onClick={() => setTab('loans')}
            >
              Loans
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'inventory' ? 'active' : ''}`}
              onClick={() => setTab('inventory')}
            >
              Inventory
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'stats' ? 'active' : ''}`}
              onClick={() => setTab('stats')}
            >
              Statistics
            </button>
          </li>
        </ul>
        <div className="mt-3">
          {tab === 'users' && <ManageUsers />}
          {tab === 'loans' && <ManageLoans />}
          {tab === 'inventory' && <ManageInventory />}
          {tab === 'stats' && <AdminStats />}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
