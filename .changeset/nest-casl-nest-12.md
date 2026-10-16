---
'@jperezmart/nest-casl': minor
---

**Breaking:** `@jperezmart/nest-casl` now supports NestJS 11 and 12, and no longer NestJS 10. The `@nestjs/common` and `@nestjs/core` peer ranges go from `^10.0.0 || ^11.0.0` to `^11.0.0 || ^12.0.0`; the public API and behaviour are unchanged, and the tests pass against both majors.

To migrate from NestJS 10, upgrade the app to NestJS 11 or 12 first. On NestJS 12, whose packages are ESM-only, a CommonJS app loads them (and this package's CommonJS build loads them) through `require(esm)`, which needs the Node.js versions NestJS 12 already requires (20.19+ or 22.12+).
