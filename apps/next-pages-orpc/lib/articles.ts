import type { MongoQuery } from '@casl/ability';
import type {
  Article,
  ArticleCreate,
  ArticleUpdate,
} from '@jperezmart/orpc-domain';
import { guard } from '@ucast/mongo2js';

interface Store {
  sequence: number;
  articles: Article[];
}

/** The seed: the same articles as every other example. */
function seed(): Store {
  return {
    sequence: 6,
    articles: [
      { kind: 'Article', id: '1', title: 'Alice — published', authorId: 'alice', published: true, archived: false }, // prettier-ignore
      { kind: 'Article', id: '2', title: 'Alice — draft', authorId: 'alice', published: false, archived: false }, // prettier-ignore
      { kind: 'Article', id: '3', title: 'Bob — published', authorId: 'bob', published: true, archived: false }, // prettier-ignore
      { kind: 'Article', id: '4', title: 'Bob — draft', authorId: 'bob', published: false, archived: false }, // prettier-ignore
      { kind: 'Article', id: '5', title: 'Alice — archived', authorId: 'alice', published: true, archived: true }, // prettier-ignore
    ],
  };
}

const STORE = '__nextPagesOrpcArticles';

/**
 * The in-memory store, kept on `globalThis` so it survives the dev server's
 * reloads and every route shares it. The e2e tests reset it to the seed
 * before each test (see `test/app.ts`). It plays "your store": a real one would
 * run the queries in the database.
 */
function store(): Store {
  const global = globalThis as { [STORE]?: Store | undefined };
  return (global[STORE] ??= seed());
}

/** The articles matching a Mongo query, e.g. the Access conditions. */
export function findArticles(query: MongoQuery<Article>): Article[] {
  return store().articles.filter(guard<Article>(query));
}

export function findArticle(id: string): Article | undefined {
  return store().articles.find(article => article.id === id);
}

export function createArticle(input: ArticleCreate, authorId: string): Article {
  const article: Article = {
    kind: 'Article',
    id: String(store().sequence++),
    title: input.title,
    authorId,
    published: input.published ?? false,
    archived: false,
  };
  store().articles.push(article);
  return article;
}

export function updateArticle(article: Article, patch: ArticleUpdate): Article {
  if (patch.title !== undefined) article.title = patch.title;
  if (patch.published !== undefined) article.published = patch.published;
  return article;
}

export function removeArticle(id: string): { deleted: boolean } {
  const { articles } = store();
  const index = articles.findIndex(article => article.id === id);
  if (index === -1) return { deleted: false };
  articles.splice(index, 1);
  return { deleted: true };
}
