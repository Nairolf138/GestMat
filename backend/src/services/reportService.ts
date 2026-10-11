import { Db, ObjectId, WithId } from 'mongodb';
import PDFDocument from 'pdfkit';
import { API_URL, REPORT_CHECK_INTERVAL_HOURS } from '../config';
import { getStructures, Structure } from '../models/Structure';
import logger from '../utils/logger';
import { formatSubject } from '../utils/sendMail';
import { processMailOutbox, queueMail } from './mailOutboxService';
import { getStructureEmails } from '../utils/getStructureEmails';
import { LoanRequest } from '../models/LoanRequest';

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MS_IN_HOUR = 60 * 60 * 1000;
const AUGUST = 7; // zero-based month index

export interface ReportPeriod {
  start: Date;
  end: Date;
  key: string;
  label: string;
}

export interface EquipmentStat {
  id: ObjectId;
  name?: string;
  type?: string;
  totalQuantity: number;
}

export interface StructureStatsSummary {
  totalLoans: number;
  statusCounts: Record<string, number>;
  roleCounts: { owner: number; borrower: number };
  averageDurationDays: number;
  topEquipments: EquipmentStat[];
}

export interface StoredReport {
  _id?: ObjectId;
  structureId: ObjectId;
  structureName?: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  stats: StructureStatsSummary;
  pdf: Buffer;
  recipients?: string[];
  deliveredRecipients?: string[];
  emailSuppressed?: boolean;
  sentAt?: Date;
  errors?: string[];
}

export interface ReportJob {
  _id: string;
  lastRunAt?: Date;
  periodEnd?: Date;
  startedAt?: Date;
}

export interface GenerateReportsOptions {
  now?: Date;
  force?: boolean;
  structureIds?: string[];
  sendEmails?: boolean;
}

export interface GenerateReportsResult {
  period: ReportPeriod;
  generated: number;
  skipped: number;
  emailed: number;
  errors: string[];
}

export function getAnnualReportPeriod(now: Date = new Date()): ReportPeriod {
  const currentYear = now.getFullYear();
  const isPastCutoff =
    now.getMonth() > AUGUST ||
    (now.getMonth() === AUGUST && now.getDate() >= 31);
  const endYear = isPastCutoff ? currentYear : currentYear - 1;
  const end = new Date(Date.UTC(endYear, AUGUST, 31, 23, 59, 59, 999));
  const start = new Date(Date.UTC(endYear - 1, AUGUST, 1, 0, 0, 0, 0));
  const label = `Du ${start.toISOString().substring(0, 10)} au ${end
    .toISOString()
    .substring(0, 10)}`;
  const key = `${endYear}`;
  return { start, end, key, label };
}

function buildMatch(structureId: ObjectId, period: ReportPeriod) {
  return {
    startDate: { $gte: period.start, $lte: period.end },
    $or: [{ owner: structureId }, { borrower: structureId }],
  };
}

export async function collectStructureStats(
  db: Db,
  structureId: ObjectId,
  period: ReportPeriod,
): Promise<StructureStatsSummary> {
  const match = buildMatch(structureId, period);
  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    {
      $unionWith: {
        coll: 'loanrequests_archive',
        pipeline: [{ $match: match }],
      },
    },
    {
      $facet: {
        statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        roleCounts: [
          {
            $group: {
              _id: {
                $cond: [{ $eq: ['$owner', structureId] }, 'owner', 'borrower'],
              },
              count: { $sum: 1 },
            },
          },
        ],
        total: [{ $count: 'count' }],
        durations: [
          {
            $match: {
              startDate: { $type: 'date' },
              endDate: { $type: 'date' },
            },
          },
          {
            $project: {
              durationDays: {
                $divide: [{ $subtract: ['$endDate', '$startDate'] }, MS_IN_DAY],
              },
            },
          },
          {
            $group: {
              _id: null,
              average: { $avg: '$durationDays' },
              count: { $sum: 1 },
            },
          },
        ],
        topEquipments: [
          { $unwind: '$items' },
          { $match: { 'items.equipment': { $exists: true, $ne: null } } },
          {
            $group: {
              _id: '$items.equipment',
              totalQuantity: { $sum: { $ifNull: ['$items.quantity', 1] } },
            },
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'equipments',
              localField: '_id',
              foreignField: '_id',
              as: 'equipment',
            },
          },
          { $unwind: { path: '$equipment', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              totalQuantity: 1,
              name: '$equipment.name',
              type: '$equipment.type',
            },
          },
        ],
      },
    },
  ];

  const [result] = await db
    .collection<LoanRequest>('loanrequests')
    .aggregate(pipeline)
    .toArray();

  const statusCounts = Object.fromEntries(
    (result?.statusCounts || []).map((s: { _id: string; count: number }) => [
      s._id || 'unknown',
      s.count,
    ]),
  );
  const roleCounts = (result?.roleCounts || []).reduce(
    (
      acc: { owner: number; borrower: number },
      cur: { _id: string; count: number },
    ) => {
      if (cur._id === 'owner') acc.owner += cur.count;
      else acc.borrower += cur.count;
      return acc;
    },
    { owner: 0, borrower: 0 },
  );
  const averageDurationDays = result?.durations?.[0]?.average || 0;
  const topEquipments: EquipmentStat[] = (result?.topEquipments || []).map(
    (e: {
      _id: ObjectId;
      totalQuantity: number;
      name?: string;
      type?: string;
    }) => ({
      id: e._id,
      name: e.name,
      type: e.type,
      totalQuantity: e.totalQuantity,
    }),
  );
  const totalLoans = result?.total?.[0]?.count || 0;

  return {
    statusCounts,
    roleCounts,
    averageDurationDays,
    topEquipments,
    totalLoans,
  };
}

export async function renderReportPdf(
  structure: WithId<Structure>,
  stats: StructureStatsSummary,
  period: ReportPeriod,
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, compress: false });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  doc
    .fontSize(20)
    .text('Rapport annuel des demandes et réservations', { align: 'center' });
  doc.moveDown();
  doc
    .fontSize(14)
    .text(structure.name ? String(structure.name) : 'Structure inconnue');
  doc.fontSize(12).text(period.label);
  doc.moveDown();

  doc.fontSize(13).text('Résumé');
  doc
    .fontSize(11)
    .list([
      `Total des dossiers: ${stats.totalLoans}`,
      `Dossiers comme structure responsable: ${stats.roleCounts.owner}`,
      `Dossiers comme structure demandeuse: ${stats.roleCounts.borrower}`,
      `Durée moyenne (jours): ${stats.averageDurationDays.toFixed(1)}`,
    ]);
  doc.moveDown();

  doc.fontSize(13).text('Comptes par statut');
  const statusEntries = Object.entries(stats.statusCounts);
  if (!statusEntries.length) {
    doc.fontSize(11).text('Aucune donnée');
  } else {
    statusEntries.forEach(([status, count]) => {
      doc.fontSize(11).text(`- ${status || 'Inconnu'}: ${count}`);
    });
  }
  doc.moveDown();

  doc.fontSize(13).text('Top équipements');
  if (!stats.topEquipments.length) {
    doc.fontSize(11).text('Aucun équipement demandé sur la période');
  } else {
    stats.topEquipments.forEach((eq) => {
      const label = eq.name
        ? `${eq.name} (${eq.type || 'type inconnu'})`
        : 'Équipement inconnu';
      doc.fontSize(11).text(`- ${label}: ${eq.totalQuantity} demande(s)`);
    });
  }

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function alreadyGenerated(
  db: Db,
  structureId: ObjectId,
  period: ReportPeriod,
): Promise<WithId<StoredReport> | null> {
  const existing = await db.collection<StoredReport>('reports').findOne({
    structureId,
    periodStart: period.start,
    periodEnd: period.end,
  });
  return existing;
}

async function persistReport(
  db: Db,
  report: StoredReport,
): Promise<WithId<StoredReport>> {
  const { insertedId } = await db
    .collection<StoredReport>('reports')
    .insertOne({
      ...report,
      createdAt: report.createdAt ?? new Date(),
    });
  return { ...report, _id: insertedId } as WithId<StoredReport>;
}

async function sendReportEmail(
  db: Db,
  report: WithId<StoredReport>,
  structure: WithId<Structure>,
  recipients: string[],
): Promise<number> {
  if (!recipients.length || report.sentAt || report.emailSuppressed) return 0;
  const prefix = `report:${report._id}:recipient:`;
  const completed = await db
    .collection<{ _id: string; status: string }>('mailOutbox')
    .find({
      _id: {
        $in: recipients.map(
          (email) => `${prefix}${email.trim().toLowerCase()}`,
        ),
      },
      status: 'sent',
    })
    .toArray();
  if (completed.length) {
    const recovered = completed.map((entry) =>
      String(entry._id).slice(prefix.length),
    );
    await db
      .collection('reports')
      .updateOne(
        { _id: report._id },
        { $addToSet: { deliveredRecipients: { $each: recovered } } },
      );
  }
  const current = await db.collection<StoredReport>('reports').findOne({
    _id: report._id,
  });
  const alreadyDelivered = new Set(
    (current?.deliveredRecipients || []).map((email) => email.toLowerCase()),
  );
  if (recipients.every((email) => alreadyDelivered.has(email.toLowerCase()))) {
    await db
      .collection('reports')
      .updateOne(
        { _id: report._id, sentAt: { $exists: false } },
        { $set: { sentAt: new Date() } },
      );
    return 0;
  }
  const downloadUrl = `${API_URL}/reports/${report._id?.toString()}/download`;
  for (const recipient of recipients) {
    const address = recipient.trim().toLowerCase();
    if (!address || alreadyDelivered.has(address)) continue;
    await queueMail(
      db,
      `report:${report._id}:recipient:${address}`,
      {
        to: address,
        subject: formatSubject('Rapport annuel des demandes et réservations'),
        text: `Bonjour,

Veuillez trouver en pièce jointe le rapport annuel pour ${
          structure.name || 'votre structure'
        } (${report.periodStart.toISOString().substring(0, 10)} -> ${report.periodEnd
          .toISOString()
          .substring(0, 10)}).\nTéléchargement: ${downloadUrl}\n\n--\nGestMat`,
        reportAttachment: {
          reportId: String(report._id),
          filename: `rapport-${report.structureName || 'structure'}.pdf`,
        },
      },
      undefined,
      {
        kind: 'annual-report',
        resourceId: String(report._id),
        email: address,
      },
    );
  }
  await processMailOutbox(db);
  const updated = await db.collection<StoredReport>('reports').findOne({
    _id: report._id,
  });
  return Math.max(
    (updated?.deliveredRecipients?.length || 0) - alreadyDelivered.size,
    0,
  );
}

export async function generateAnnualReports(
  db: Db,
  {
    now = new Date(),
    force = false,
    structureIds,
    sendEmails = true,
  }: GenerateReportsOptions = {},
): Promise<GenerateReportsResult> {
  const period = getAnnualReportPeriod(now);
  const errors: string[] = [];
  const structures = await getStructures(db);
  const filtered = structureIds?.length
    ? structures.filter((s) => structureIds.includes(String(s._id)))
    : structures;

  let generated = 0;
  let skipped = 0;
  let emailed = 0;

  const jobKey = `annual-${period.key}`;
  await db
    .collection<ReportJob>('reportJobs')
    .updateOne(
      { _id: jobKey },
      { $set: { lastRunAt: now, periodEnd: period.end, startedAt: now } },
      { upsert: true },
    );

  for (const structure of filtered) {
    const structureId = structure._id as ObjectId;
    try {
      const existing = !force
        ? await alreadyGenerated(db, structureId, period)
        : null;
      if (existing) {
        skipped += 1;
        if (sendEmails && !existing.sentAt && !existing.emailSuppressed)
          emailed += await sendReportEmail(
            db,
            existing,
            structure as WithId<Structure>,
            existing.recipients || [],
          );
        continue;
      }

      const stats = await collectStructureStats(db, structureId, period);
      const pdf = await renderReportPdf(
        structure as WithId<Structure>,
        stats,
        period,
      );
      const recipients = new Set<string>();
      const structureEmail = (structure as any).email;
      if (typeof structureEmail === 'string' && structureEmail.trim()) {
        recipients.add(structureEmail.trim().toLowerCase());
      }
      const memberEmails = await getStructureEmails(
        db,
        structureId.toString(),
        {
          requireSystemAlerts: true,
          preference: 'annualReports',
        },
      );
      memberEmails.forEach((e) => recipients.add(e.trim().toLowerCase()));

      const stored = await persistReport(db, {
        structureId,
        structureName: (structure as any).name as string,
        periodStart: period.start,
        periodEnd: period.end,
        createdAt: now,
        stats,
        pdf,
        recipients: Array.from(recipients),
        emailSuppressed: !sendEmails,
      });

      if (sendEmails && recipients.size) {
        try {
          emailed += await sendReportEmail(
            db,
            stored,
            structure as WithId<Structure>,
            Array.from(recipients),
          );
        } catch (err) {
          const message = `Email sending failed for report ${stored._id}: ${(err as Error).message}`;
          errors.push(message);
          await db
            .collection('reports')
            .updateOne({ _id: stored._id }, { $push: { errors: message } });
          logger.error('Report email failed: %o', err);
        }
      }

      generated += 1;
      logger.info(
        'Generated annual report for structure %s',
        structureId.toString(),
      );
    } catch (err) {
      const message = `Report generation failed for structure ${structureId}: ${(err as Error).message}`;
      errors.push(message);
      logger.error('Report generation failed: %o', err);
    }
  }

  return { period, generated, skipped, emailed, errors };
}

export function scheduleAnnualReports(db: Db): NodeJS.Timeout {
  const intervalMs = Math.max(1, REPORT_CHECK_INTERVAL_HOURS) * MS_IN_HOUR;

  const run = () => {
    generateAnnualReports(db)
      .then((result) => {
        if (result.generated > 0) {
          logger.info(
            'Annual reports generated: %d (period %s)',
            result.generated,
            result.period.key,
          );
        }
      })
      .catch((err) => {
        logger.error('Annual report job failed: %o', err);
      });
  };

  run();
  return setInterval(run, intervalMs);
}

export async function listReports(
  db: Db,
  { structureId, limit = 20 }: { structureId?: string; limit?: number } = {},
): Promise<WithId<StoredReport>[]> {
  const query: Record<string, unknown> = {};
  if (structureId && ObjectId.isValid(structureId)) {
    query.structureId = new ObjectId(structureId);
  }
  return db
    .collection<StoredReport>('reports')
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function findReportById(
  db: Db,
  id: string,
): Promise<WithId<StoredReport> | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return db
    .collection<StoredReport>('reports')
    .findOne({ _id: new ObjectId(id) });
}
