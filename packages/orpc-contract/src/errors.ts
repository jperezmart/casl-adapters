/**
 * Errors shared by every procedure, as `@jperezmart/orpc-casl` throws them.
 * `UNAUTHORIZED` when there is no user; `FORBIDDEN` and `NOT_FOUND` by the
 * Denial rule (ADR 0004: `FORBIDDEN` when the action is denied on the subject
 * type; else `NOT_FOUND` for an article the user cannot read and `FORBIDDEN`
 * for one they can); `NOT_FOUND` too when an article id doesn't exist.
 */
export const commonErrors = {
  UNAUTHORIZED: { status: 401, message: 'Authentication required.' },
  FORBIDDEN: {
    status: 403,
    message: 'You are not allowed to perform this action.',
  },
  NOT_FOUND: { status: 404, message: 'Article not found.' },
} as const;
