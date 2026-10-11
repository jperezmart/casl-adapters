import { useApp } from './app.js';

/**
 * End-to-end coverage of the article routes: boots the real Nest app
 * (controllers, `ArticleHook` and nest-casl) and drives it over HTTP. Lists are
 * filtered by each user's Access conditions; checks on one article follow the
 * Denial rule.
 *
 * Seed: alice's #1 (published) and #2 (draft), bob's #3 (published) and #4
 * (draft). carol is a plain user, alice and bob are authors, admin is the
 * superuser.
 */
describe('backend-shared articles (e2e)', () => {
  const api = useApp();
  const ids = (body: Array<{ id: string }>) => body.map(a => a.id).sort();

  describe('GET /articles', () => {
    it('anyone without a user gets 401', () =>
      api().get('/articles').expect(401));

    it('a plain user lists only published articles', async () => {
      const res = await api('carol').get('/articles').expect(200);
      expect(ids(res.body)).toEqual(['1', '3']);
    });

    it("an author lists every published article and their own drafts (not other authors')", async () => {
      const res = await api('alice').get('/articles').expect(200);
      // Bob's published #3 included: the list joins both of alice's read rules.
      expect(ids(res.body)).toEqual(['1', '2', '3']);
    });

    it('the superuser lists every article', async () => {
      const res = await api('admin').get('/articles').expect(200);
      expect(ids(res.body)).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('GET /articles/:id', () => {
    it('a plain user reads a published article', async () => {
      const res = await api('carol').get('/articles/3').expect(200);
      expect(res.body).toMatchObject({ id: '3', authorId: 'bob' });
    });

    it('an author reads their own draft', async () => {
      const res = await api('alice').get('/articles/2').expect(200);
      expect(res.body).toMatchObject({ id: '2', published: false });
    });

    it("a plain user gets 404 for someone else's draft, the same as for a missing article", async () => {
      const genuine = await api('carol').get('/articles/999').expect(404);
      const hidden = await api('carol').get('/articles/2').expect(404);
      expect(hidden.body).toEqual(genuine.body);
    });

    it('the superuser gets 404 for a missing article', () =>
      api('admin').get('/articles/999').expect(404));
  });

  describe('POST /articles', () => {
    it('a plain user gets 403', () =>
      api('carol').post('/articles').send({ title: 'nope' }).expect(403));

    it('an author creates an article as its author', async () => {
      const res = await api('alice')
        .post('/articles')
        .send({ title: 'Brand new', published: true })
        .expect(201);
      expect(res.body).toMatchObject({ title: 'Brand new', authorId: 'alice' });
    });
  });

  describe('PATCH /articles/:id', () => {
    it('an author updates their own article', async () => {
      const res = await api('alice')
        .patch('/articles/1')
        .send({ title: 'Alice edited' })
        .expect(200);
      expect(res.body).toMatchObject({ id: '1', title: 'Alice edited' });
    });

    it('a plain user gets 403 for an article they can read', () =>
      api('carol').patch('/articles/3').send({ title: 'nope' }).expect(403));

    it("an author gets 403 for someone else's article they can read", () =>
      api('alice').patch('/articles/3').send({ title: 'nope' }).expect(403));

    it("an author gets 404 for someone else's draft they cannot read", () =>
      api('alice').patch('/articles/4').send({ title: 'nope' }).expect(404));

    it("the superuser updates anyone's article", async () => {
      const res = await api('admin')
        .patch('/articles/4')
        .send({ title: 'Admin edited' })
        .expect(200);
      expect(res.body).toMatchObject({ id: '4', title: 'Admin edited' });
    });

    it('the superuser gets 404 for a missing article', () =>
      api('admin').patch('/articles/999').send({ title: 'nope' }).expect(404));
  });

  describe('DELETE /articles/:id', () => {
    it('an author deletes their own article', async () => {
      const res = await api('alice').delete('/articles/2').expect(200);
      expect(res.body).toEqual({ deleted: true });
    });

    it("a plain user gets 404 for someone else's draft they cannot read", () =>
      api('carol').delete('/articles/2').expect(404));

    it("an author gets 403 for someone else's article they can read", () =>
      api('alice').delete('/articles/3').expect(403));

    it("an author gets 404 for someone else's draft they cannot read", () =>
      api('alice').delete('/articles/4').expect(404));

    it("the superuser deletes anyone's article", async () => {
      await api('admin').delete('/articles/3').expect(200);
      await api('admin').get('/articles/3').expect(404);
    });

    it('the superuser gets 404 for a missing article', () =>
      api('admin').delete('/articles/999').expect(404));
  });
});
