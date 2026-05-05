# 1.0.0 (2026-05-05)


### Bug Fixes

* align type names, add drizzle-orm v1 relations support, and per-call type cache ([592965f](https://github.com/vantreeseba/drizzle-graphql/commit/592965f2f9ef0eca9684c68cf1b49971ba76232e))
* apply singularTypes/suffix options correctly in query name generation ([c2c4884](https://github.com/vantreeseba/drizzle-graphql/commit/c2c4884b7b79a53c01b89cc2d41e3a2e0a66f530))
* create tests/.temp directory before running tests in CI ([c0c4f6d](https://github.com/vantreeseba/drizzle-graphql/commit/c0c4f6d6345537fc8b0f3a00a43975250514f534))
* Fix drizzle kit version in package json. ([f4b9d8c](https://github.com/vantreeseba/drizzle-graphql/commit/f4b9d8c7d34835471e0e52c6f49500e0fb8d6e4a))
* Fix semver ~ to ^ on orm beta. ([c38aca7](https://github.com/vantreeseba/drizzle-graphql/commit/c38aca73d393f67ec615b1610a5f43abde1eb345))
* Force release. ([5137872](https://github.com/vantreeseba/drizzle-graphql/commit/5137872fcfb52e67640a066233c4c34e7c7bfa7a))
* Handle case where input undefined in case ops. ([ae0e737](https://github.com/vantreeseba/drizzle-graphql/commit/ae0e737fe5926be17e8b96fc39f2440e10b9cfff))
* resolve TypeScript type check errors ([160b07e](https://github.com/vantreeseba/drizzle-graphql/commit/160b07eac56a9f8a8a3367967d11866bac5b1257))
* Revert. ([da71f55](https://github.com/vantreeseba/drizzle-graphql/commit/da71f5516c84646fd7c855895ad7768d033a8bd8))
* use tsx to run build script instead of node ([c736bc4](https://github.com/vantreeseba/drizzle-graphql/commit/c736bc40101b6b5d8592f6525b38dd3e0a675d47))


### Features

* add singularTypes option to BuildSchemaConfig ([5ae8b2a](https://github.com/vantreeseba/drizzle-graphql/commit/5ae8b2a6c534faa927bba4374408807d39d65be3))
* export from TypeScript source, add graphql-scalars dependency ([633486b](https://github.com/vantreeseba/drizzle-graphql/commit/633486be96ff3bdef911f0e8bb740429b2152e90))
* input type names now reflect mutation prefix ([d00a06f](https://github.com/vantreeseba/drizzle-graphql/commit/d00a06f01bd0f5d2f2bd5d7224e9f59cf73c1090))
* Make graphql a peer dep. ([cfecb9e](https://github.com/vantreeseba/drizzle-graphql/commit/cfecb9e868f1031f0454adb47c21f99487e49ef4))
* merge philotes vendor fork changes ([17819c3](https://github.com/vantreeseba/drizzle-graphql/commit/17819c345eb9bbb89ed7b7a59c9748855c29631d))
* simplify GraphQL type names, add pluralize dep, consolidate relation helpers, and support PG array/date columns ([57711fc](https://github.com/vantreeseba/drizzle-graphql/commit/57711fcb62812f81055bf4b5cb35de81502776c3))
* upgrade to drizzle-orm 1.0.0-beta, fix package exports for CJS/ESM ([864630f](https://github.com/vantreeseba/drizzle-graphql/commit/864630fc6cabbc3b3cdddf7c634a6638edb10e84))
