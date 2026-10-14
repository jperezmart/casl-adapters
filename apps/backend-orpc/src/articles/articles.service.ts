import type { MongoQuery } from '@casl/ability';
import type {
  Article,
  ArticleCreate,
  ArticleUpdate,
} from '@jperezmart/orpc-domain';
import { Injectable } from '@nestjs/common';
import { guard } from '@ucast/mongo2js';

/**
 * Articles data + business logic. In-memory (same seed and shape as the REST
 * examples) — no database; this example is purely Nest + oRPC + CASL + React.
 * It plays "your store": a real one would run the query in the database.
 */
@Injectable()
export class ArticlesService {
  private sequence = 6;
  private readonly articles: Article[] = [
    { kind: 'Article', id: '1', title: 'Alice — published', authorId: 'alice', published: true, archived: false }, // prettier-ignore
    { kind: 'Article', id: '2', title: 'Alice — draft', authorId: 'alice', published: false, archived: false }, // prettier-ignore
    { kind: 'Article', id: '3', title: 'Bob — published', authorId: 'bob', published: true, archived: false }, // prettier-ignore
    { kind: 'Article', id: '4', title: 'Bob — draft', authorId: 'bob', published: false, archived: false }, // prettier-ignore
    { kind: 'Article', id: '5', title: 'Alice — archived', authorId: 'alice', published: true, archived: true }, // prettier-ignore
  ];

  /** The articles matching a Mongo query, e.g. the Access conditions. */
  findMany(query: MongoQuery<Article>): Article[] {
    return this.articles.filter(guard<Article>(query));
  }

  findById(id: string): Article | undefined {
    return this.articles.find(article => article.id === id);
  }

  create(input: ArticleCreate, authorId: string): Article {
    const article: Article = {
      kind: 'Article',
      id: String(this.sequence++),
      title: input.title,
      authorId,
      published: input.published ?? false,
      archived: false,
    };
    this.articles.push(article);
    return article;
  }

  update(id: string, patch: ArticleUpdate): Article | undefined {
    const article = this.findById(id);
    if (!article) return undefined;
    if (patch.title !== undefined) article.title = patch.title;
    if (patch.published !== undefined) article.published = patch.published;
    return article;
  }

  remove(id: string): { deleted: boolean } {
    const index = this.articles.findIndex(article => article.id === id);
    if (index === -1) return { deleted: false };
    this.articles.splice(index, 1);
    return { deleted: true };
  }
}
