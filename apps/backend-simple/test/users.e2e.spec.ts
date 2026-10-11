import { APP, useApp } from './app.js';

/** The demo users the frontend switches between (REST examples only). */
describe(`${APP.name} users (e2e)`, () => {
  const api = useApp();

  it('GET /users lists the demo users', async () => {
    const res = await api().get('/users').expect(200);
    const ids = (res.body as Array<{ id: string }>).map(u => u.id).sort();
    expect(ids).toEqual(['admin', 'alice', 'bob', 'carol']);
  });
});
