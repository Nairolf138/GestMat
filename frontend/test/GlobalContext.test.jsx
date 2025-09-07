import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlobalProvider } from '../src/GlobalContext.jsx';

describe('GlobalContext', () => {
  it('shows a toast on unexpected API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    render(
      <GlobalProvider>
        <div />
      </GlobalProvider>,
    );
    expect(await screen.findByText('boom')).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
