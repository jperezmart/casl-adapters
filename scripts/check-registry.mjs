// npm's trusted publishing needs the package to exist on the registry already,
// so a publishable package that was never bootstrapped fails the release with
// `E404 PUT`, after the merge. This catches it on the PR that adds the package.
import { readdirSync, readFileSync } from 'node:fs';

const DAY_ZERO =
  'https://github.com/jperezmart/package-template#day-zero-a-package-that-has-never-been-published';

const names = readdirSync('packages')
  .map(dir => JSON.parse(readFileSync(`packages/${dir}/package.json`, 'utf8')))
  .filter(manifest => !manifest.private)
  .map(manifest => manifest.name);

const missing = [];
for (const name of names) {
  const res = await fetch(
    `https://registry.npmjs.org/${name.replace('/', '%2f')}`,
    {
      method: 'HEAD',
    },
  );
  if (res.status === 404) missing.push(name);
  else if (!res.ok) throw new Error(`${name}: registry answered ${res.status}`);
}

if (missing.length > 0) {
  console.error(
    `Not on npm yet, so the release cannot publish them:\n  ${missing.join('\n  ')}`,
  );
  console.error(
    `Bootstrap each one first (placeholder + trusted publisher): ${DAY_ZERO}`,
  );
  process.exit(1);
}
