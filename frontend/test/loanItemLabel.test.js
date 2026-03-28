import { describe, it, expect } from 'vitest';
import { formatLoanItemLabel } from '../src/utils.js';

describe('formatLoanItemLabel', () => {
  it('formats vehicle loan items with registration number and fixed quantity', () => {
    expect(
      formatLoanItemLabel({
        kind: 'vehicle',
        vehicle: {
          name: 'Camion atelier',
          registrationNumber: 'AB-123-CD',
        },
      }),
    ).toBe('Camion atelier (AB-123-CD) x1');
  });

  it('formats vehicle loan items without registration number', () => {
    expect(
      formatLoanItemLabel({
        kind: 'vehicle',
        vehicle: {
          name: 'Renault Kangoo',
        },
      }),
    ).toBe('Renault Kangoo x1');
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
