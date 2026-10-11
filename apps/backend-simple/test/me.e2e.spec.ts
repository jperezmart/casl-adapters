import { useApp } from './app.js';

/** End-to-end coverage of the demo helpers the frontend reads. */
describe('backend-simple demo helpers (e2e)', () => {
  const api = useApp();

  it('GET /me returns the user resolved from the headers', async () => {
    const res = await api('alice').get('/me').expect(200);
    expect(res.body).toEqual({
      id: 'alice',
      name: 'Alice (author)',
      roles: ['author'],
    });
  });

  it("GET /me/abilities returns the user's packed rules", async () => {
    const res = await api('carol').get('/me/abilities').expect(200);
    expect(res.body.rules).toEqual([['read', 'Article', { published: true }]]);
  });

  it('GET /users lists the demo users', async () => {
    const res = await api().get('/users').expect(200);
    const ids = (res.body as Array<{ id: string }>).map(u => u.id).sort();
    expect(ids).toEqual(['admin', 'alice', 'bob', 'carol']);
  });
});
