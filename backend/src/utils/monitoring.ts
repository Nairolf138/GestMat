import { Db } from 'mongodb';
import client from 'prom-client';

const VEHICLE_OCCUPANCY_METRIC_NAME = 'gestmat_vehicle_occupancy_ratio';
const VEHICLE_KILOMETERS_METRIC_NAME = 'gestmat_vehicle_kilometers_total';
const VEHICLE_DOWNTIME_METRIC_NAME = 'gestmat_vehicle_downtime_days_total';
const MAIL_PENDING_METRIC_NAME = 'gestmat_mail_outbox_pending';
const MAIL_OLDEST_METRIC_NAME = 'gestmat_mail_outbox_oldest_pending_seconds';

const vehicleOccupancyGauge = new client.Gauge({
  name: VEHICLE_OCCUPANCY_METRIC_NAME,
  help: 'Proportion de véhicules actuellement réservés',
});

const vehicleKilometersGauge = new client.Gauge({
  name: VEHICLE_KILOMETERS_METRIC_NAME,
  help: 'Kilomètres cumulés enregistrés sur l’ensemble du parc de véhicules',
});

const vehicleDowntimeGauge = new client.Gauge({
  name: VEHICLE_DOWNTIME_METRIC_NAME,
  help: "Nombre cumulé de journées d'indisponibilité déclarées pour les véhicules",
});

const mailPendingGauge = new client.Gauge({
  name: MAIL_PENDING_METRIC_NAME,
  help: 'Nombre de mails en attente de livraison',
});

const mailOldestGauge = new client.Gauge({
  name: MAIL_OLDEST_METRIC_NAME,
  help: 'Âge en secondes du plus ancien mail en attente',
});

export function registerMonitoringMetrics(): void {
  if (!client.register.getSingleMetric(VEHICLE_OCCUPANCY_METRIC_NAME)) {
    client.register.registerMetric(vehicleOccupancyGauge);
  }
  if (!client.register.getSingleMetric(VEHICLE_KILOMETERS_METRIC_NAME)) {
    client.register.registerMetric(vehicleKilometersGauge);
  }
  if (!client.register.getSingleMetric(VEHICLE_DOWNTIME_METRIC_NAME)) {
    client.register.registerMetric(vehicleDowntimeGauge);
  }
  if (!client.register.getSingleMetric(MAIL_PENDING_METRIC_NAME)) {
    client.register.registerMetric(mailPendingGauge);
  }
  if (!client.register.getSingleMetric(MAIL_OLDEST_METRIC_NAME)) {
    client.register.registerMetric(mailOldestGauge);
  }
}

type VehicleTotals = {
  kilometers?: number;
  downtime?: number;
};

type VehicleAggregateResult = {
  occupied?: number;
  totals?: VehicleTotals;
};

export async function refreshMonitoringMetrics(db: Db): Promise<void> {
  const now = new Date();
  const [totalVehicles, aggregates, pendingMail, oldestMail] =
    await Promise.all([
      db.collection('vehicles').countDocuments({}),
      db
        .collection('vehicles')
        .aggregate<VehicleAggregateResult>([
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
                    kilometers: {
                      $sum: { $ifNull: ['$kilometersTraveled', 0] },
                    },
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
      db
        .collection('mailOutbox')
        .countDocuments({ status: { $in: ['pending', 'sending'] } }),
      db
        .collection('mailOutbox')
        .findOne(
          { status: { $in: ['pending', 'sending'] } },
          { sort: { createdAt: 1 }, projection: { createdAt: 1 } },
        ),
    ]);

  const aggregate: VehicleAggregateResult = aggregates[0] ?? {};
  const occupiedVehicles = aggregate.occupied || 0;
  const totals: VehicleTotals = aggregate.totals || {};

  vehicleOccupancyGauge.set(
    totalVehicles ? occupiedVehicles / totalVehicles : 0,
  );
  vehicleKilometersGauge.set(Number(totals.kilometers) || 0);
  vehicleDowntimeGauge.set(Number(totals.downtime) || 0);
  mailPendingGauge.set(pendingMail);
  mailOldestGauge.set(
    oldestMail?.createdAt
      ? Math.max(
          0,
          (now.getTime() - new Date(oldestMail.createdAt).getTime()) / 1000,
        )
      : 0,
  );
}
