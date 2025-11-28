import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NavBar from './NavBar';
import AdminStats from './AdminStats';
import ManageUsers from './admin/ManageUsers';
import ManageLoans from './admin/ManageLoans';
import ManageInventory from './admin/ManageInventory';

function AdminDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('users');

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <h1 className="h1">{t('admin_dashboard.title')}</h1>
        <ul className="nav nav-tabs mt-4">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'users' ? 'active' : ''}`}
              onClick={() => setTab('users')}
            >
              {t('admin_dashboard.tabs.users')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'loans' ? 'active' : ''}`}
              onClick={() => setTab('loans')}
            >
              {t('admin_dashboard.tabs.loans')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'inventory' ? 'active' : ''}`}
              onClick={() => setTab('inventory')}
            >
              {t('admin_dashboard.tabs.inventory')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'stats' ? 'active' : ''}`}
              onClick={() => setTab('stats')}
            >
              {t('admin_dashboard.tabs.stats')}
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

