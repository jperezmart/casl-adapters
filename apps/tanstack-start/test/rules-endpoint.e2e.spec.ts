import { api } from './app.js';

/** The Rules endpoint: the Adapter's ready-made server route handler. */
describe('tanstack-start Rules endpoint (e2e)', () => {
  it("GET /api/me/abilities returns the user's packed rules", async () => {
    const res = await api('carol').get('/api/me/abilities');
    expect(res.status).toBe(200);
    // The trailing 1 is packRules' flag for an inverted (`cannot`) rule.
    expect(await res.json()).toEqual({
      rules: [
        ['read', 'Article', { published: true }],
        ['read', 'Article', { archived: true }, 1],
      ],
    });
  });

  it('GET /api/me/abilities keeps every answer out of shared caches', async () => {
    const ok = await api('carol').get('/api/me/abilities');
    const unauthenticated = await api().get('/api/me/abilities');
    expect(ok.headers.get('cache-control')).toBe('private, no-store');
    expect(unauthenticated.headers.get('cache-control')).toBe(
      'private, no-store',
    );
  });

  it('GET /api/me/abilities answers an Unauthenticated request with 401', async () => {
    const res = await api().get('/api/me/abilities');
    expect(res.status).toBe(401);
  });
});
