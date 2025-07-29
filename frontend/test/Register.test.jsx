import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../src/Register.jsx';
import * as api from '../src/api.js';

vi.mock('../src/api.js');

describe('Register', () => {
  it('marks username invalid on server error', async () => {
    api.api.mockRejectedValue(new Error('Username already exists'));
    const { container, getByText } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    fireEvent.change(container.querySelector('input[name="username"]'), { target: { value: 'bob' } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: 'pw' } });
    fireEvent.change(container.querySelector('select[name="role"]'), { target: { value: 'Administrateur' } });
    fireEvent.submit(getByText("S'inscrire").closest('form'));
    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(container.querySelector('input[name="username"]').className).toMatch('is-invalid');
  });
});
