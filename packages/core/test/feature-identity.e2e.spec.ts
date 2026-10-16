import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { RolePermissions } from '../src/index.js';
import { AbilityFactory, CaslModule } from '../src/index.js';

interface User {
  id: string;
  roles: string[];
}

// Two features of one app: the second narrows what the first grants.
const articlesPermissions: RolePermissions<never, User> = {
  everyone(user, { can }) {
    can('update', 'Article', { authorId: user.id });
  },
};

const moderationPermissions: RolePermissions<'suspended', User> = {
  suspended(_user, { cannot }) {
    cannot('manage', 'all');
  },
};

@Module({
  imports: [CaslModule.forFeature({ permissions: articlesPermissions })],
})
class ArticlesModule {}

@Module({
  imports: [CaslModule.forFeature({ permissions: moderationPermissions })],
})
class ModerationModule {}

// NestJS 10 keys modules by a deep hash of their metadata, and NestJS 11 does
// when asked: every forFeature must stay its own module under both.
describe.each(['deep-hash', 'reference'] as const)(
  'CaslModule.forFeature with %s module ids',
  moduleIdGeneratorAlgorithm => {
    it('registers the permissions of every feature', async () => {
      const moduleRef = await Test.createTestingModule(
        {
          imports: [CaslModule.forRoot(), ArticlesModule, ModerationModule],
        },
        { moduleIdGeneratorAlgorithm },
      ).compile();
      await moduleRef.init();

      const ability = moduleRef
        .get(AbilityFactory)
        .createForUser({ id: 'u1', roles: ['suspended'] });

      expect(ability.can('update', 'Article')).toBe(false);
      await moduleRef.close();
    });
  },
);
