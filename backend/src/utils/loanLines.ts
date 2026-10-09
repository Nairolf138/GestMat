import { ObjectId } from 'mongodb';
import type { LoanItem, LoanRequest } from '../models/LoanRequest';
import { ADMIN_ROLE, REGISSEUR_GENERAL_ROLE } from '../config/roles';
import { canModify, normalizeRole } from './roleAccess';

export const idOf = (value: any): string =>
  value?._id?.toString?.() || value?.toString?.() || '';

export function lineStatus(item: LoanItem, loan: LoanRequest): string {
  return (
    (item.decision as any)?.status ||
    (['accepted', 'refused', 'cancelled'].includes(loan.status as string)
      ? (loan.status as string)
      : 'pending')
  );
}

export function loanLines(loan: LoanRequest): LoanItem[] {
  return (loan.items || []).map((item, index) => ({
    ...item,
    lineId: item.lineId || `${idOf(loan)}:${index}`,
    decision: item.decision || {
      status: lineStatus(item, loan),
      ...(loan.processedBy ? { actor: loan.processedBy } : {}),
      ...(loan.decisionNote ? { note: loan.decisionNote } : {}),
      legacy: true,
    },
  }));
}

export function summarizeLines(items: LoanItem[]): string {
  const statuses = items.map(
    (item) => (item.decision as any)?.status || 'pending',
  );
  if (!statuses.length || statuses.every((s) => s === 'pending'))
    return 'pending';
  for (const status of ['accepted', 'refused', 'cancelled']) {
    if (statuses.every((s) => s === status)) return status;
  }
  if (statuses.includes('accepted')) return 'partial';
  return statuses.includes('pending') ? 'pending' : 'refused';
}

export function publicActor(user: any): any {
  if (!user || !user._id) return user;
  const { _id, username, firstName, lastName, role, structure } = user;
  return {
    _id,
    username,
    firstName,
    lastName,
    role,
    structure: idOf(structure) || undefined,
  };
}

export function canAccessEquipmentLine(
  user: any,
  item: LoanItem,
  loan: LoanRequest,
): boolean {
  const role = normalizeRole(user.role || '');
  if (role === ADMIN_ROLE) return true;
  const structure = idOf(user.structure);
  if (
    !structure ||
    ![idOf(loan.owner), idOf(loan.borrower)].includes(structure)
  )
    return false;
  const type = item.equipmentType || (item.equipment as any)?.type;
  return type
    ? canModify(role, type as string)
    : role === REGISSEUR_GENERAL_ROLE;
}

export const newLineId = (): string => new ObjectId().toString();
