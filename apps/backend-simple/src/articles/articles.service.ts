import type { MongoQuery } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { guard } from '@ucast/mongo2js';

import type { Article } from './article.entity.js';

interface CreateArticleDto {
  title: string;
  published?: boolean;
}

interface UpdateArticleDto {
  title?: string;
  published?: boolean;
}

/**
 * In-memory article store, seeded with a couple of articles per author. It
 * plays "your store": a real one would run the query in the database.
 */
@Injectable()
export class ArticlesService {
  private sequence = 5;
  private readonly articles: Article[] = [
    {
      kind: 'Article',
      id: '1',
      title: 'Alice — published',
      authorId: 'alice',
      published: true,
    },
    {
      kind: 'Article',
      id: '2',
      title: 'Alice — draft',
      authorId: 'alice',
      published: false,
    },
    {
      kind: 'Article',
      id: '3',
      title: 'Bob — published',
      authorId: 'bob',
      published: true,
    },
    {
      kind: 'Article',
      id: '4',
      title: 'Bob — draft',
      authorId: 'bob',
      published: false,
    },
  ];

  /** The articles matching a Mongo query, e.g. the Access conditions. */
  findMany(query: MongoQuery<Article>): Article[] {
    return this.articles.filter(guard<Article>(query));
  }

  findById(id: string): Article | undefined {
    return this.articles.find(article => article.id === id);
  }

  create(dto: CreateArticleDto, authorId: string): Article {
    const article: Article = {
      kind: 'Article',
      id: String(this.sequence++),
      title: dto.title,
      authorId,
      published: dto.published ?? false,
    };
    this.articles.push(article);
    return article;
  }

  update(id: string, dto: UpdateArticleDto): Article | undefined {
    const article = this.findById(id);
    if (!article) return undefined;
    if (dto.title !== undefined) article.title = dto.title;
    if (dto.published !== undefined) article.published = dto.published;
    return article;
  }

  remove(id: string): { deleted: boolean } {
    const index = this.articles.findIndex(article => article.id === id);
    if (index === -1) return { deleted: false };
    this.articles.splice(index, 1);
    return { deleted: true };
  }
}
