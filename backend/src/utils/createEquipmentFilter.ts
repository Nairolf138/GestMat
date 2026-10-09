import { ObjectId } from 'mongodb';
import { normalizeType } from './roleAccess';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface EquipmentFilterQuery {
  search?: string;
  type?: string;
  location?: string;
  structure?: string;
  excludeStructure?: string;
  excludeStatuses?: string | string[];
}

export default function createEquipmentFilter(
  query: EquipmentFilterQuery,
): Record<string, unknown> {
  const {
    search = '',
    type = '',
    location = '',
    structure = '',
    excludeStructure = '',
    excludeStatuses = [],
  } = query;
  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: escapeRegExp(search), $options: 'i' };
  if (type) {
    const aliases: Record<string, string> = {
      Vidéo: 'Vid[eé]o',
      Lumière: 'Lumi[eè]re',
      Autre: 'Autres?',
    };
    filter.type = {
      $regex: aliases[normalizeType(type) || ''] || escapeRegExp(type),
      $options: 'i',
    };
  }
  if (location)
    filter.location = { $regex: escapeRegExp(location), $options: 'i' };
  if (structure && ObjectId.isValid(structure)) {
    filter.structure = new ObjectId(structure);
  } else if (excludeStructure && ObjectId.isValid(excludeStructure)) {
    filter.structure = { $ne: new ObjectId(excludeStructure) };
  }
  const excludedStatuses = Array.isArray(excludeStatuses)
    ? excludeStatuses
    : excludeStatuses
      ? [excludeStatuses]
      : [];
  if (excludedStatuses.length) filter.status = { $nin: excludedStatuses };
  return filter;
}
