import { ClientSession, Db, ObjectId } from 'mongodb';
import {
  findLoans,
  LoanItem,
  LoanRequest,
  populateLoanRequest,
} from '../models/LoanRequest';
import { findUserById } from '../models/User';
import { ADMIN_ROLE, REGISSEUR_GENERAL_ROLE, ROLES } from '../config/roles';
import { forbidden, notFound, badRequest } from '../utils/errors';
import { checkEquipmentAvailability } from '../utils/checkAvailability';
import { checkVehicleAvailability } from '../utils/checkVehicleAvailability';
import { canModify, normalizeRole } from '../utils/roleAccess';
import { canManageVehicle } from '../utils/vehicleAccess';
import {
  canAccessEquipmentLine,
  idOf,
  loanLines,
  lineStatus,
  newLineId,
  publicActor,
  summarizeLines,
} from '../utils/loanLines';
import { deliverLoanNotification } from '../utils/getLoanRecipients';
import {
  loanCreationTemplate,
  loanStatusTemplate,
} from '../utils/mailTemplates';
import logger from '../utils/logger';
import type { AuthUser } from '../types';

const CLOSED = ['refused', 'cancelled'];

function decisionVersion(loan: LoanRequest, item: LoanItem): string {
  const stamp = (value: unknown): string => {
    const date = new Date(value as Date);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  };
  return JSON.stringify([
    item.quantity ?? 1,
    stamp(loan.startDate),
    stamp(loan.endDate),
  ]);
}

async function account(db: Db, user: AuthUser): Promise<any> {
  const current = await findUserById(db, user.id);
  if (!current?.role || !ROLES.includes(normalizeRole(current.role)))
    throw forbidden('Account unavailable');
  return { ...current, id: user.id, role: normalizeRole(current.role) };
}

async function lineRights(
  db: Db,
  user: any,
  item: LoanItem,
  loan: LoanRequest,
): Promise<any> {
  if (item.kind === 'vehicle') {
    const manager = await canManageVehicle(db, user, item.vehicle);
    const requester = idOf(loan.requestedBy) === user.id;
    return {
      canRead: manager || requester,
      canDecide: manager,
      canCancel: manager || requester,
      canEdit: requester || user.role === ADMIN_ROLE,
    };
  }
  const canRead = canAccessEquipmentLine(user, item, loan);
  const admin = user.role === ADMIN_ROLE;
  const borrower = idOf(loan.borrower) === idOf(user.structure);
  return {
    canRead,
    canDecide: canRead && (admin || idOf(loan.owner) === idOf(user.structure)),
    canCancel: canRead && (admin || borrower),
    canEdit: canRead && (admin || borrower),
  };
}

async function viewLoan(
  db: Db,
  loan: LoanRequest,
  user: any,
): Promise<LoanRequest | null> {
  const visible: LoanItem[] = [];
  for (const item of loanLines(loan)) {
    const rights = await lineRights(db, user, item, loan);
    if (rights.canRead)
      visible.push({
        ...item,
        decisionVersion: decisionVersion(loan, item),
        permissions: rights,
      });
  }
  if (!visible.length) return null;
  const lineIds = new Set(visible.map((it) => it.lineId));
  const history = ((loan.history || []) as any[]).filter(
    (entry) => !entry.lineId || lineIds.has(entry.lineId),
  );
  const editable =
    !loan.archived &&
    visible.length === (loan.items || []).length &&
    visible.some((it) => lineStatus(it, loan) === 'pending') &&
    visible.every(
      (it) =>
        (it.permissions as any).canEdit &&
        ['pending', 'cancelled'].includes(lineStatus(it, loan)),
    ) &&
    new Date(loan.startDate as any) > new Date();
  return {
    ...loan,
    items: visible,
    history,
    status: summarizeLines(visible),
    hasPendingItems: visible.some((it) => lineStatus(it, loan) === 'pending'),
    permissions: {
      canEdit: editable,
      asOwner: visible.some((it) => (it.permissions as any).canDecide),
      asBorrower: visible.some((it) => (it.permissions as any).canEdit),
      canCancel:
        !loan.archived &&
        visible.length === (loan.items || []).length &&
        visible.every((it) => (it.permissions as any).canCancel) &&
        (visible.every((it) => lineStatus(it, loan) === 'pending') ||
          new Date(loan.startDate as any) > new Date()),
    },
  };
}

function results(value: any): LoanRequest[] {
  return Array.isArray(value) ? value : value.loans;
}

export async function listLoans(
  db: Db,
  user: AuthUser,
  page?: number,
  limit?: number,
  includeArchived = false,
): Promise<any> {
  const current = await account(db, user);
  // Filter before pagination. Vehicle managers can belong to any structure.
  let filter: any = {};
  if (current.role !== ADMIN_ROLE) {
    const structure = idOf(current.structure);
    const vehicles = await db
      .collection('vehicles')
      .find(
        {
          $or: [
            { managerIds: new ObjectId(current.id) },
            ...(current.role === REGISSEUR_GENERAL_ROLE &&
            ObjectId.isValid(structure)
              ? [
                  {
                    structure: new ObjectId(structure),
                    managerIds: { $exists: false },
                  },
                ]
              : []),
          ],
        },
        { projection: { _id: 1 } },
      )
      .toArray();
    filter = {
      $or: [
        ...(ObjectId.isValid(structure)
          ? [
              { owner: new ObjectId(structure) },
              { borrower: new ObjectId(structure) },
            ]
          : []),
        { requestedBy: new ObjectId(current.id) },
        { 'items.vehicle': { $in: vehicles.map((vehicle) => vehicle._id) } },
      ],
    };
  }
  const loans = results(
    await findLoans(db, filter, undefined, undefined, { includeArchived }),
  );
  const visible = (
    await Promise.all(loans.map((loan) => viewLoan(db, loan, current)))
  ).filter(Boolean);
  return page !== undefined && limit !== undefined
    ? {
        loans: visible.slice((page - 1) * limit, page * limit),
        total: visible.length,
      }
    : visible;
}

export async function countPendingLoans(
  db: Db,
  user: AuthUser,
): Promise<number> {
  const loans = await listLoans(db, user);
  return loans.filter(
    (loan: any) =>
      !loan.archived &&
      loan.items.some(
        (item: any) =>
          item.decision.status === 'pending' && item.permissions.canDecide,
      ),
  ).length;
}

export async function listDueSoonLoans(
  db: Db,
  user: AuthUser,
): Promise<LoanRequest[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 86400000);
  return (await listLoans(db, user)).filter(
    (loan: any) =>
      !CLOSED.includes(loan.status) &&
      new Date(loan.endDate) >= now &&
      new Date(loan.endDate) <= soon,
  );
}

export async function getLoanRequestById(
  db: Db,
  id: string,
  user: AuthUser,
): Promise<LoanRequest | null> {
  const current = await account(db, user);
  const loan = results(
    await findLoans(db, { _id: new ObjectId(id) }, undefined, undefined, {
      includeArchived: true,
    }),
  )[0];
  return loan ? viewLoan(db, loan, current) : null;
}

function dates(data: any): { start: Date; end: Date } {
  const start = new Date(data.startDate),
    end = new Date(data.endDate);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  )
    throw badRequest('Invalid loan dates');
  return { start, end };
}

async function requestedItems(
  db: Db,
  data: any,
  user: any,
  session: ClientSession,
  existingLines: LoanItem[] = [],
): Promise<LoanItem[]> {
  if (!Array.isArray(data.items) || !data.items.length)
    throw badRequest('At least one item is required');
  const seen = new Set<string>();
  const items: LoanItem[] = [];
  for (const input of data.items) {
    const kind = input.kind === 'vehicle' ? 'vehicle' : 'equipment';
    const id = idOf(input[kind]);
    if (!ObjectId.isValid(id) || seen.has(`${kind}:${id}`))
      throw badRequest('Invalid or duplicated item');
    seen.add(`${kind}:${id}`);
    const resource = await db
      .collection(kind === 'vehicle' ? 'vehicles' : 'equipments')
      .findOne({ _id: new ObjectId(id) }, { session });
    if (!resource) throw notFound('Item not found');
    if (idOf(resource.structure) !== idOf(data.owner))
      throw forbidden('Item must belong to the owner structure');
    const existing = existingLines.find(
      (line) => line.kind === kind && idOf(line[kind]) === id,
    );
    const domain = existing?.equipmentType || resource.type;
    if (kind === 'equipment' && (!domain || !canModify(user.role, domain)))
      throw forbidden('Access denied');
    const quantity = kind === 'vehicle' ? 1 : Number(input.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      throw badRequest('Invalid quantity');
    items.push({
      kind,
      [kind]: resource._id,
      quantity,
      lineId: newLineId(),
      equipmentType: resource.type,
      resourceIdentity: {
        name: resource.name,
        type: resource.type,
        structure: resource.structure,
        ...(kind === 'vehicle'
          ? { registrationNumber: resource.registrationNumber }
          : {}),
      },
      decision: { status: 'pending' },
    });
  }
  return items;
}

async function syncAvailability(
  db: Db,
  loan: any,
  previous: any,
  session: ClientSession,
  checkPendingVehicles = false,
): Promise<void> {
  const { start, end } = dates(loan);
  const vehicleIds = new Set<string>();
  for (const item of [...(previous?.items || []), ...loan.items]) {
    const kind = item.kind === 'vehicle' ? 'vehicle' : 'equipment';
    await db
      .collection(kind === 'vehicle' ? 'vehicles' : 'equipments')
      .updateOne(
        { _id: new ObjectId(idOf(item[kind])) },
        { $currentDate: { updatedAt: true } },
        { session },
      );
    if (kind === 'vehicle') vehicleIds.add(idOf(item.vehicle));
  }
  for (const id of vehicleIds) {
    await db
      .collection('vehicles')
      .updateOne(
        { _id: new ObjectId(id) },
        { $pull: { reservations: { loanRequestId: loan._id } } } as any,
        { session },
      );
  }
  for (const item of loan.items) {
    const status = lineStatus(item, loan);
    if (CLOSED.includes(status)) continue;
    if (item.kind === 'vehicle') {
      if (status === 'accepted' || checkPendingVehicles) {
        const available = await checkVehicleAvailability(
          db,
          idOf(item.vehicle),
          start,
          end,
          session,
          loan._id,
        );
        if (!available?.available) throw badRequest('Vehicle not available');
      }
      if (status === 'accepted')
        await db.collection('vehicles').updateOne(
          { _id: new ObjectId(idOf(item.vehicle)) },
          {
            $push: { reservations: { start, end, loanRequestId: loan._id } },
          } as any,
          { session },
        );
    } else {
      const available = await checkEquipmentAvailability(
        db,
        idOf(item.equipment),
        start,
        end,
        item.quantity,
        session,
        loan._id,
      );
      if (!available?.available) throw badRequest('Quantity not available');
    }
  }
}

async function transact<T>(
  db: Db,
  callback: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = (db as any).client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function notify(
  db: Db,
  loan: LoanRequest,
  action: string,
  actor?: string,
  creation = false,
): Promise<void> {
  try {
    await deliverLoanNotification(
      db,
      loan,
      ({ loan: scopedLoan, role }) =>
        creation && action === 'pending'
          ? loanCreationTemplate({ loan: scopedLoan, role })
          : loanStatusTemplate({
              loan: scopedLoan,
              role,
              status: action,
              actor,
            }),
      creation && action === 'pending' ? 'loanRequests' : 'loanStatusChanges',
    );
  } catch (err) {
    logger.error('Loan notification error for %s: %o', loan._id, err);
  }
}

const actorName = (user: any): string =>
  `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
  user.username ||
  'Utilisateur';

export async function createLoanRequest(
  db: Db,
  data: LoanRequest,
  user: AuthUser,
): Promise<LoanRequest> {
  const current = await account(db, user);
  const { start, end } = dates(data);
  const direct = Boolean(data.direct);
  if (current.role !== ADMIN_ROLE) {
    if (
      direct
        ? idOf(data.owner) !== idOf(current.structure)
        : idOf(data.borrower) !== idOf(current.structure)
    )
      throw forbidden('Access denied');
  }
  const loan = await transact(db, async (session) => {
    if (
      !ObjectId.isValid(idOf(data.owner)) ||
      !ObjectId.isValid(idOf(data.borrower))
    )
      throw badRequest('Invalid structure');
    const structureCount = await db.collection('structures').countDocuments(
      {
        _id: {
          $in: [...new Set([idOf(data.owner), idOf(data.borrower)])].map(
            (id) => new ObjectId(id),
          ),
        },
      },
      { session },
    );
    if (
      structureCount !== new Set([idOf(data.owner), idOf(data.borrower)]).size
    )
      throw badRequest('Structure not found');
    const items = await requestedItems(db, data, current, session);
    if (
      idOf(data.owner) === idOf(data.borrower) &&
      items.some((item) => item.kind !== 'vehicle')
    )
      throw forbidden('Cannot request loan for own structure');
    // A vehicle booking always needs a manager decision, including a booking at its home structure.
    for (const item of items)
      if (direct && item.kind !== 'vehicle')
        item.decision = {
          status: 'accepted',
          actor: publicActor(current),
          at: new Date(),
        };
    const raw: any = {
      _id: new ObjectId(),
      schemaVersion: 2,
      owner: new ObjectId(idOf(data.owner)),
      borrower: new ObjectId(idOf(data.borrower)),
      requestedBy: new ObjectId(user.id),
      requesterIdentity: publicActor(current),
      items,
      startDate: start,
      endDate: end,
      note: typeof data.note === 'string' ? data.note.trim() : '',
      directEntry: direct,
      status: summarizeLines(items),
      createdAt: new Date(),
      history: items.map((item) => ({
        lineId: item.lineId,
        action: direct && item.kind !== 'vehicle' ? 'accepted' : 'created',
        quantity: item.quantity,
        resourceName:
          (item.resourceIdentity as any)?.name ||
          (item.equipment as any)?.name ||
          (item.vehicle as any)?.name,
        actor: publicActor(current),
        at: new Date(),
      })),
    };
    if (direct && items.some((item) => item.kind !== 'vehicle'))
      raw.processedBy = new ObjectId(user.id);
    await syncAvailability(db, raw, null, session, true);
    await db.collection('loanrequests').insertOne(raw, { session });
    return raw;
  });
  const populated = await populateLoanRequest(db, loan);
  await notify(
    db,
    populated,
    populated.status as string,
    actorName(current),
    true,
  );
  return (await viewLoan(db, populated, current))!;
}

export async function updateLoanRequest(
  db: Db,
  user: AuthUser,
  id: string,
  data: LoanRequest,
): Promise<LoanRequest | null> {
  const current = await account(db, user);
  const allowed = [
    'status',
    'decisions',
    'decisionNote',
    'expectedRevision',
    'startDate',
    'endDate',
    'items',
    'note',
  ];
  if (Object.keys(data).some((key) => !allowed.includes(key)))
    throw badRequest('Protected or unknown loan field');
  let changedIds: string[] = [];
  const updated = await transact(db, async (session) => {
    changedIds = [];
    const raw: any = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(id), archived: { $ne: true } }, { session });
    if (!raw) throw notFound('Loan request not found');
    const populated = await populateLoanRequest(
      db,
      { ...raw, items: (raw.items || []).map((item: any) => ({ ...item })) },
      session,
    );
    const oldLines = loanLines(populated);
    let items: any[] = loanLines(raw);
    const history: any[] = [...(raw.history || [])];
    const editing = ['items', 'startDate', 'endDate', 'note'].some(
      (key) => data[key] !== undefined,
    );
    const deciding = data.decisions !== undefined || data.status !== undefined;
    if (editing && deciding)
      throw badRequest('Edit and decision must be separate operations');
    if (editing) {
      if (
        data.expectedRevision !== undefined &&
        data.expectedRevision !== (raw.revision || 0)
      )
        throw badRequest('Request has changed; reload before editing');
      const rights = await Promise.all(
        oldLines.map((item) => lineRights(db, current, item, populated)),
      );
      if (
        new Date(raw.startDate) <= new Date() ||
        !oldLines.some((item) => lineStatus(item, raw) === 'pending') ||
        oldLines.some(
          (item) => !['pending', 'cancelled'].includes(lineStatus(item, raw)),
        ) ||
        rights.some((right) => !right.canEdit)
      )
        throw forbidden('Request cannot be edited');
      if (data.items) {
        items = await requestedItems(
          db,
          { ...raw, items: data.items },
          current,
          session,
          oldLines,
        );
        for (const item of items) {
          const existing = oldLines.find(
            (old: any) =>
              old.kind === item.kind &&
              idOf(old[item.kind]) === idOf(item[item.kind]),
          );
          if (existing && lineStatus(existing, raw) === 'pending') {
            item.lineId = existing.lineId;
            // Inventory reclassification cannot change an existing line's domain.
            const original = loanLines(raw).find(
              (line) => line.lineId === existing.lineId,
            );
            item.equipmentType =
              original?.equipmentType || existing.equipmentType;
            item.resourceIdentity =
              original?.resourceIdentity || item.resourceIdentity;
          }
        }
      }
      if (data.items) {
        for (const old of loanLines(raw)) {
          if (items.some((item) => item.lineId === old.lineId)) continue;
          items.push({
            ...old,
            decision:
              lineStatus(old, raw) === 'cancelled'
                ? old.decision
                : {
                    status: 'cancelled',
                    actor: publicActor(current),
                    at: new Date(),
                    note: 'Ligne retirée de la demande',
                  },
          });
        }
      }
      const sharedFieldsChanged =
        (data.startDate !== undefined &&
          new Date(data.startDate).getTime() !==
            new Date(raw.startDate).getTime()) ||
        (data.endDate !== undefined &&
          new Date(data.endDate).getTime() !==
            new Date(raw.endDate).getTime()) ||
        (data.note !== undefined &&
          String(data.note).trim() !== String(raw.note || '').trim());
      changedIds = items
        .filter((item) => {
          const previous = oldLines.find((old) => old.lineId === item.lineId);
          return (
            !previous ||
            item.quantity !== previous.quantity ||
            lineStatus(item, raw) !== lineStatus(previous, raw) ||
            (sharedFieldsChanged && !CLOSED.includes(lineStatus(item, raw)))
          );
        })
        .map((item) => String(item.lineId));
      for (const lineId of changedIds)
        history.push({
          lineId,
          action: 'modified',
          resourceName: (
            items.find((item) => item.lineId === lineId)
              ?.resourceIdentity as any
          )?.name,
          quantity: items.find((item) => item.lineId === lineId)?.quantity,
          actor: publicActor(current),
          at: new Date(),
        });
    } else if (deciding) {
      let decisions: any[];
      if (Array.isArray(data.decisions)) decisions = data.decisions as any[];
      else {
        if (
          !['accepted', 'refused', 'cancelled'].includes(data.status as string)
        )
          throw badRequest('Invalid decision');
        decisions = [];
        for (const item of oldLines) {
          const rights = await lineRights(db, current, item, populated);
          if (
            data.status === 'cancelled' ? rights.canCancel : rights.canDecide
          ) {
            if (
              data.status === 'cancelled'
                ? !CLOSED.includes(lineStatus(item, raw))
                : lineStatus(item, raw) === 'pending'
            )
              decisions.push({
                lineId: item.lineId,
                status: data.status,
                note: data.decisionNote,
              });
          }
        }
      }
      if (!decisions.length) throw forbidden('No eligible line to decide');
      const seen = new Set<string>();
      for (const decision of decisions) {
        if (
          Object.keys(decision).some(
            (key) =>
              ![
                'lineId',
                'status',
                'note',
                'expectedStatus',
                'expectedVersion',
              ].includes(key),
          ) ||
          seen.has(decision.lineId) ||
          !['accepted', 'refused', 'cancelled'].includes(decision.status)
        )
          throw badRequest('Invalid or duplicated decision');
        seen.add(decision.lineId);
        const index = oldLines.findIndex(
          (item) => item.lineId === decision.lineId,
        );
        if (index < 0) throw forbidden('Access denied');
        const item = oldLines[index];
        const rights = await lineRights(db, current, item, populated);
        if (
          decision.status === 'cancelled'
            ? !rights.canCancel
            : !rights.canDecide
        )
          throw forbidden('Access denied');
        const existingStatus = lineStatus(item, raw);
        if (existingStatus === decision.status) continue; // replay: no duplicate history or email
        if (decision.status === 'cancelled') {
          if (
            existingStatus !== 'pending' &&
            new Date(raw.startDate) <= new Date() &&
            current.role !== ADMIN_ROLE
          )
            throw forbidden('Request has already started');
        } else if (existingStatus !== 'pending')
          throw badRequest('Line has already been decided');
        if (
          decision.expectedStatus &&
          decision.expectedStatus !== existingStatus
        )
          throw badRequest('Line has changed; reload the request');
        if (
          decision.expectedVersion !== undefined &&
          decision.expectedVersion !== decisionVersion(raw, item)
        )
          throw badRequest(
            'Line quantity or dates changed; reload the request',
          );
        const note =
          typeof decision.note === 'string' ? decision.note.trim() : '';
        if (note.length > 500) throw badRequest('Decision note is too long');
        items[index].decision = {
          status: decision.status,
          actor: publicActor(current),
          at: new Date(),
          note,
        };
        history.push({
          lineId: item.lineId,
          action: decision.status,
          quantity: item.quantity,
          resourceName:
            (item.resourceIdentity as any)?.name ||
            (item.equipment as any)?.name ||
            (item.vehicle as any)?.name,
          actor: publicActor(current),
          at: new Date(),
          note,
        });
        changedIds.push(String(item.lineId));
      }
    } else throw badRequest('No change provided');
    if (!changedIds.length) return raw;
    const next: any = {
      ...raw,
      schemaVersion: 2,
      items,
      history,
      startDate: data.startDate ? new Date(data.startDate) : raw.startDate,
      endDate: data.endDate ? new Date(data.endDate) : raw.endDate,
      ...(data.note !== undefined ? { note: String(data.note).trim() } : {}),
      status: summarizeLines(items),
      updatedAt: new Date(),
      revision: (raw.revision || 0) + 1,
      ...(deciding ? { processedBy: new ObjectId(current.id) } : {}),
    };
    dates(next);
    await syncAvailability(db, next, raw, session, editing);
    await db
      .collection('loanrequests')
      .replaceOne({ _id: raw._id }, next, { session });
    return next;
  });
  const populated = await populateLoanRequest(db, updated);
  if (changedIds.length) {
    const eventLoan = {
      ...populated,
      items: populated.items!.filter((item) =>
        changedIds.includes(String(item.lineId)),
      ),
    };
    // Removed lines must also appear in the edit/cancellation notification.
    await notify(
      db,
      eventLoan,
      (data.status as string) || (data.decisions ? 'updated' : 'modified'),
      actorName(current),
    );
  }
  return viewLoan(db, populated, current);
}

export async function deleteLoanRequest(
  db: Db,
  user: AuthUser,
  id: string,
): Promise<{ message: string }> {
  const current = await account(db, user);
  const archived = await transact(db, async (session) => {
    const raw: any = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(id), archived: { $ne: true } }, { session });
    if (!raw) throw notFound('Loan request not found');
    const populated = await populateLoanRequest(
      db,
      { ...raw, items: (raw.items || []).map((item: any) => ({ ...item })) },
      session,
    );
    const items: any[] = loanLines(raw);
    for (const item of loanLines(populated)) {
      const rights = await lineRights(db, current, item, populated);
      if (
        !rights.canCancel ||
        (lineStatus(item, raw) !== 'pending' &&
          new Date(raw.startDate) <= new Date() &&
          current.role !== ADMIN_ROLE)
      )
        throw forbidden('Access denied');
    }
    const now = new Date();
    const history = [...(raw.history || [])];
    for (const item of items) {
      history.push({
        lineId: item.lineId,
        action: 'deleted',
        quantity: item.quantity,
        resourceName:
          (item.resourceIdentity as any)?.name ||
          (item.equipment as any)?.name ||
          (item.vehicle as any)?.name,
        actor: publicActor(current),
        at: now,
      });
      item.decision = {
        status: 'cancelled',
        actor: publicActor(current),
        at: now,
      };
    }
    const next = {
      ...raw,
      schemaVersion: 2,
      items,
      history,
      status: 'cancelled',
      archived: true,
      archivedAt: now,
    };
    await syncAvailability(db, next, raw, session);
    await db
      .collection('loanrequests')
      .replaceOne({ _id: raw._id }, next, { session });
    return next;
  });
  await notify(
    db,
    await populateLoanRequest(db, archived),
    'cancelled',
    actorName(current),
  );
  return { message: 'Loan request deleted' };
}

export default {
  listLoans,
  getLoanRequestById,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
};
