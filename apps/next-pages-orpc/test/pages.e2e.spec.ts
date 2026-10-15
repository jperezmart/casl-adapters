import request from 'supertest';

import { APP, useNextServer } from './app.js';

/**
 * End-to-end coverage of the article page, whose `getServerSideProps`
 * authorizes with `@jperezmart/next-casl` beside the oRPC procedures. The
 * article seed is the articles suite's.
 */
describe(`${APP.name} pages (e2e)`, () => {
  const server = useNextServer();
  const page = (path: string, user?: string) => {
    const req = request(server()).get(path);
    return user ? req.set('x-user-id', user) : req;
  };

  it('renders an article the user can read', async () => {
    const res = await page('/articles/3', 'carol').expect(200);
    expect(res.text).toContain('Bob — published');
  });

  it("answers 404 for someone else's draft, the same as for a missing article", async () => {
    await page('/articles/999', 'carol').expect(404);
    const hidden = await page('/articles/2', 'carol').expect(404);
    expect(hidden.text).not.toContain('Alice — draft');
  });

  it("answers 401 without a session, with Next.js's error page", async () => {
    const res = await page('/articles/1').expect(401);
    expect(res.text).toContain('Unauthorized');
  });

  it('finds the user in the `demo-user` cookie the tester sets, as the procedures do', async () => {
    const res = await request(server())
      .get('/articles/2')
      .set('cookie', 'theme=dark; demo-user=alice')
      .expect(200);
    expect(res.text).toContain('Alice — draft');
    await request(server())
      .get('/api/me/abilities')
      .set('cookie', 'demo-user=alice')
      .expect(200);
  });
});
