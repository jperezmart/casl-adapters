import { subject } from '@casl/ability';

import type { AdapterOptions, AppAbility, RolePermissions } from './index.js';
import { createAdapterKit, notFoundDenial } from './index.js';

interface User {
  id: string;
  roles: string[];
}

interface Request {
  user?: User;
}

// An author views every published article, but reads and updates only their
// own: whether a denied instance is hidden depends on which action counts as
// reading it.
const permissions: RolePermissions<'author', User> = {
  author: (user, { can }) => {
    can('view', 'Article', { published: true });
    can(['read', 'view', 'update'], 'Article', { authorId: user.id });
  },
};

const alice: User = { id: 'u1', roles: ['author'] };
const own = subject('Article', { authorId: 'u1', published: false });
const othersPublished = subject('Article', {
  authorId: 'u2',
  published: true,
});

function kitOf(
  options: Partial<AdapterOptions<Request, User, AppAbility, string>> = {},
) {
  return createAdapterKit<Request, User, AppAbility, string>({
    permissions: [permissions],
    getUser: request => request.user,
    ...options,
  });
}

async function abilityOf(user: User): Promise<AppAbility> {
  const context = await kitOf().contextOf({ user });
  return context!.ability;
}

describe('createAdapterKit', () => {
  describe('contextOf', () => {
    it("hands over the request's Authorizable user and their Ability", async () => {
      const context = await kitOf().contextOf({ user: alice });

      expect(context?.user).toBe(alice);
      expect(context?.ability.can('update', own)).toBe(true);
      expect(context?.ability.can('update', othersPublished)).toBe(false);
    });

    it('is null for an Unauthenticated request', async () => {
      await expect(kitOf().contextOf({})).resolves.toBeNull();
      await expect(
        kitOf({ getUser: () => null }).contextOf({}),
      ).resolves.toBeNull();
    });

    it('waits for an asynchronous getUser', async () => {
      const kit = kitOf({ getUser: async request => request.user });

      const context = await kit.contextOf({ user: alice });

      expect(context?.user).toBe(alice);
    });
  });

  describe('decide', () => {
    it('decides by the Denial rule', async () => {
      const ability = await abilityOf(alice);

      expect(kitOf().decide(ability, 'update', own)).toEqual({
        allowed: true,
      });
      expect(kitOf().decide(ability, 'delete', 'Article')).toMatchObject({
        kind: 'forbidden',
      });
      expect(kitOf().decide(ability, 'update', othersPublished)).toBe(
        notFoundDenial,
      );
    });

    it("hides an instance only when the Adapter's readAction is denied too", async () => {
      const ability = await abilityOf(alice);

      expect(
        kitOf({ readAction: 'view' }).decide(
          ability,
          'update',
          othersPublished,
        ),
      ).toMatchObject({ kind: 'forbidden' });
    });

    it("lets one check's readAction override the Adapter's", async () => {
      const ability = await abilityOf(alice);

      expect(
        kitOf({ readAction: 'view' }).decide(
          ability,
          'update',
          othersPublished,
          { readAction: 'read' },
        ),
      ).toBe(notFoundDenial);
    });
  });

  describe('hookFor', () => {
    it("is the app's hook for an Unauthenticated request or a forbidden check", () => {
      const kit = kitOf({
        onUnauthenticated: 'to login',
        onForbidden: 'to 403 page',
      });

      expect(
        kit.hookFor({ allowed: false, kind: 'unauthenticated', message: '' }),
      ).toBe('to login');
      expect(
        kit.hookFor({ allowed: false, kind: 'forbidden', message: '' }),
      ).toBe('to 403 page');
    });

    it('is never a hook for not found, so existence stays hidden', () => {
      const kit = kitOf({
        onUnauthenticated: 'to login',
        onForbidden: 'to 403 page',
      });

      expect(kit.hookFor(notFoundDenial)).toBeUndefined();
    });
  });
});
