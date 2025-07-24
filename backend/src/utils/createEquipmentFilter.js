function createEquipmentFilter(query) {
  const { search = '', type = '', location = '' } = query;
  const filter = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (type) filter.type = { $regex: type, $options: 'i' };
  if (location) filter.location = { $regex: location, $options: 'i' };
  return filter;
}

module.exports = createEquipmentFilter;
