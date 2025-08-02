import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import AddEquipment from '../src/AddEquipment.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('AddEquipment', () => {
  it('submits form data with availableQty derived from totalQty', async () => {
    api.api.mockResolvedValue({});
    const { container, getByText } = render(<AddEquipment />);
    fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: 'Lamp' } });
    fireEvent.change(container.querySelector('select[name="type"]'), { target: { value: 'Son' } });
    fireEvent.change(container.querySelector('select[name="condition"]'), { target: { value: 'Neuf' } });
    fireEvent.change(container.querySelector('input[name="totalQty"]'), { target: { value: '2' } });
    fireEvent.submit(getByText('Ajouter').closest('form'));
    await waitFor(() => expect(api.api).toHaveBeenCalled());
    const payload = JSON.parse(api.api.mock.calls[0][1].body);
    expect(payload.availableQty).toBe(2);
  });
});
