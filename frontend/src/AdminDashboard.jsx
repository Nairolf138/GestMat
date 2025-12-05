import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NavBar from './NavBar';
import AdminStats from './AdminStats';
import ManageUsers from './admin/ManageUsers';
import ManageLoans from './admin/ManageLoans';
import ManageInventory from './admin/ManageInventory';
import ManageVehicles from './admin/ManageVehicles';
import { api } from './api';

function AdminDashboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('users');
  const [summary, setSummary] = useState({
    activeUsers: 0,
    ongoingLoans: 0,
    completedLoansThisYear: 0,
    totalEquipment: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const isMountedRef = useRef(true);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await api('/stats/summary');
      if (isMountedRef.current) setSummary(data);
    } catch (err) {
      if (isMountedRef.current) setSummaryError(err.message || '');
    } finally {
      if (isMountedRef.current) setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const timer = setInterval(refreshSummary, 60000);
    refreshSummary();
    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [refreshSummary]);

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <h1 className="h1">{t('admin_dashboard.title')}</h1>
        <section className="mt-3">
          <div className="border rounded-3 bg-light p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">{t('admin_dashboard.summary.title')}</h2>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={refreshSummary}
                disabled={summaryLoading}
              >
                {summaryLoading
                  ? t('admin_dashboard.summary.refreshing')
                  : t('admin_dashboard.summary.refresh')}
              </button>
            </div>
            {summaryError && (
              <div className="alert alert-danger py-2" role="alert">
                {summaryError}
              </div>
            )}
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
              <div className="col">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="text-muted small mb-1">
                      {t('admin_dashboard.summary.active_users')}
                    </div>
                    <div className="display-6 mb-0">{summary.activeUsers}</div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="text-muted small mb-1">
                      {t('admin_dashboard.summary.ongoing_loans')}
                    </div>
                    <div className="display-6 mb-0">{summary.ongoingLoans}</div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="text-muted small mb-1">
                      {t('admin_dashboard.summary.completed_loans')}
                    </div>
                    <div className="display-6 mb-0">
                      {summary.completedLoansThisYear}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="text-muted small mb-1">
                      {t('admin_dashboard.summary.total_equipment')}
                    </div>
                    <div className="display-6 mb-0">{summary.totalEquipment}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
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
              className={`nav-link ${tab === 'vehicles' ? 'active' : ''}`}
              onClick={() => setTab('vehicles')}
            >
              {t('admin_dashboard.tabs.vehicles')}
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
          {tab === 'vehicles' && <ManageVehicles />}
          {tab === 'stats' && <AdminStats />}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;

