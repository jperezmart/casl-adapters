import type { IncomingMessage } from 'node:http';

import { createNextCasl } from '@jperezmart/next-casl';
import type { AppAbility } from '@jperezmart/orpc-abilities';
import { detectSubjectType } from '@jperezmart/orpc-abilities';
import { articlesPermissions } from '@jperezmart/orpc-abilities/server';
import { createOrpcCasl } from '@jperezmart/orpc-casl';
import type { AppUser } from '@jperezmart/orpc-domain';

import { findUser } from './session';

/** What the oRPC API route hands every procedure: the Node request. */
export interface AppContext {
  req: IncomingMessage;
}

/** The Role permissions and options both Adapters share. */
const abilityOptions = {
  permissions: [articlesPermissions],
  superuserRole: 'admin',
  detectSubjectType,
};

/**
 * The oRPC Adapter, for the procedures the API route serves: its middleware
 * finds the user in the request the context holds and adds their Ability.
 */
export const orpcCasl = createOrpcCasl<AppContext, AppUser, AppAbility>({
  getUser: ({ req }) => findUser(req),
  ...abilityOptions,
});

/**
 * The Next.js Adapter, for the pages' `getServerSideProps`. It finds the user
 * with the same function, so a page and a procedure always agree on who calls.
 */
export const nextCasl = createNextCasl<AppUser, AppAbility>({
  getUser: findUser,
  ...abilityOptions,
});
