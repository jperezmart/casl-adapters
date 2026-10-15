import { api } from './app.js';

/**
 * oRPC mounted in a TanStack Start server route, authorized by
 * `@jperezmart/orpc-casl`: the Rules endpoint procedure and a protected
 * procedure, over HTTP against the app's production server.
 *
 * Seed: alice's #1 (published) and #2 (draft), bob's #3 (published) and #4
 * (draft), and alice's #5 (published, then archived). carol is a plain user.
 */
describe('tanstack-start-orpc (e2e)', () => {
  describe('the Rules endpoint procedure, GET /api/me/abilities', () => {
    it("returns the user's packed rules", async () => {
      const res = await api('carol').get('/me/abilities');
      expect(res.status).toBe(200);
      // The trailing 1 is packRules' flag for an inverted (`cannot`) rule.
      expect(await res.json()).toEqual({
        rules: [
          ['read', 'Article', { published: true }],
          ['read', 'Article', { archived: true }, 1],
        ],
      });
    });

    it('answers an Unauthenticated request with 401', async () => {
      const res = await api().get('/me/abilities');
      expect(res.status).toBe(401);
    });
  });

  describe('a protected procedure, /api/articles/{id}', () => {
    it('answers an allowed read with the article', async () => {
      const res = await api('carol').get('/articles/3');
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ id: '3', authorId: 'bob' });
    });

    it('answers an Unauthenticated request with 401', async () => {
      const res = await api().get('/articles/3');
      expect(res.status).toBe(401);
    });

    it('answers forbidden with 403', async () => {
      const res = await api('carol').patch('/articles/3', { title: 'nope' });
      expect(res.status).toBe(403);
    });

    it('answers a hidden article with 404, the same as a missing one', async () => {
      const hidden = await api('carol').get('/articles/2');
      const missing = await api('carol').get('/articles/999');
      expect(hidden.status).toBe(404);
      expect(await hidden.json()).toEqual(await missing.json());
    });
  });
});
