import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

/**
 * End-to-end coverage of the CASL ↔ oRPC bridge: boots the real Nest app
 * (oRPC routes + nest-casl) and drives it over HTTP, asserting the same
 * authorization outcomes as the curl smoke test.
 */
describe('backend-orpc (e2e)', () => {
  let app: INestApplication;

  // Recreate the app per test so each one starts from the same in-memory seed.
  // The mutating cases (create/update/delete) would otherwise leak state into
  // later tests and couple the suite to declaration order.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // oRPC owns body parsing (mirrors main.ts).
    app = moduleRef.createNestApplication({ bodyParser: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const as = (id: string) => ({ 'x-user-id': id });
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];
  const ids = (body: Array<{ id: string }>) => body.map(a => a.id).sort();

  it('401 when there is no authenticated user', () =>
    request(server()).get('/api/articles').expect(401));

  it('a plain user lists only published articles', async () => {
    const res = await request(server())
      .get('/api/articles')
      .set(as('carol'))
      .expect(200);
    expect(ids(res.body)).toEqual(['1', '3']);
  });

  it("an author also sees their own drafts (not other authors')", async () => {
    const res = await request(server())
      .get('/api/articles')
      .set(as('alice'))
      .expect(200);
    expect(ids(res.body)).toEqual(['1', '2', '3']); // alice's #2, not bob's #4
  });

  it('the superuser lists every article', async () => {
    const res = await request(server())
      .get('/api/articles')
      .set(as('admin'))
      .expect(200);
    expect(ids(res.body)).toEqual(['1', '2', '3', '4']);
  });

  it("a plain user cannot read someone else's draft, nor learn it exists", async () => {
    const genuine = await request(server())
      .get('/api/articles/999')
      .set(as('carol'))
      .expect(404);
    const hidden = await request(server())
      .get('/api/articles/2')
      .set(as('carol'))
      .expect(404);
    expect(hidden.body).toEqual(genuine.body);
  });

  it('me.abilities returns the packed rules', async () => {
    const res = await request(server())
      .get('/api/me/abilities')
      .set(as('carol'))
      .expect(200);
    expect(res.body.rules).toEqual([['read', 'Article', { published: true }]]);
  });

  it('a non-owner author cannot update', () =>
    request(server())
      .patch('/api/articles/3')
      .set(as('alice'))
      .send({ title: 'nope' })
      .expect(403));

  it('a non-owner author cannot delete', () =>
    request(server()).delete('/api/articles/3').set(as('alice')).expect(403));

  it('a plain user cannot create', () =>
    request(server())
      .post('/api/articles')
      .set(as('carol'))
      .send({ title: 'nope' })
      .expect(403));

  it('an author can update their own article', () =>
    request(server())
      .patch('/api/articles/1')
      .set(as('alice'))
      .send({ title: 'Alice edited' })
      .expect(200));

  it('an author can create', () =>
    request(server())
      .post('/api/articles')
      .set(as('alice'))
      .send({ title: 'Brand new', published: true })
      .expect(200));

  it('the superuser can delete anything', () =>
    request(server()).delete('/api/articles/3').set(as('admin')).expect(200));

  it('404 for a missing article (loaded from the validated input)', () =>
    request(server()).get('/api/articles/999').set(as('admin')).expect(404));
});
