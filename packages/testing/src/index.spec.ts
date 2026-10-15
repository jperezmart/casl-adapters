import * as caslTesting from '@jperezmart/casl-testing';

import { buildAbilityForTest } from './index.js';

describe('@jperezmart/nest-casl-testing', () => {
  it('re-exports buildAbilityForTest from @jperezmart/casl-testing', () => {
    expect(buildAbilityForTest).toBe(caslTesting.buildAbilityForTest);
  });
});
