const { ObjectId } = require('mongodb');

function createEquipmentFilter(query) {
  const { search = '', type = '', location = '', structure = '' } = query;
  const filter = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (type) filter.type = { $regex: type, $options: 'i' };
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (structure) filter.structure = new ObjectId(structure);
  return filter;
}

module.exports = createEquipmentFilter;
