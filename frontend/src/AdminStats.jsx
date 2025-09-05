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
  const [statusCounts, setStatusCounts] = useState([]);
  const [duration, setDuration] = useState({ average: 0, median: 0 });
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
        const paramsStr = params.toString();
        const durationParams = new URLSearchParams(params);
        durationParams.set('median', 'true');
        const [monthlyData, topData, statusData, durationData] = await Promise.all([
          api(`/stats/loans/monthly${paramsStr ? `?${paramsStr}` : ''}`),
          api('/stats/equipments/top'),
          api('/stats/loans'),
          api(`/stats/loans/duration?${durationParams.toString()}`),
        ]);
        setMonthly(monthlyData);
        setTopEquipments(topData);
        setStatusCounts(statusData);
        setDuration(durationData);
      } catch (err) {
        setError(err.message);
        setMonthly([]);
        setTopEquipments([]);
        setStatusCounts([]);
        setDuration({ average: 0, median: 0 });
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

  const statusChart = {
    labels: statusCounts.map((s) => t(`loans.status.${s._id}`)),
    datasets: [
      {
        label: t('admin_stats.loans'),
        data: statusCounts.map((s) => s.count),
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

  const durationChart = {
    labels: [t('admin_stats.average'), t('admin_stats.median')],
    datasets: [
      {
        label: t('admin_stats.loan_duration'),
        data: [duration.average, duration.median],
        backgroundColor: ['rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)'],
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
      <div className="mb-4">
        <h2>{t('admin_stats.loan_duration')}</h2>
        <Bar data={durationChart} />
      </div>
      <div className="mb-4">
        <h2>{t('admin_stats.top_equipments')}</h2>
        <Pie data={equipmentChart} />
      </div>
      <div>
        <h2>{t('admin_stats.status_breakdown')}</h2>
        <Pie data={statusChart} />
      </div>
    </div>
  );
}

export default AdminStats;
