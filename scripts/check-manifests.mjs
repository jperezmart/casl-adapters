// pnpm persists `--config.runtime-on-fail=…` into package.json, flipping
// devEngines.runtime.onFail away from "error". That relaxes the Node pin for
// everyone, so it must never reach a commit.
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const onFail = manifest.devEngines?.runtime?.onFail;

if (onFail !== 'error') {
  console.error(
    `package.json: devEngines.runtime.onFail is ${JSON.stringify(onFail)}, expected "error".`,
  );
  process.exit(1);
}
