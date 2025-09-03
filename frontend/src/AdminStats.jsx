import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTranslation } from 'react-i18next';
import Loading from './Loading';
import { api } from './api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function AdminStats() {
  const { t } = useTranslation();
  const [monthly, setMonthly] = useState([]);
  const [topEquipments, setTopEquipments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setError('');
    setLoading(true);
    async function load() {
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', `${from}-01`);
        if (to) params.set('to', `${to}-01`);
        const [monthlyData, topData] = await Promise.all([
          api(`/stats/loans/monthly${params.toString() ? `?${params.toString()}` : ''}`),
          api('/stats/equipments/top'),
        ]);
        setMonthly(monthlyData);
        setTopEquipments(topData);
      } catch (err) {
        setError(err.message);
        setMonthly([]);
        setTopEquipments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [from, to]);

  if (loading) return <Loading />;

  const monthlyChart = {
    labels: monthly.map((m) => m._id),
    datasets: [
      {
        label: t('admin_stats.loans'),
        data: monthly.map((m) => m.count),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  };

  const equipmentChart = {
    labels: topEquipments.map((e) => e.name),
    datasets: [
      {
        label: t('admin_stats.equipments'),
        data: topEquipments.map((e) => e.count),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex mb-3">
        <div className="me-2">
          <label htmlFor="from" className="form-label">From</label>
          <input
            id="from"
            type="month"
            className="form-control"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="to" className="form-label">To</label>
          <input
            id="to"
            type="month"
            className="form-control"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="mb-4">
        <h2>{t('admin_stats.monthly_loans')}</h2>
        <Bar data={monthlyChart} />
      </div>
      <div>
        <h2>{t('admin_stats.top_equipments')}</h2>
        <Pie data={equipmentChart} />
      </div>
    </div>
  );
}

export default AdminStats;
