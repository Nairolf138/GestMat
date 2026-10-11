import { describe, it, expect } from 'vitest';
import { formatLoanItemLabel, getLoanEquipmentTypeKey } from '../src/utils.js';

describe('formatLoanItemLabel', () => {
  it('formats vehicle loan items with registration number and no quantity', () => {
    expect(
      formatLoanItemLabel({
        kind: 'vehicle',
        vehicle: {
          name: 'Camion atelier',
          registrationNumber: 'AB-123-CD',
        },
      }),
    ).toBe('Camion atelier (AB-123-CD)');
  });

  it('formats vehicle loan items without registration number', () => {
    expect(
      formatLoanItemLabel({
        kind: 'vehicle',
        vehicle: {
          name: 'Renault Kangoo',
        },
      }),
    ).toBe('Renault Kangoo');
  });

  it('keeps a deleted vehicle identifiable from its booking snapshot', () => {
    expect(
      formatLoanItemLabel({
        kind: 'vehicle',
        resourceIdentity: {
          name: 'Camion atelier',
          registrationNumber: 'AB-123-CD',
        },
      }),
    ).toBe('Camion atelier (AB-123-CD)');
  });

  it('keeps equipment formatting unchanged', () => {
    expect(
      formatLoanItemLabel({
        kind: 'equipment',
        equipment: { name: 'Micro HF' },
        quantity: 3,
      }),
    ).toBe('Micro HF x3');
  });
});

describe('getLoanEquipmentTypeKey', () => {
  it.each([
    ['Son', 'sound'],
    ['Lumière', 'light'],
    ['Plateau', 'stage'],
    ['Vidéo', 'video'],
    ['Autre', 'other'],
    ['Autres', 'other'],
  ])('maps %s to its localized equipment category', (type, key) => {
    expect(getLoanEquipmentTypeKey({ equipmentType: type })).toBe(key);
  });

  it('uses the equipment or saved identity type when needed', () => {
    expect(getLoanEquipmentTypeKey({ equipment: { type: 'Son' } })).toBe(
      'sound',
    );
    expect(
      getLoanEquipmentTypeKey({ resourceIdentity: { type: 'Vidéo' } }),
    ).toBe('video');
    expect(getLoanEquipmentTypeKey({ equipment: { name: 'Sans type' } })).toBe(
      null,
    );
  });
});
