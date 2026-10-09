import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearToasts } from '../src/toast';
afterEach(() => {
  cleanup();
  clearToasts();
});
