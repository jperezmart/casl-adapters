import { describe, expect, it, vi } from 'vitest';

// The package root is imported by the client bundle (the error component, the
// app's `start.ts`), so it must never reach Start's server-only module: in
// `vite dev` that module pulls react-dom/server into the browser and the page
// never hydrates.
vi.mock('@tanstack/react-start/server', () => {
  throw new Error('@tanstack/react-start/server reached from the client');
});

describe('the package root', () => {
  it('loads without the server-only module', async () => {
    const root = await import('./index.js');

    expect(root.isDenialError(new root.DenialError('forbidden', 'no'))).toBe(
      true,
    );
  });
});
