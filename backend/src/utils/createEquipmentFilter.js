const { ObjectId } = require('mongodb');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createEquipmentFilter(query) {
  const { search = '', type = '', location = '', structure = '' } = query;
  const filter = {};
  if (search) filter.name = { $regex: escapeRegExp(search), $options: 'i' };
  if (type) filter.type = { $regex: escapeRegExp(type), $options: 'i' };
  if (location) filter.location = { $regex: escapeRegExp(location), $options: 'i' };
  if (structure && ObjectId.isValid(structure)) filter.structure = new ObjectId(structure);
  return filter;
}

module.exports = createEquipmentFilter;
