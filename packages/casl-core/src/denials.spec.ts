import {
  forbiddenDenialOf,
  NoRecordAllowedError,
  notFoundDenial,
  unauthenticatedDenial,
} from './index.js';

// The Denials an Adapter answers without a check of its own to decide them.
describe('the Denials outside a check', () => {
  it('answers an Unauthenticated request as decide does', () => {
    expect(unauthenticatedDenial).toEqual({
      allowed: false,
      kind: 'unauthenticated',
      message: 'No authenticated user available for the CASL ability check.',
    });
  });

  it('answers a missing record as a hidden instance', () => {
    expect(notFoundDenial).toEqual({
      allowed: false,
      kind: 'not-found',
      message: 'Not Found',
    });
  });

  it("answers the Access conditions' refusal as forbidden, with its message", () => {
    expect(
      forbiddenDenialOf(new NoRecordAllowedError('update', 'Article')),
    ).toEqual({
      allowed: false,
      kind: 'forbidden',
      message: 'No record of Article is allowed for update.',
    });
  });
});
