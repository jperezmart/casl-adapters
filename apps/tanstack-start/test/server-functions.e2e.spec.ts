import { api, serverFnBody } from './app.js';

/**
 * The Adapter in server functions, called over HTTP the way Start's client
 * calls them: not found throws the router's not-found, exactly as a missing
 * record does; unauthenticated and forbidden set the status to 401 or 403 and
 * throw the package's DenialError, carried to the browser by its
 * serialization adapter.
 *
 * Seed: as in server-routes.e2e.spec.ts.
 */
describe('tanstack-start server functions (e2e)', () => {
  /** The denial a failed call carries, as `denialErrorAdapter` encoded it. */
  const denialIn = async (res: Response) => {
    const body = await res.text();
    expect(body).toContain('@jperezmart/tanstack-start-casl/DenialError');
    return body;
  };

  it('returns the handler result when allowed', async () => {
    const res = await api('carol').serverFn('getArticle', { id: '3' });
    expect(res.status).toBe(200);
    expect((await serverFnBody(res)).result).toMatchObject({
      id: '3',
      authorId: 'bob',
    });
  });

  it('lists the articles the Access conditions allow', async () => {
    const res = await api('carol').serverFn('listArticles', undefined);
    expect(res.status).toBe(200);
    const { result: articles } = (await serverFnBody(res)) as {
      result: Array<{ id: string }>;
    };
    expect(articles.map(a => a.id).sort()).toEqual(['1', '3']);
  });

  it('answers an Unauthenticated request with 401 and a DenialError', async () => {
    const res = await api().serverFn('getArticle', { id: '3' });
    expect(res.status).toBe(401);
    expect(await denialIn(res)).toContain('unauthenticated');
  });

  it('answers forbidden with 403 and a DenialError', async () => {
    const res = await api('carol').serverFn(
      'renameArticle',
      { id: '3', title: 'nope' },
      'POST',
    );
    expect(res.status).toBe(403);
    expect(await denialIn(res)).toContain(
      'Insufficient permissions to update Article.',
    );
  });

  it("answers not found with the router's not-found, the same as a missing article", async () => {
    const hidden = await api('carol').serverFn('getArticle', { id: '2' });
    const missing = await api('carol').serverFn('getArticle', { id: '999' });
    // Start answers a thrown not-found with its own status (200 over RPC; the
    // page loader cases below show the 404) and the client rethrows it.
    expect(hidden.status).toBe(missing.status);
    const body = await serverFnBody(hidden);
    expect(body.error).toEqual({ isNotFound: true });
    expect(body).toEqual(await serverFnBody(missing));
  });

  describe('in a page loader', () => {
    it('renders the article when allowed', async () => {
      const res = await api('carol').get('/articles/3');
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('Bob — published');
    });

    it('renders the not-found component with 404', async () => {
      const res = await api('carol').get('/articles/2');
      expect(res.status).toBe(404);
      expect(await res.text()).toContain('Article not found');
    });

    it('renders the error component, which recognises the DenialError, with 401', async () => {
      const res = await api().get('/articles/3');
      expect(res.status).toBe(401);
      expect(await res.text()).toContain('Sign in to see this page');
    });
  });

  describe('with the override hooks', () => {
    it('onUnauthenticated redirects to the home page to sign in', async () => {
      const res = await api().get('/articles/1/edit');
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('/');
    });

    it('onForbidden redirects to the forbidden page', async () => {
      const res = await api('alice').get('/articles/3/edit');
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('/forbidden');
    });

    it('lets an allowed user through', async () => {
      const res = await api('alice').get('/articles/1/edit');
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('Alice — published');
    });
  });
});
