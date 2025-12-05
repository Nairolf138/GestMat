import { Db } from 'mongodb';
import client from 'prom-client';

const vehicleOccupancyGauge = new client.Gauge({
  name: 'gestmat_vehicle_occupancy_ratio',
  help: 'Proportion de véhicules actuellement réservés',
});

const vehicleKilometersGauge = new client.Gauge({
  name: 'gestmat_vehicle_kilometers_total',
  help: 'Kilomètres cumulés enregistrés sur l’ensemble du parc de véhicules',
});

const vehicleDowntimeGauge = new client.Gauge({
  name: 'gestmat_vehicle_downtime_days_total',
  help: "Nombre cumulé de journées d'indisponibilité déclarées pour les véhicules",
});

export function registerMonitoringMetrics(): void {
  if (!client.register.getSingleMetric(vehicleOccupancyGauge.name)) {
    client.register.registerMetric(vehicleOccupancyGauge);
  }
  if (!client.register.getSingleMetric(vehicleKilometersGauge.name)) {
    client.register.registerMetric(vehicleKilometersGauge);
  }
  if (!client.register.getSingleMetric(vehicleDowntimeGauge.name)) {
    client.register.registerMetric(vehicleDowntimeGauge);
  }
}

export async function refreshMonitoringMetrics(db: Db): Promise<void> {
  const now = new Date();
  const [totalVehicles, aggregates] = await Promise.all<[number, any[]]>([
    db.collection('vehicles').countDocuments({}),
    db
      .collection('vehicles')
      .aggregate([
        {
          $facet: {
            occupied: [
              {
                $match: {
                  reservations: {
                    $elemMatch: { start: { $lte: now }, end: { $gte: now } },
                  },
                },
              },
              { $count: 'value' },
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  kilometers: { $sum: { $ifNull: ['$kilometersTraveled', 0] } },
                  downtime: { $sum: { $ifNull: ['$downtimeDays', 0] } },
                },
              },
            ],
          },
        },
        {
          $project: {
            occupied: { $arrayElemAt: ['$occupied.value', 0] },
            totals: { $arrayElemAt: ['$totals', 0] },
          },
        },
      ])
      .toArray(),
  ]);

  const aggregate = aggregates[0] || {};
  const occupiedVehicles = aggregate.occupied || 0;
  const totals = aggregate.totals || {};

  vehicleOccupancyGauge.set(
    totalVehicles ? occupiedVehicles / totalVehicles : 0,
  );
  vehicleKilometersGauge.set(Number(totals.kilometers) || 0);
  vehicleDowntimeGauge.set(Number(totals.downtime) || 0);
}
