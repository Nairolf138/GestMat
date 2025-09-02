const { ObjectId } = require('mongodb');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createEquipmentFilter(query) {
  const {
    search = '',
    type = '',
    location = '',
    structure = '',
    excludeStructure = '',
  } = query;
  const filter = {};
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

module.exports = createEquipmentFilter;
