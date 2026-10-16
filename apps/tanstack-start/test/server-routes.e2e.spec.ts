import { inject } from 'vitest';

import { api } from './app.js';

const origin = inject('origin');

/**
 * The Adapter in server routes (the REST API under /api): its middleware adds
 * the request's Ability, and each denial of `assertCan` answers a `Response`.
 * The Denial rule itself is the core's, tested there; here, one case per
 * answer.
 *
 * Seed: alice's #1 (published) and #2 (draft), bob's #3 (published) and #4
 * (draft), and alice's #5 (published, then archived). carol is a plain user,
 * alice and bob are authors, admin is the superuser.
 */
describe('tanstack-start server routes (e2e)', () => {
  const ids = (body: Array<{ id: string }>) => body.map(a => a.id).sort();

  it('lists the articles the Access conditions allow', async () => {
    const res = await api('alice').get('/api/articles');
    expect(res.status).toBe(200);
    expect(ids((await res.json()) as Array<{ id: string }>)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('answers an allowed check with the handler result', async () => {
    const res = await api('carol').get('/api/articles/3');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: '3', authorId: 'bob' });
  });

  it('answers an Unauthenticated request with 401', async () => {
    const res = await api().get('/api/articles/3');
    expect(res.status).toBe(401);
  });

  it('answers forbidden with 403', async () => {
    const res = await api('carol').patch('/api/articles/3', { title: 'nope' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      message: 'Insufficient permissions to update Article.',
    });
  });

  it('answers not found with 404, the same as a missing article', async () => {
    const hidden = await api('carol').get('/api/articles/2');
    const missing = await api('carol').get('/api/articles/999');
    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await hidden.text()).toEqual(await missing.text());
  });

  describe('cross-site requests', () => {
    const title = async () =>
      (
        (await (await api('alice').get('/api/articles/1')).json()) as {
          title: string;
        }
      ).title;

    it.each([
      ['a cross-site Sec-Fetch-Site', { 'sec-fetch-site': 'cross-site' }],
      ['a same-site Sec-Fetch-Site', { 'sec-fetch-site': 'same-site' }],
      ['a foreign Origin', { origin: 'https://evil.example' }],
    ])(
      'refuses a write with %s as forbidden, before the handler runs',
      async (_name, headers) => {
        const before = await title();
        const res = await api('alice').patch(
          '/api/articles/1',
          { title: 'pwned' },
          headers,
        );
        expect(res.status).toBe(403);
        expect(await title()).toBe(before);
      },
    );

    it('lets a same-origin write through', async () => {
      const before = await title();
      const res = await api('alice').patch(
        '/api/articles/1',
        { title: before },
        { 'sec-fetch-site': 'same-origin', origin },
      );
      expect(res.status).toBe(200);
    });

    it('lets a cross-site read through: CORS decides who may read it', async () => {
      const res = await api('carol').get('/api/articles/3', {
        'sec-fetch-site': 'cross-site',
        origin: 'https://evil.example',
      });
      expect(res.status).toBe(200);
    });
  });
});
