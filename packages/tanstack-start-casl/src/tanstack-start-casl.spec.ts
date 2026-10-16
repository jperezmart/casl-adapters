import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DenialError } from './denial-error.js';
import { createStartCasl } from './tanstack-start-casl.js';

const server = vi.hoisted(() => ({
  request: new Request('https://app.example/_serverFn/x'),
  status: undefined as number | undefined,
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => server.request,
  setResponseStatus: (status: number) => {
    server.status = status;
  },
}));

interface User {
  id: string;
  roles: string[];
}

const getUser = vi.fn((request: Request): User | null =>
  request.headers.get('cookie') === 'session=alice'
    ? { id: 'alice', roles: ['author'] }
    : null,
);

const casl = createStartCasl<User>({
  getUser,
  permissions: [{ author: (_user, { can }) => can('delete', 'Article') }],
});

/** Calls a server function protected by the Adapter, with `headers`. */
function callServerFn(headers: Record<string, string>) {
  server.request = new Request('https://app.example/_serverFn/x', {
    method: 'POST',
    headers: { cookie: 'session=alice', ...headers },
  });
  const handler = vi.fn(() => Promise.resolve({ result: 'deleted' }));
  const run = casl.functionMiddlewareServer({ next: handler } as never);
  return { run, handler };
}

describe('functionMiddlewareServer', () => {
  beforeEach(() => {
    server.status = undefined;
    getUser.mockClear();
  });

  it('runs a same-origin call as the session user', async () => {
    const { run, handler } = callServerFn({ 'sec-fetch-site': 'same-origin' });

    await expect(run).resolves.toEqual({ result: 'deleted' });
    expect(handler).toHaveBeenCalled();
  });

  it.each([
    ['a cross-site Sec-Fetch-Site', { 'sec-fetch-site': 'cross-site' }],
    ['a same-site Sec-Fetch-Site', { 'sec-fetch-site': 'same-site' }],
    ['a foreign Origin', { origin: 'https://evil.example' }],
  ])(
    'refuses a call with %s as forbidden, before finding the user',
    async (_name, headers) => {
      const { run, handler } = callServerFn(headers);

      const error: unknown = await Promise.resolve(run).catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(DenialError);
      expect(error).toMatchObject({ kind: 'forbidden', status: 403 });
      expect(server.status).toBe(403);
      expect(getUser).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it('runs a call from its own Origin, or with neither header (not a browser)', async () => {
    await expect(
      callServerFn({ origin: 'https://app.example' }).run,
    ).resolves.toEqual({ result: 'deleted' });
    await expect(callServerFn({}).run).resolves.toEqual({ result: 'deleted' });
  });
});
