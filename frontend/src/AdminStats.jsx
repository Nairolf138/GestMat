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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

function AdminStats() {
  const { t } = useTranslation();
  const [monthly, setMonthly] = useState([]);
  const [topEquipments, setTopEquipments] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [topLenders, setTopLenders] = useState([]);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [loginMonthly, setLoginMonthly] = useState([]);
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
        const [
          monthlyData,
          topData,
          statusData,
          durationData,
          lendersData,
          borrowersData,
          loginsData,
        ] = await Promise.all([
          api(`/stats/loans/monthly${paramsStr ? `?${paramsStr}` : ''}`),
          api('/stats/equipments/top'),
          api('/stats/loans'),
          api(`/stats/loans/duration?${durationParams.toString()}`),
          api(`/stats/structures/top-lenders${paramsStr ? `?${paramsStr}` : ''}`),
          api(`/stats/structures/top-borrowers${paramsStr ? `?${paramsStr}` : ''}`),
          api(`/stats/logins/monthly${paramsStr ? `?${paramsStr}` : ''}`),
        ]);
        setMonthly(monthlyData);
        setTopEquipments(topData);
        setStatusCounts(statusData);
        setTopLenders(lendersData);
        setTopBorrowers(borrowersData);
        setLoginMonthly(loginsData);
        setDuration(durationData);
      } catch (err) {
        setError(err.message);
        setMonthly([]);
        setTopEquipments([]);
        setStatusCounts([]);
        setTopLenders([]);
        setTopBorrowers([]);
        setLoginMonthly([]);
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
        label: t('admin_stats.loan_count_label'),
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
        label: t('admin_stats.loan_count_label'),
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
        label: t('admin_stats.loan_duration_days'),
        data: [duration.average, duration.median],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
      },
    ],
  };

  const lendersChart = {
    labels: topLenders.map((l) => l.name),
    datasets: [
      {
        label: t('admin_stats.loan_count_label'),
        data: topLenders.map((l) => l.count),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
      },
    ],
  };

  const borrowersChart = {
    labels: topBorrowers.map((b) => b.name),
    datasets: [
      {
        label: t('admin_stats.loan_count_label'),
        data: topBorrowers.map((b) => b.count),
        backgroundColor: 'rgba(99, 132, 255, 0.6)',
      },
    ],
  };

  const loginChart = {
    labels: loginMonthly.map((m) => m._id),
    datasets: [
      {
        label: t('admin_stats.login_count_label'),
        data: loginMonthly.map((m) => m.count),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const parsed = context.parsed;
            const value =
              typeof parsed === 'number'
                ? parsed
                : parsed?.y ?? parsed?.x ?? context.raw;
            return `${context.label}: ${value} ${t('admin_stats.count')}`;
          },
        },
      },
    },
  };

  const barOptions = (xTitle, yTitle) => ({
    ...commonOptions,
    scales: {
      x: {
        title: { display: true, text: xTitle },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: yTitle },
        ticks: { precision: 0 },
      },
    },
  });

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex flex-wrap gap-3 mb-3">
        <div className="flex-grow-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <label htmlFor="from" className="form-label">
            {t('admin_filters.from')}
          </label>
          <input
            id="from"
            type="month"
            className="form-control"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex-grow-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <label htmlFor="to" className="form-label">
            {t('admin_filters.to')}
          </label>
          <input
            id="to"
            type="month"
            className="form-control"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h2 className="h4">{t('admin_stats.monthly_loans')}</h2>
          <div className="mt-3 position-relative" style={{ minHeight: 320, maxHeight: 400 }}>
            <Bar
              data={monthlyChart}
              options={barOptions(t('admin_stats.month'), t('admin_stats.count'))}
            />
          </div>
        </div>
      </div>
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h2 className="h4">{t('admin_stats.monthly_logins')}</h2>
          <div className="mt-3 position-relative" style={{ minHeight: 320, maxHeight: 400 }}>
            <Bar
              data={loginChart}
              options={barOptions(t('admin_stats.month'), t('admin_stats.count'))}
            />
          </div>
        </div>
      </div>
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h2 className="h4">{t('admin_stats.loan_duration')}</h2>
          <div className="mt-3 position-relative" style={{ minHeight: 280, maxHeight: 360 }}>
            <Bar
              data={durationChart}
              options={barOptions(
                t('admin_stats.statistic'),
                t('admin_stats.days'),
              )}
            />
          </div>
        </div>
      </div>
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h4">{t('admin_stats.top_lenders')}</h2>
              <div className="mt-3 position-relative" style={{ minHeight: 280, maxHeight: 360 }}>
                <Bar
                  data={lendersChart}
                  options={barOptions(
                    t('admin_stats.structure'),
                    t('admin_stats.count'),
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h4">{t('admin_stats.top_borrowers')}</h2>
              <div className="mt-3 position-relative" style={{ minHeight: 280, maxHeight: 360 }}>
                <Bar
                  data={borrowersChart}
                  options={barOptions(
                    t('admin_stats.structure'),
                    t('admin_stats.count'),
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h4">{t('admin_stats.top_equipments')}</h2>
              <div className="mt-3 position-relative" style={{ minHeight: 280, maxHeight: 360 }}>
                <Pie data={equipmentChart} options={commonOptions} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h4">{t('admin_stats.status_breakdown')}</h2>
              <div className="mt-3 position-relative" style={{ minHeight: 280, maxHeight: 360 }}>
                <Pie data={statusChart} options={commonOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminStats;
