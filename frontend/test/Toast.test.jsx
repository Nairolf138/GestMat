import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import Alert from '../src/Alert.jsx';
import { showToast } from '../src/toast.js';

afterEach(() => vi.useRealTimers());

describe('viewport notifications', () => {
  it('shows local alerts above the page content and hides them after a few seconds', () => {
    vi.useFakeTimers();
    render(
      <div style={{ height: '3000px' }}>
        <Alert message="Erreur de panier" />
      </div>,
    );

    const toast = screen.getByRole('alert');
    expect(toast.parentElement).toBe(
      document.querySelector('.gestmat-toast-layer'),
    );
    expect(toast.parentElement.parentElement).toBe(document.body);
    expect(toast.textContent).toContain('Erreur de panier');

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('coalesces repeated API and page errors, and stacks different messages', () => {
    vi.useFakeTimers();
    showToast('Erreur réseau');
    showToast('Erreur réseau');
    showToast('Période invalide');
    expect(screen.getAllByRole('alert')).toHaveLength(2);

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('allows a repeated message after automatic dismissal', () => {
    vi.useFakeTimers();
    showToast('Quantité invalide');
    act(() => vi.advanceTimersByTime(4000));
    showToast('Quantité invalide');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
