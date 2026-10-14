import { APP, useApp } from './app.js';

/** End-to-end coverage of the current user's helpers the frontend reads. */
describe(`${APP.name} me (e2e)`, () => {
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
    // The trailing 1 is packRules' flag for an inverted (`cannot`) rule.
    expect(res.body.rules).toEqual([
      ['read', 'Article', { published: true }],
      ['read', 'Article', { archived: true }, 1],
    ]);
  });
});
