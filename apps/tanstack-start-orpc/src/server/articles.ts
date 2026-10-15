import type { MongoQuery } from '@casl/ability';
import type {
  Article,
  ArticleCreate,
  ArticleUpdate,
} from '@jperezmart/orpc-domain';
import { guard } from '@ucast/mongo2js';

/**
 * In-memory article store, seeded with a couple of articles per author and one
 * archived article, the same seed as the NestJS examples. It plays "your
 * store": a real one would run the query in the database.
 */
const articles: Article[] = [
  {
    kind: 'Article',
    id: '1',
    title: 'Alice — published',
    authorId: 'alice',
    published: true,
    archived: false,
  },
  {
    kind: 'Article',
    id: '2',
    title: 'Alice — draft',
    authorId: 'alice',
    published: false,
    archived: false,
  },
  {
    kind: 'Article',
    id: '3',
    title: 'Bob — published',
    authorId: 'bob',
    published: true,
    archived: false,
  },
  {
    kind: 'Article',
    id: '4',
    title: 'Bob — draft',
    authorId: 'bob',
    published: false,
    archived: false,
  },
  {
    kind: 'Article',
    id: '5',
    title: 'Alice — archived',
    authorId: 'alice',
    published: true,
    archived: true,
  },
];

/** The articles matching a Mongo query, e.g. the Access conditions. */
export function findArticles(query: MongoQuery<Article>): Article[] {
  return articles.filter(guard<Article>(query));
}

export function findArticle(id: string): Article | undefined {
  return articles.find(article => article.id === id);
}

export function updateArticle(
  article: Article,
  changes: ArticleUpdate,
): Article {
  if (changes.title !== undefined) article.title = changes.title;
  if (changes.published !== undefined) article.published = changes.published;
  return article;
}

let sequence = 6;

export function createArticle(input: ArticleCreate, authorId: string): Article {
  const article: Article = {
    kind: 'Article',
    id: String(sequence++),
    title: input.title,
    authorId,
    published: input.published ?? false,
    archived: false,
  };
  articles.push(article);
  return article;
}

export function removeArticle(id: string): { deleted: boolean } {
  const index = articles.findIndex(article => article.id === id);
  if (index === -1) return { deleted: false };
  articles.splice(index, 1);
  return { deleted: true };
}
