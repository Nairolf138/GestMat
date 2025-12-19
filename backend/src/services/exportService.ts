import { Db, ObjectId } from 'mongodb';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { findStructureById, getStructures } from '../models/Structure';
import { findUserById, User } from '../models/User';
import { Equipment, findEquipments } from '../models/Equipment';
import { Vehicle } from '../models/Vehicle';
import { LoanRequest } from '../models/LoanRequest';
import createEquipmentFilter from '../utils/createEquipmentFilter';
import { sendMail } from '../utils/sendMail';

type ExportFormat = 'pdf' | 'xlsx';

export type EquipmentTypeFilter =
  | 'Son'
  | 'Lumière'
  | 'Vidéo'
  | 'Autre'
  | 'Autres'
  | 'Tous';

export interface EquipmentExportOptions {
  db: Db;
  userId: string;
  structureId: string;
  type?: EquipmentTypeFilter;
  format: ExportFormat;
  email?: boolean;
}

export interface AdminExportOptions {
  db: Db;
  userId: string;
  sections: string[];
  format: ExportFormat;
  email?: boolean;
}

interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const MAX_EXPORT_ITEMS = 5000;

const formatDate = (value?: Date | string): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().substring(0, 10);
};

const buildPdfBuffer = async (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
    doc.end();
  });

const normalizeTypeFilter = (type?: EquipmentTypeFilter): string | undefined => {
  if (!type || type === 'Tous') return undefined;
  if (type === 'Autres') return 'Autre';
  return type;
};

const ensureUser = async (db: Db, userId: string): Promise<User> => {
  const user = await findUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const buildEquipmentRows = (
  equipments: Equipment[],
  structureName?: string,
): Record<string, string>[] =>
  equipments.map((equipment) => {
    const totalQty =
      equipment.totalQty ?? (equipment as Record<string, unknown>).totalQty ?? '';
    const availableQty =
      equipment.availableQty ??
      (equipment as Record<string, unknown>).availableQty ??
      '';
    const availability =
      availableQty !== '' && totalQty !== ''
        ? `${availableQty}/${totalQty}`
        : '';
    return {
      name: String((equipment as Record<string, unknown>).name ?? ''),
      type: String(equipment.type ?? ''),
      availability,
      condition: String((equipment as Record<string, unknown>).condition ?? ''),
      status: String((equipment as Record<string, unknown>).status ?? ''),
      location:
        String((equipment as Record<string, unknown>).location ?? '') ||
        structureName ||
        '',
    };
  });

const addPdfSection = (
  doc: PDFKit.PDFDocument,
  title: string,
  headers: string[],
  rows: Array<Record<string, string>>,
  addPage = true,
): void => {
  if (addPage) {
    doc.addPage({ margin: 40 });
  } else {
    doc.moveDown();
  }
  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();
  doc.fontSize(11);
  const safeHeaders = headers.length ? headers : ['Data'];
  const columnWidths = safeHeaders.map(() => 100);
  const columnWidth = columnWidths.reduce((a, b) => a + b, 0) || 400;
  doc
    .text(safeHeaders.join(' | '), { width: columnWidth })
    .moveDown(0.5);
  if (!rows.length) {
    doc.text('No data');
  } else {
    rows.forEach((row) => {
      const line = safeHeaders
        .map((h) => row[h.toLowerCase()] || row[h] || '')
        .join(' | ');
      doc.text(line);
    });
  }
};

const populateAdminSections = async (
  db: Db,
  sections: string[],
): Promise<Record<string, Array<Record<string, string>>>> => {
  const result: Record<string, Array<Record<string, string>>> = {};
  const structures = await getStructures(db);
  const structureNames = new Map(
    structures.map((s) => [s._id?.toString() ?? '', String((s as any).name ?? '')]),
  );

  for (const section of sections) {
    switch (section) {
      case 'users': {
        const users = await db
          .collection('users')
          .find({})
          .limit(MAX_EXPORT_ITEMS)
          .toArray();
        result.users = users.map((user) => ({
          username: String((user as any).username ?? ''),
          email: String((user as any).email ?? ''),
          role: String((user as any).role ?? ''),
          structure: structureNames.get((user as any).structure?.toString?.() ?? '') ?? '',
        }));
        break;
      }
      case 'inventories': {
        const equipments = await db
          .collection<Equipment>('equipments')
          .find({})
          .limit(MAX_EXPORT_ITEMS)
          .toArray();
        result.inventories = equipments.map((equipment) => ({
          name: String((equipment as any).name ?? ''),
          type: String((equipment as any).type ?? ''),
          availability:
            equipment.availableQty !== undefined && equipment.totalQty !== undefined
              ? `${equipment.availableQty}/${equipment.totalQty}`
              : '',
          status: String((equipment as any).status ?? ''),
          condition: String((equipment as any).condition ?? ''),
          structure:
            structureNames.get((equipment as any).structure?.toString?.() ?? '') ??
            String((equipment as any).location ?? ''),
        }));
        break;
      }
      case 'vehicles': {
        const vehicles = await db
          .collection<Vehicle>('vehicles')
          .find({})
          .limit(MAX_EXPORT_ITEMS)
          .toArray();
        result.vehicles = vehicles.map((vehicle) => ({
          name: String(vehicle.name ?? ''),
          type: String(vehicle.type ?? ''),
          status: String(vehicle.status ?? ''),
          usage: String(vehicle.usage ?? ''),
          location: String(vehicle.location ?? ''),
          structure:
            structureNames.get((vehicle as any).structure?.toString?.() ?? '') ?? '',
        }));
        break;
      }
      case 'loansHistory': {
        const active = await db
          .collection<LoanRequest>('loanrequests')
          .find({})
          .limit(Math.floor(MAX_EXPORT_ITEMS / 2))
          .toArray();
        const archived = await db
          .collection<LoanRequest>('loanrequests_archive')
          .find({})
          .limit(Math.floor(MAX_EXPORT_ITEMS / 2))
          .toArray();
        const mapLoan = (loan: LoanRequest, archivedFlag: boolean) => ({
          status: String((loan as any).status ?? ''),
          borrower:
            structureNames.get((loan as any).borrower?.toString?.() ?? '') ?? '',
          owner: structureNames.get((loan as any).owner?.toString?.() ?? '') ?? '',
          startDate: formatDate((loan as any).startDate as Date),
          endDate: formatDate((loan as any).endDate as Date),
          archived: archivedFlag ? 'yes' : 'no',
        });
        result.loansHistory = [
          ...active.map((l) => mapLoan(l, false)),
          ...archived.map((l) => mapLoan(l, true)),
        ];
        break;
      }
      case 'structures': {
        result.structures = structures.map((structure) => ({
          name: String((structure as any).name ?? ''),
          city: String((structure as any).city ?? ''),
          contact: String((structure as any).contact ?? ''),
        }));
        break;
      }
      default:
        break;
    }
  }
  return result;
};

export async function generateEquipmentExport(
  options: EquipmentExportOptions,
): Promise<ExportResult> {
  const { db, userId, structureId, type, format, email } = options;
  const user = await ensureUser(db, userId);
  const structure = await findStructureById(db, structureId);
  const normalizedType = normalizeTypeFilter(type);
  const filter = createEquipmentFilter({
    structure: structureId,
    type: normalizedType,
  });
  const equipments = await findEquipments(db, filter, 1, 0);
  const rows = buildEquipmentRows(
    equipments,
    structure ? String((structure as any).name ?? '') : '',
  );
  const filenameBase = `equipments-${formatDate(new Date())}`;
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Equipments');
    sheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Availability', key: 'availability', width: 18 },
      { header: 'Condition', key: 'condition', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
    ];
    sheet.addRows(rows);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    if (email && user.email) {
      await sendMail({
        to: user.email,
        subject: 'Export équipements',
        text: 'Votre export est disponible en pièce jointe.',
        attachments: [
          { filename: `${filenameBase}.xlsx`, content: buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        ],
      });
    }
    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filenameBase}.xlsx`,
    };
  }
  const doc = new PDFDocument({ margin: 40 });
  doc.fontSize(20).text('Export équipements', { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(`Structure: ${((structure as any)?.name as string) || 'N/A'}`);
  doc.text(`Date: ${formatDate(new Date())}`);
  doc.text(`Auteur: ${user.username}`);
  doc.moveDown();
  addPdfSection(
    doc,
    'Inventaire',
    ['Name', 'Type', 'Availability', 'Condition', 'Status', 'Location'],
    rows,
    false,
  );
  const buffer = await buildPdfBuffer(doc);
  if (email && user.email) {
    await sendMail({
      to: user.email,
      subject: 'Export équipements',
      text: 'Votre export est disponible en pièce jointe.',
      attachments: [{ filename: `${filenameBase}.pdf`, content: buffer }],
    });
  }
  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${filenameBase}.pdf`,
  };
}

export async function generateAdminExport(
  options: AdminExportOptions,
): Promise<ExportResult> {
  const { db, userId, sections, format, email } = options;
  const normalizedSections = Array.from(new Set(sections)).filter(Boolean);
  if (!normalizedSections.length) {
    throw new Error('At least one section is required');
  }
  const user = await ensureUser(db, userId);
  const data = await populateAdminSections(db, normalizedSections);
  const filenameBase = `admin-export-${formatDate(new Date())}`;
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    for (const section of Object.keys(data)) {
      const worksheet = workbook.addWorksheet(section);
      const rows = data[section];
      const keys = rows.length ? Object.keys(rows[0]) : [];
      worksheet.columns = keys.map((key) => ({
        header: key,
        key,
        width: 25,
      }));
      worksheet.addRows(rows);
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    if (email && user.email) {
      await sendMail({
        to: user.email,
        subject: 'Export administration',
        text: 'Votre export est disponible en pièce jointe.',
        attachments: [
          {
            filename: `${filenameBase}.xlsx`,
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      });
    }
    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filenameBase}.xlsx`,
    };
  }
  const doc = new PDFDocument({ margin: 40 });
  doc.fontSize(20).text('Export administration', { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(`Date: ${formatDate(new Date())}`);
  doc.text(`Auteur: ${user.username}`);
  doc.moveDown();
  for (const [index, [section, rows]] of Object.entries(data).entries()) {
    const headers = rows.length ? Object.keys(rows[0]) : [];
    addPdfSection(doc, section, headers, rows, index !== 0);
    doc.moveDown();
  }
  const buffer = await buildPdfBuffer(doc);
  if (email && user.email) {
    await sendMail({
      to: user.email,
      subject: 'Export administration',
      text: 'Votre export est disponible en pièce jointe.',
      attachments: [{ filename: `${filenameBase}.pdf`, content: buffer }],
    });
  }
  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${filenameBase}.pdf`,
  };
}
