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
  const [vehicleStatusCounts, setVehicleStatusCounts] = useState([]);
  const [vehicleUsageCounts, setVehicleUsageCounts] = useState([]);
  const [vehicleOccupancy, setVehicleOccupancy] = useState(null);
  const [vehicleMileage, setVehicleMileage] = useState({
    totalKilometers: 0,
    totalDowntimeDays: 0,
  });
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
          vehicleStatusData,
          vehicleUsageData,
          vehicleOccupancyData,
          vehicleMileageData,
        ] = await Promise.all([
          api(`/stats/loans/monthly${paramsStr ? `?${paramsStr}` : ''}`),
          api('/stats/equipments/top'),
          api('/stats/loans'),
          api(`/stats/loans/duration?${durationParams.toString()}`),
          api(`/stats/structures/top-lenders${paramsStr ? `?${paramsStr}` : ''}`),
          api(`/stats/structures/top-borrowers${paramsStr ? `?${paramsStr}` : ''}`),
          api(`/stats/logins/monthly${paramsStr ? `?${paramsStr}` : ''}`),
          api(`/stats/vehicles/status${paramsStr ? `?${paramsStr}` : ''}`),
          api('/stats/vehicles/usage'),
          from && to ? api(`/stats/vehicles/occupancy?${params.toString()}`) : null,
          api('/stats/vehicles/mileage'),
        ]);
        setMonthly(monthlyData);
        setTopEquipments(topData);
        setStatusCounts(statusData);
        setTopLenders(lendersData);
        setTopBorrowers(borrowersData);
        setLoginMonthly(loginsData);
        setDuration(durationData);
        setVehicleStatusCounts(vehicleStatusData);
        setVehicleUsageCounts(vehicleUsageData);
        setVehicleOccupancy(vehicleOccupancyData);
        setVehicleMileage(vehicleMileageData);
      } catch (err) {
        setError(err.message);
        setMonthly([]);
        setTopEquipments([]);
        setStatusCounts([]);
        setTopLenders([]);
        setTopBorrowers([]);
        setLoginMonthly([]);
        setDuration({ average: 0, median: 0 });
        setVehicleStatusCounts([]);
        setVehicleUsageCounts([]);
        setVehicleOccupancy(null);
        setVehicleMileage({ totalKilometers: 0, totalDowntimeDays: 0 });
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

  const vehicleStatusChart = {
    labels: vehicleStatusCounts.map((s) => {
      const key = `vehicles.status.${s._id}`;
      const translated = t(key);
      return translated === key ? s._id : translated;
    }),
    datasets: [
      {
        label: t('admin_stats.vehicle_count_label'),
        data: vehicleStatusCounts.map((s) => s.count),
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

  const vehicleUsageChart = {
    labels: vehicleUsageCounts.map((u) => {
      const key = `vehicles.form.usage_option.${u._id}`;
      const translated = t(key);
      return translated === key ? u._id : translated;
    }),
    datasets: [
      {
        label: t('admin_stats.vehicle_count_label'),
        data: vehicleUsageCounts.map((u) => u.count),
        backgroundColor: [
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
        ],
      },
    ],
  };

  const occupancyRatio = vehicleOccupancy?.ratio
    ? Math.round(vehicleOccupancy.ratio * 1000) / 10
    : 0;
  const occupancyChart = {
    labels: [
      from && to
        ? `${from} → ${to}`
        : t('admin_stats.occupancy_period_label'),
    ],
    datasets: [
      {
        label: t('admin_stats.occupancy_rate'),
        data: vehicleOccupancy ? [occupancyRatio] : [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
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
            const datasetLabel = context.dataset?.label;
            return datasetLabel && datasetLabel !== context.label
              ? `${datasetLabel} - ${context.label}: ${value}`
              : `${context.label}: ${value}`;
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

  const occupancyOptions = (() => {
    const base = barOptions(
      t('admin_stats.period'),
      t('admin_stats.percentage'),
    );
    return {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...base.scales?.y,
          max: 100,
          ticks: {
            ...base.scales?.y?.ticks,
            precision: 1,
          },
        },
      },
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins?.tooltip,
          callbacks: {
            ...base.plugins?.tooltip?.callbacks,
            label: (context) => {
              const value =
                typeof context.parsed === 'number'
                  ? context.parsed
                  : context.parsed?.y ?? context.raw;
              const reserved = vehicleOccupancy?.reserved ?? 0;
              const total = vehicleOccupancy?.total ?? 0;
              const ratioLabel =
                typeof value === 'number'
                  ? value.toFixed(1)
                  : value ?? '0.0';
              return `${t('admin_stats.occupancy_rate')}: ${ratioLabel}% (${reserved}/${total})`;
            },
          },
        },
      },
    };
  })();

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
      <div className="row g-4 mb-4">
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
      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h4">{t('admin_stats.vehicle_status_breakdown')}</h2>
              <div className="mt-3 position-relative" style={{ minHeight: 260, maxHeight: 340 }}>
                <Pie data={vehicleStatusChart} options={commonOptions} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h2 className="h4">{t('admin_stats.vehicle_usage_breakdown')}</h2>
              <div className="mt-3 position-relative" style={{ minHeight: 260, maxHeight: 340 }}>
                <Pie data={vehicleUsageChart} options={commonOptions} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column justify-content-center">
              <h2 className="h4">{t('admin_stats.mileage_summary')}</h2>
              <p className="mt-3 mb-2 fw-semibold">
                {t('admin_stats.total_kilometers', {
                  value: vehicleMileage.totalKilometers.toLocaleString(),
                })}
              </p>
              <p className="text-muted mb-0">
                {t('admin_stats.total_downtime', {
                  value: vehicleMileage.totalDowntimeDays.toLocaleString(),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h2 className="h4">{t('admin_stats.occupancy_rate')}</h2>
          {from && to && vehicleOccupancy ? (
            <>
              <div className="mt-3 position-relative" style={{ minHeight: 260, maxHeight: 340 }}>
                <Bar data={occupancyChart} options={occupancyOptions} />
              </div>
              <p className="text-muted small mt-2 mb-0">
                {t('admin_stats.occupancy_caption', {
                  reserved: vehicleOccupancy.reserved.toLocaleString(),
                  total: vehicleOccupancy.total.toLocaleString(),
                  ratio: occupancyRatio.toFixed(1),
                })}
              </p>
            </>
          ) : (
            <p className="text-muted mb-0">
              {t('admin_stats.occupancy_prompt')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminStats;
