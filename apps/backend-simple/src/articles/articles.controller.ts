import type { MongoQuery } from '@casl/ability';
import type { ConditionsProxy } from '@jperezmart/nest-casl';
import { CaslConditions, CaslSubject, CaslUser } from '@jperezmart/nest-casl';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import type { AppUser } from '../auth/user.js';
import { UseAbility } from '../casl.js';
import type { Article } from './article.entity.js';
import { ArticleHook } from './article.hook.js';
import { ArticlesService } from './articles.service.js';

interface ArticleBody {
  title: string;
  published?: boolean;
}

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  /**
   * List — no record to check, so the guard checks the subject type and
   * `@CaslConditions()` hands over the Access conditions to filter the store by.
   */
  @Get()
  @UseAbility('read', 'Article')
  list(
    // The type asserts the conditions' shape; the decorator does not check it.
    @CaslConditions() conditions: ConditionsProxy<MongoQuery<Article>>,
  ): Article[] {
    // On a store that does not speak Mongo, translate `conditions.toAst()`
    // instead. See "Filtering lists" in the core README.
    return this.articles.findMany(conditions.toMongo());
  }

  /** Read one — the hook loads the article so conditional read is enforced. */
  @Get(':id')
  @UseAbility('read', 'Article', ArticleHook)
  findOne(@CaslSubject() article: Article | undefined): Article {
    if (!article) throw new NotFoundException();
    return article;
  }

  /** Create — authors only (unconditional `create` rule); users get 403. */
  @Post()
  @UseAbility('create', 'Article')
  create(@Body() body: ArticleBody, @CaslUser() user: AppUser): Article {
    return this.articles.create(body, user.id);
  }

  /** Update — hook + conditional rule means authors can only edit their own. */
  @Patch(':id')
  @UseAbility('update', 'Article', ArticleHook)
  update(
    @CaslSubject() article: Article | undefined,
    @Body() body: Partial<ArticleBody>,
  ): Article {
    if (!article) throw new NotFoundException();
    return this.articles.update(article.id, body) ?? article;
  }

  /** Delete — same conditional ownership rule as update. */
  @Delete(':id')
  @UseAbility('delete', 'Article', ArticleHook)
  remove(
    @CaslSubject() article: Article | undefined,
    @Param('id') id: string,
  ): { deleted: boolean } {
    if (!article) throw new NotFoundException();
    return this.articles.remove(id);
  }
}
