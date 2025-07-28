import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import AddEquipment from '../src/AddEquipment.jsx';
import * as api from '../src/api.js';

vi.mock('../src/api.js');

describe('AddEquipment', () => {
  it('submits form data', async () => {
    api.api.mockResolvedValue({});
    const { container, getByText } = render(<AddEquipment />);
    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: 'Lamp' } });
    fireEvent.change(container.querySelector('input[name="totalQty"]'), { target: { value: '2' } });
    fireEvent.change(container.querySelector('input[name="availableQty"]'), { target: { value: '2' } });
    fireEvent.submit(getByText('Ajouter').closest('form'));
    await waitFor(() => expect(api.api).toHaveBeenCalled());
  });
});
