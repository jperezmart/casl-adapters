import type { DenialKind } from '@jperezmart/casl-core';
import type { SerializationAdapter } from '@tanstack/react-router';
import { createSerializationAdapter } from '@tanstack/react-router';

/** The denials a {@link DenialError} carries: not found has its own answer. */
export type DenialErrorKind = Exclude<DenialKind, 'not-found'>;

/**
 * What a server function throws for an unauthenticated or forbidden denial,
 * after setting the response status to 401 or 403. Error components recognise
 * it with {@link isDenialError}; register {@link denialErrorAdapter} so it
 * reaches the browser as itself.
 */
export class DenialError extends Error {
  override readonly name = 'DenialError';

  /** The HTTP status of the denial: 401 or 403. */
  readonly status: 401 | 403;

  constructor(
    /** Which denial it is. */
    readonly kind: DenialErrorKind,
    message: string,
  ) {
    super(message);
    this.status = kind === 'unauthenticated' ? 401 : 403;
  }
}

/** Whether `error` is a {@link DenialError}, such as in an error component. */
export function isDenialError(error: unknown): error is DenialError {
  return error instanceof DenialError;
}

/** A {@link DenialError} on the wire. */
export interface SerializedDenialError {
  kind: DenialErrorKind;
  message: string;
}

/**
 * Carries a {@link DenialError} across Start's wire (a server function's
 * answer, the SSR payload), which otherwise keeps only an error's message.
 * Register it in the app's `src/start.ts`:
 * `createStart(() => ({ serializationAdapters: [denialErrorAdapter] }))`.
 */
export const denialErrorAdapter: SerializationAdapter<
  DenialError,
  SerializedDenialError,
  never
> = createSerializationAdapter({
  key: '@jperezmart/tanstack-start-casl/DenialError',
  test: (value): value is DenialError => value instanceof DenialError,
  toSerializable: ({ kind, message }): SerializedDenialError => ({
    kind,
    message,
  }),
  fromSerializable: ({ kind, message }: SerializedDenialError) =>
    new DenialError(kind, message),
});
