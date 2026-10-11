import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

/**
 * End-to-end coverage of the REST routes: boots the real Nest app (controllers,
 * `ArticleHook` and nest-casl) and drives it over HTTP. Lists are filtered by
 * each user's Access conditions; checks on one article follow the Denial rule.
 */
describe('backend-simple (e2e)', () => {
  let app: INestApplication;

  // Recreate the app per test so each one starts from the same in-memory seed.
  // The mutating cases (create/update/delete) would otherwise leak state into
  // later tests and couple the suite to declaration order.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const as = (id: string) => ({ 'x-user-id': id });
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];
  const ids = (body: Array<{ id: string }>) => body.map(a => a.id).sort();

  it('401 when there is no authenticated user', () =>
    request(server()).get('/articles').expect(401));

  it('a plain user lists only published articles', async () => {
    const res = await request(server())
      .get('/articles')
      .set(as('carol'))
      .expect(200);
    expect(ids(res.body)).toEqual(['1', '3']);
  });

  it("an author lists every published article and their own drafts (not other authors')", async () => {
    const res = await request(server())
      .get('/articles')
      .set(as('alice'))
      .expect(200);
    // Bob's published #3 included: the list joins both of alice's read rules.
    expect(ids(res.body)).toEqual(['1', '2', '3']);
  });

  it('the superuser lists every article', async () => {
    const res = await request(server())
      .get('/articles')
      .set(as('admin'))
      .expect(200);
    expect(ids(res.body)).toEqual(['1', '2', '3', '4']);
  });

  it('a plain user reads a published article', async () => {
    const res = await request(server())
      .get('/articles/3')
      .set(as('carol'))
      .expect(200);
    expect(res.body).toMatchObject({ id: '3', authorId: 'bob' });
  });

  it('an author reads their own draft', async () => {
    const res = await request(server())
      .get('/articles/2')
      .set(as('alice'))
      .expect(200);
    expect(res.body).toMatchObject({ id: '2', published: false });
  });

  it("a plain user cannot read someone else's draft, nor learn it exists", async () => {
    const genuine = await request(server())
      .get('/articles/999')
      .set(as('carol'))
      .expect(404);
    const hidden = await request(server())
      .get('/articles/2')
      .set(as('carol'))
      .expect(404);
    expect(hidden.body).toEqual(genuine.body);
  });

  it('404 for a missing article, even for the superuser', () =>
    request(server()).get('/articles/999').set(as('admin')).expect(404));

  it('a plain user cannot create', () =>
    request(server())
      .post('/articles')
      .set(as('carol'))
      .send({ title: 'nope' })
      .expect(403));

  it('an author creates an article as its author', async () => {
    const res = await request(server())
      .post('/articles')
      .set(as('alice'))
      .send({ title: 'Brand new', published: true })
      .expect(201);
    expect(res.body).toMatchObject({ title: 'Brand new', authorId: 'alice' });
  });

  it('an author can update their own article', async () => {
    const res = await request(server())
      .patch('/articles/1')
      .set(as('alice'))
      .send({ title: 'Alice edited' })
      .expect(200);
    expect(res.body).toMatchObject({ id: '1', title: 'Alice edited' });
  });

  it("403 when an author updates someone else's article they can read", () =>
    request(server())
      .patch('/articles/3')
      .set(as('alice'))
      .send({ title: 'nope' })
      .expect(403));

  it("404 when an author updates someone else's draft they cannot read", () =>
    request(server())
      .patch('/articles/4')
      .set(as('alice'))
      .send({ title: 'nope' })
      .expect(404));

  it("the superuser can update anyone's article", () =>
    request(server())
      .patch('/articles/4')
      .set(as('admin'))
      .send({ title: 'Admin edited' })
      .expect(200));

  it('an author can delete their own article', async () => {
    const res = await request(server())
      .delete('/articles/2')
      .set(as('alice'))
      .expect(200);
    expect(res.body).toEqual({ deleted: true });
  });

  it("403 when an author deletes someone else's article they can read", () =>
    request(server()).delete('/articles/3').set(as('alice')).expect(403));

  it("404 when an author deletes someone else's draft they cannot read", () =>
    request(server()).delete('/articles/4').set(as('alice')).expect(404));

  it('the superuser can delete anything', async () => {
    await request(server()).delete('/articles/3').set(as('admin')).expect(200);
    await request(server()).get('/articles/3').set(as('admin')).expect(404);
  });

  it('/me returns the user resolved from the headers', async () => {
    const res = await request(server()).get('/me').set(as('alice')).expect(200);
    expect(res.body).toEqual({
      id: 'alice',
      name: 'Alice (author)',
      roles: ['author'],
    });
  });

  it('/me/abilities returns the packed rules', async () => {
    const res = await request(server())
      .get('/me/abilities')
      .set(as('carol'))
      .expect(200);
    expect(res.body.rules).toEqual([['read', 'Article', { published: true }]]);
  });

  it('/users lists the demo users', async () => {
    const res = await request(server()).get('/users').expect(200);
    expect(ids(res.body)).toEqual(['admin', 'alice', 'bob', 'carol']);
  });
});
