const test = require('node:test');
const assert = require('assert');
const { ObjectId } = require('mongodb');
const createFilter = require('../src/utils/createEquipmentFilter').default;

test('createEquipmentFilter builds correct filter', () => {
  const q = { search: 'mic', type: 'audio', location: 'main' };
  const filter = createFilter(q);
  assert.deepStrictEqual(filter, {
    name: { $regex: 'mic', $options: 'i' },
    type: { $regex: 'audio', $options: 'i' },
    location: { $regex: 'main', $options: 'i' },
  });
});

test('createEquipmentFilter escapes regex metacharacters', () => {
  const q = {
    search: 'mic.*',
    type: 'aud?o',
    location: 'main(+)',
    structure: '507f191e810c19729de860ea',
  };
  const filter = createFilter(q);
  assert.deepStrictEqual(filter, {
    name: { $regex: 'mic\\.\\*', $options: 'i' },
    type: { $regex: 'aud\\?o', $options: 'i' },
    location: { $regex: 'main\\(\\+\\)', $options: 'i' },
    structure: new ObjectId('507f191e810c19729de860ea'),
  });
});

test('createEquipmentFilter ignores invalid structure id', () => {
  const q = { structure: 'not-a-valid-id' };
  const filter = createFilter(q);
  assert.deepStrictEqual(filter, {});
});

test('createEquipmentFilter excludes provided structure', () => {
  const id = new ObjectId().toString();
  const filter = createFilter({ excludeStructure: id });
  assert.deepStrictEqual(filter, { structure: { $ne: new ObjectId(id) } });
});

test('createEquipmentFilter excludes provided statuses', () => {
  const filter = createFilter({ excludeStatuses: ['HS', 'En maintenance'] });
  assert.deepStrictEqual(filter, {
    status: { $nin: ['HS', 'En maintenance'] },
  });
});
