import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

/**
 * End-to-end coverage of the list endpoint: boots the real Nest app and drives
 * it over HTTP, so each user's list is filtered by their Access conditions.
 */
describe('backend-simple (e2e)', () => {
  let app: INestApplication;

  // Recreate the app per test so each one starts from the same in-memory seed.
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
});
