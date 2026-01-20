import { Db, ObjectId } from 'mongodb';
import PDFDocument from 'pdfkit';
import { InvestmentPlan } from '../models/InvestmentPlan';

export interface InvestmentCategorySummary {
  category: string;
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
  categoryTotals: InvestmentCategorySummary[];
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
        category: { $ifNull: ['$lines.category', 'Non catégorisé'] },
        targetYear: '$lines.targetYear',
        totalCost: { $ifNull: ['$lines.totalCost', 0] },
      },
    },
    {
      $group: {
        _id: { category: '$category', targetYear: '$targetYear' },
        total: { $sum: '$totalCost' },
      },
    },
  ];

  const aggregates = await db
    .collection<InvestmentPlan>('investmentplans')
    .aggregate(pipeline)
    .toArray();

  const categoryMap = new Map<string, InvestmentCategorySummary>();
  const yearTotals: Record<string, number> = { year1: 0, year2: 0 };
  let grandTotal = 0;

  aggregates.forEach((entry) => {
    const category = String(entry._id?.category ?? 'Non catégorisé');
    const targetYear = String(entry._id?.targetYear ?? '');
    const total = typeof entry.total === 'number' ? entry.total : 0;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        year1Total: 0,
        year2Total: 0,
        total: 0,
      });
    }
    const summary = categoryMap.get(category);
    if (!summary) return;
    if (targetYear === 'year1') summary.year1Total += total;
    if (targetYear === 'year2') summary.year2Total += total;
    summary.total += total;

    if (targetYear === 'year1' || targetYear === 'year2') {
      yearTotals[targetYear] += total;
    }
    grandTotal += total;
  });

  const categoryTotals = Array.from(categoryMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category, 'fr'),
  );

  return {
    yearTotals: [
      { year: 'year1', total: yearTotals.year1 },
      { year: 'year2', total: yearTotals.year2 },
    ],
    categoryTotals,
    grandTotal,
  };
}

const formatAmount = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function renderInvestmentSummaryCsv(summary: InvestmentSummary): string {
  const lines: string[] = [];
  lines.push('Type;Libellé;Année 1;Année 2;Total');
  summary.yearTotals.forEach((year) => {
    const label = year.year === 'year1' ? 'Année 1' : 'Année 2';
    const row = `Année;${label};${formatAmount(
      year.year === 'year1' ? year.total : 0,
    )};${formatAmount(year.year === 'year2' ? year.total : 0)};${formatAmount(year.total)}`;
    lines.push(row);
  });
  summary.categoryTotals.forEach((category) => {
    lines.push(
      [
        'Catégorie',
        csvEscape(category.category),
        formatAmount(category.year1Total),
        formatAmount(category.year2Total),
        formatAmount(category.total),
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
    const label = year.year === 'year1' ? 'Année 1' : 'Année 2';
    doc.fontSize(11).text(`${label}: ${formatAmount(year.total)} €`);
  });
  doc.moveDown();

  doc.fontSize(13).text('Totaux par catégorie');
  if (!summary.categoryTotals.length) {
    doc.fontSize(11).text('Aucune donnée');
  } else {
    summary.categoryTotals.forEach((category) => {
      doc
        .fontSize(11)
        .text(
          `${category.category}: ${formatAmount(category.total)} € (Année 1: ${formatAmount(
            category.year1Total,
          )} €, Année 2: ${formatAmount(category.year2Total)} €)`,
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
