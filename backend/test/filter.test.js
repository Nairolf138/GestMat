const test = require('node:test');
const assert = require('assert');
const createFilter = require('../src/utils/createEquipmentFilter');

test('createEquipmentFilter builds correct filter', () => {
  const q = { search: 'mic', type: 'audio', location: 'main' };
  const filter = createFilter(q);
  assert.deepStrictEqual(filter, {
    name: { $regex: 'mic', $options: 'i' },
    type: { $regex: 'audio', $options: 'i' },
    location: { $regex: 'main', $options: 'i' },
  });
});

