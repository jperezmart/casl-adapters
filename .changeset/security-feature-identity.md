---
'@jperezmart/nest-casl': patch
---

Every `CaslModule.forFeature` is now its own module on NestJS 10, and on NestJS 11 with `moduleIdGeneratorAlgorithm: 'deep-hash'`. Those key a dynamic module by a hash of its metadata, which was the same for every `forFeature`, so only the first permissions map was registered: the `cannot` rules and Role restrictions of every later feature were silently not enforced (and its grants were missing). Apps on those setups now get the rules of every feature, as on NestJS 11's default.
