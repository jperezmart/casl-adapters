import { APP, useApp } from './app.js';

/** The demo users the frontend switches between (REST examples only). */
describe(`${APP.name} users (e2e)`, () => {
  const api = useApp();

  it('GET /users lists the demo users', async () => {
    const res = await api().get('/users').expect(200);
    const ids = (res.body as Array<{ id: string }>).map(u => u.id).sort();
    expect(ids).toEqual(['admin', 'alice', 'bob', 'carol']);
  });

  // The frontend picks its demo user with a cookie, the way a session cookie
  // reaches the Rules endpoint that `@jperezmart/casl-react` fetches.
  it('GET /me/abilities finds the demo user in the `demo-user` cookie', async () => {
    const res = await api()
      .get('/me/abilities')
      .set('cookie', 'theme=dark; demo-user=carol')
      .expect(200);
    expect(res.body.rules).toEqual([
      ['read', 'Article', { published: true }],
      ['read', 'Article', { archived: true }, 1],
    ]);
  });
});
