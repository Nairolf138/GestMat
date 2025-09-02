import { ObjectId } from 'mongodb';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface EquipmentFilterQuery {
  search?: string;
  type?: string;
  location?: string;
  structure?: string;
  excludeStructure?: string;
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
  } = query;
  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: escapeRegExp(search), $options: 'i' };
  if (type) filter.type = { $regex: escapeRegExp(type), $options: 'i' };
  if (location) filter.location = { $regex: escapeRegExp(location), $options: 'i' };
  if (structure && ObjectId.isValid(structure)) {
    filter.structure = new ObjectId(structure);
  } else if (excludeStructure && ObjectId.isValid(excludeStructure)) {
    filter.structure = { $ne: new ObjectId(excludeStructure) };
  }
  return filter;
}
