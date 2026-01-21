import { Db, ObjectId } from 'mongodb';
import PDFDocument from 'pdfkit';
import { InvestmentPlan } from '../models/InvestmentPlan';

export interface InvestmentTypeSummary {
  type: string;
  year1Total: number;
  year2Total: number;
  total: number;
}

export interface InvestmentYearSummary {
  year: string;
  total: number;
}

export interface InvestmentSummary {
  yearTotals: InvestmentYearSummary[];
  typeTotals: InvestmentTypeSummary[];
  grandTotal: number;
}

export async function getInvestmentSummary(
  db: Db,
  { structureId }: { structureId?: string } = {},
): Promise<InvestmentSummary> {
  const match: Record<string, unknown> = {};
  if (structureId && ObjectId.isValid(structureId)) {
    match.structure = new ObjectId(structureId);
  }

  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    { $unwind: '$lines' },
    {
      $project: {
        type: { $ifNull: ['$lines.type', 'Non typé'] },
        targetYear: '$lines.targetYear',
        totalCost: { $ifNull: ['$lines.totalCost', 0] },
      },
    },
    {
      $group: {
        _id: { type: '$type', targetYear: '$targetYear' },
        total: { $sum: '$totalCost' },
      },
    },
  ];

  const aggregates = await db
    .collection<InvestmentPlan>('investmentplans')
    .aggregate(pipeline)
    .toArray();

  const typeMap = new Map<string, InvestmentTypeSummary>();
  const yearTotals: Record<string, number> = { year1: 0, year2: 0 };
  let grandTotal = 0;

  aggregates.forEach((entry) => {
    const type = String(entry._id?.type ?? 'Non typé');
    const targetYear = String(entry._id?.targetYear ?? '');
    const total = typeof entry.total === 'number' ? entry.total : 0;

    if (!typeMap.has(type)) {
      typeMap.set(type, {
        type,
        year1Total: 0,
        year2Total: 0,
        total: 0,
      });
    }
    const summary = typeMap.get(type);
    if (!summary) return;
    if (targetYear === 'year1') summary.year1Total += total;
    if (targetYear === 'year2') summary.year2Total += total;
    summary.total += total;

    if (targetYear === 'year1' || targetYear === 'year2') {
      yearTotals[targetYear] += total;
    }
    grandTotal += total;
  });

  const typeTotals = Array.from(typeMap.values()).sort((a, b) =>
    a.type.localeCompare(b.type, 'fr'),
  );

  return {
    yearTotals: [
      { year: 'year1', total: yearTotals.year1 },
      { year: 'year2', total: yearTotals.year2 },
    ],
    typeTotals,
    grandTotal,
  };
}

const formatAmount = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function renderInvestmentSummaryCsv(summary: InvestmentSummary): string {
  const lines: string[] = [];
  lines.push('Type;Libellé;Année N;Année N+1;Total');
  summary.yearTotals.forEach((year) => {
    const label = year.year === 'year1' ? 'Année N' : 'Année N+1';
    const row = `Année;${label};${formatAmount(
      year.year === 'year1' ? year.total : 0,
    )};${formatAmount(year.year === 'year2' ? year.total : 0)};${formatAmount(year.total)}`;
    lines.push(row);
  });
  summary.typeTotals.forEach((typeSummary) => {
    lines.push(
      [
        'Type',
        csvEscape(typeSummary.type),
        formatAmount(typeSummary.year1Total),
        formatAmount(typeSummary.year2Total),
        formatAmount(typeSummary.total),
      ].join(';'),
    );
  });
  lines.push(`Total;Global;;;${formatAmount(summary.grandTotal)}`);
  return lines.join('\n');
}

export async function renderInvestmentSummaryPdf(
  summary: InvestmentSummary,
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, compress: false });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  doc.fontSize(18).text('Synthèse des investissements', { align: 'center' });
  doc.moveDown();

  doc.fontSize(13).text('Totaux par année');
  summary.yearTotals.forEach((year) => {
    const label = year.year === 'year1' ? 'Année N' : 'Année N+1';
    doc.fontSize(11).text(`${label}: ${formatAmount(year.total)} €`);
  });
  doc.moveDown();

  doc.fontSize(13).text('Totaux par type');
  if (!summary.typeTotals.length) {
    doc.fontSize(11).text('Aucune donnée');
  } else {
    summary.typeTotals.forEach((typeSummary) => {
      doc
        .fontSize(11)
        .text(
          `${typeSummary.type}: ${formatAmount(typeSummary.total)} € (Année N: ${formatAmount(
            typeSummary.year1Total,
          )} €, Année N+1: ${formatAmount(typeSummary.year2Total)} €)`,
        );
    });
  }
  doc.moveDown();

  doc.fontSize(12).text(`Total global: ${formatAmount(summary.grandTotal)} €`);
  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
