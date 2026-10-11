/**
 * Errors shared by every procedure. `UNAUTHORIZED` when there is no user;
 * `FORBIDDEN` and `NOT_FOUND` by the CASL authorization (ADR 0004: `NOT_FOUND`
 * also hides an article the user cannot read); `NOT_FOUND` too when an article
 * id doesn't exist.
 */
export const commonErrors = {
  UNAUTHORIZED: { status: 401, message: 'Authentication required.' },
  FORBIDDEN: {
    status: 403,
    message: 'You are not allowed to perform this action.',
  },
  NOT_FOUND: { status: 404, message: 'Article not found.' },
} as const;
