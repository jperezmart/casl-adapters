import type { MongoQuery } from '@casl/ability';
import type {
  Article,
  ArticleCreate,
  ArticleUpdate,
} from '@jperezmart/orpc-domain';
import { guard } from '@ucast/mongo2js';

/**
 * An in-memory article store, seeded with the same articles as every other
 * example. It plays "your store": a real one would run the queries in the
 * database.
 */
export interface ArticleStore {
  /** The articles matching a Mongo query, e.g. the Access conditions. */
  findMany(query: MongoQuery<Article>): Article[];
  findById(id: string): Article | undefined;
  create(input: ArticleCreate, authorId: string): Article;
  update(article: Article, patch: ArticleUpdate): Article;
  remove(id: string): { deleted: boolean };
}

/** A new store holding the seed. */
export function createArticleStore(): ArticleStore {
  let sequence = 6;
  const articles: Article[] = [
    { kind: 'Article', id: '1', title: 'Alice — published', authorId: 'alice', published: true, archived: false }, // prettier-ignore
    { kind: 'Article', id: '2', title: 'Alice — draft', authorId: 'alice', published: false, archived: false }, // prettier-ignore
    { kind: 'Article', id: '3', title: 'Bob — published', authorId: 'bob', published: true, archived: false }, // prettier-ignore
    { kind: 'Article', id: '4', title: 'Bob — draft', authorId: 'bob', published: false, archived: false }, // prettier-ignore
    { kind: 'Article', id: '5', title: 'Alice — archived', authorId: 'alice', published: true, archived: true }, // prettier-ignore
  ];

  return {
    findMany: query => articles.filter(guard<Article>(query)),

    findById: id => articles.find(article => article.id === id),

    create(input, authorId) {
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
    },

    update(article, patch) {
      if (patch.title !== undefined) article.title = patch.title;
      if (patch.published !== undefined) article.published = patch.published;
      return article;
    },

    remove(id) {
      const index = articles.findIndex(article => article.id === id);
      if (index === -1) return { deleted: false };
      articles.splice(index, 1);
      return { deleted: true };
    },
  };
}
