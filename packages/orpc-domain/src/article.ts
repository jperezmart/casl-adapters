import { z } from 'zod';

/**
 * The `Article` subject. `kind` is the CASL subject discriminator (resolved via
 * `detectSubjectType`); `authorId` scopes ownership rules.
 */
export const articleSchema = z.object({
  kind: z.literal('Article'),
  id: z.string(),
  title: z.string(),
  authorId: z.string(),
  published: z.boolean(),
  /** Taken down by moderation: seeded only, not settable through the API. */
  archived: z.boolean(),
});

export type Article = z.infer<typeof articleSchema>;

/** Payload to create an article (the author is taken from the current user). */
export const articleCreateSchema = z.object({
  title: z.string(),
  published: z.boolean().optional(),
});

export type ArticleCreate = z.infer<typeof articleCreateSchema>;

/** The editable slice of an article. */
export const articleUpdateSchema = articleSchema
  .pick({ title: true, published: true })
  .partial();

export type ArticleUpdate = z.infer<typeof articleUpdateSchema>;
