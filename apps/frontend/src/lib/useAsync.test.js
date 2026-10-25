import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAsync } from './useAsync.js';

describe('useAsync', () => {
  it('resolves to ready with the data', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42), []));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data).toBe(42);
  });

  it('a loader that throws synchronously ends in error instead of crashing the page', async () => {
    const boom = new Error('schema');
    const { result } = renderHook(() =>
      useAsync(() => {
        throw boom;
      }, []),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(boom);
  });

  it('enabled: false never calls the loader', () => {
    let called = false;
    const { result } = renderHook(() =>
      useAsync(
        () => {
          called = true;
          return Promise.resolve();
        },
        [],
        { enabled: false },
      ),
    );
    expect(result.current.status).toBe('idle');
    expect(called).toBe(false);
  });
});
