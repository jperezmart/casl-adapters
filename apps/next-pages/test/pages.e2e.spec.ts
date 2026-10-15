import request from 'supertest';

import { APP, useNextServer } from './app.js';

/**
 * End-to-end coverage of the pages whose `getServerSideProps` authorizes with
 * `@jperezmart/next-casl`: the status of each answer, and the error page the
 * custom App renders for a denial. The article seed is the articles suite's.
 */
describe(`${APP.name} pages (e2e)`, () => {
  const server = useNextServer();
  const page = (path: string, user?: string) => {
    const req = request(server()).get(path);
    return user ? req.set('x-user-id', user) : req;
  };

  describe('GET /articles/:id', () => {
    it('renders an article the user can read', async () => {
      const res = await page('/articles/3', 'carol').expect(200);
      expect(res.text).toContain('Bob — published');
    });

    it("answers 404 for someone else's draft, the same as for a missing article", async () => {
      const genuine = await page('/articles/999', 'carol').expect(404);
      const hidden = await page('/articles/2', 'carol').expect(404);
      expect(hidden.text).not.toContain('Alice — draft');
      expect(genuine.text).toContain('This page could not be found');
      expect(hidden.text).toContain('This page could not be found');
    });

    it("answers 401 without a session, with Next.js's error page", async () => {
      const res = await page('/articles/1').expect(401);
      expect(res.text).toContain('Unauthorized');
      expect(res.text).not.toContain('Alice — published');
    });
  });

  describe('GET /articles/:id/edit', () => {
    it('renders the form for an article the user may update', async () => {
      const res = await page('/articles/1/edit', 'alice').expect(200);
      expect(res.text).toContain('Edit #1');
    });

    it("answers 403 for someone else's article the user can read, with Next.js's error page", async () => {
      const res = await page('/articles/3/edit', 'alice').expect(403);
      expect(res.text).toContain('Forbidden');
      expect(res.text).not.toContain('Edit #3');
    });

    it('answers 403 to a plain user, who may update no article', () =>
      page('/articles/1/edit', 'carol').expect(403));

    it("answers 404 for someone else's draft the user cannot read", () =>
      page('/articles/4/edit', 'alice').expect(404));
  });
});
