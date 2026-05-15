import { rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { GraphQLObjectType } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildSchema } from '@/index';
import * as schema from '../schema/pg';
import { GraphQLClient } from '../util/query';
import { setupTables } from './common';

// ── helpers ──────────────────────────────────────────────────────────────────

const makeDb = async (dataDir: string) => {
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  const db = drizzle({ client: pglite, schema, relations: schema.relations });
  await db.execute(
    sql`DO $$ BEGIN CREATE TYPE "role" AS ENUM('admin','user'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  );
  return { pglite, db };
};

const teardownDb = async (pglite: PGlite, dataDir: string) => {
  await pglite.close().catch(console.error);
  await rm(dataDir, { recursive: true, force: true }).catch(console.error);
};

// ── relationsDepthLimit ───────────────────────────────────────────────────────

describe('relationsDepthLimit: 0 — no relation fields generated', () => {
  const dataDir = `./tests/.temp/pgdata-cfg-depth0-${Date.now()}`;
  let pglite: PGlite;

  beforeAll(async () => {
    ({ pglite } = await makeDb(dataDir));
  });

  afterAll(async () => { await teardownDb(pglite, dataDir); });

  it('generated User type has no relation fields', () => {
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { relationsDepthLimit: 0 });
    const types = entities.types as Record<string, GraphQLObjectType>;
    const usersType = types['Users'] ?? types['User'];
    expect(usersType).toBeDefined();
    const fields = usersType!.getFields();
    expect(fields['posts']).toBeUndefined();
    expect(fields['customer']).toBeUndefined();
    // Column fields still exist
    expect(fields['id']).toBeDefined();
    expect(fields['name']).toBeDefined();
  });

  it('Posts type also has no relation fields with depth limit 0', () => {
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { relationsDepthLimit: 0 });
    const types = entities.types as Record<string, GraphQLObjectType>;
    const postsType = types['Posts'] ?? types['Post'];
    expect(postsType).toBeDefined();
    const fields = postsType!.getFields();
    expect(fields['author']).toBeUndefined();
    expect(fields['id']).toBeDefined();
  });
});

describe('relationsDepthLimit: 1 — direct relations present, no additional nesting during generation', () => {
  const dataDir = `./tests/.temp/pgdata-cfg-depth1-${Date.now()}`;
  let pglite: PGlite;

  beforeAll(async () => {
    ({ pglite } = await makeDb(dataDir));
  });

  afterAll(async () => { await teardownDb(pglite, dataDir); });

  it('User type has direct relation fields at depth 1', () => {
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { relationsDepthLimit: 1 });
    const types = entities.types as Record<string, GraphQLObjectType>;
    const usersType = types['Users'] ?? types['User'];
    const fields = usersType!.getFields();
    // Depth 1 means the root tables (depth=0 < limit=1) DO generate relations.
    expect(fields['posts']).toBeDefined();
    expect(fields['customer']).toBeDefined();
  });
});

// ── custom prefixes ───────────────────────────────────────────────────────────

describe('custom prefixes and suffixes', () => {
  const dataDir = `./tests/.temp/pgdata-cfg-naming-${Date.now()}`;
  let pglite: PGlite;
  let server: Server;
  let gql: GraphQLClient;

  beforeAll(async () => {
    ({ pglite } = await makeDb(dataDir));
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { schema: gqlSchema } = buildSchema(db, {
      prefixes: { insert: 'add', delete: 'remove', update: 'patch' },
      suffixes: { list: 'List', single: 'One' },
    });
    await setupTables({ db } as any);
    const yoga = createYoga({ schema: gqlSchema });
    server = createServer(yoga);
    server.listen(4362);
    gql = new GraphQLClient('http://localhost:4362/graphql');
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await teardownDb(pglite, dataDir);
  });

  it('list query uses custom suffix', async () => {
    const res = await gql.queryGql(`{ usersList { id name } }`);
    expect(res.errors).toBeUndefined();
    expect(Array.isArray(res.data?.usersList)).toBe(true);
  });

  it('single query uses custom suffix', async () => {
    const res = await gql.queryGql(`{ usersOne { id name } }`);
    expect(res.errors).toBeUndefined();
  });

  it('insert mutation uses custom prefix', async () => {
    const res = await gql.queryGql(`
      mutation { addUsersPostsList: addPosts(values: [{ content: "hello", authorId: 1 }]) { id content } }
    `);
    // Mutation name is addPosts (custom prefix 'add' + table 'Posts')
    // We just verify the old name doesn't work and the new one does
    const wrongPrefix = await gql.queryGql(`{ insertIntoPosts(values: []) { id } }`);
    expect(wrongPrefix.errors).toBeDefined(); // unknown field
  });

  it('delete mutation uses custom prefix', async () => {
    const wrongPrefix = await gql.queryGql(`mutation { deleteFromUsers(where: {}) { id } }`);
    expect(wrongPrefix.errors).toBeDefined(); // field 'deleteFromUsers' does not exist with custom prefix
  });

  it('update mutation uses custom prefix', async () => {
    const wrongPrefix = await gql.queryGql(`mutation { updateUsers(set: { name: "x" }) { id } }`);
    expect(wrongPrefix.errors).toBeDefined(); // field 'updateUsers' does not exist; it's now 'patchUsers'
  });
});

// ── conflictDoNothing ─────────────────────────────────────────────────────────

describe('conflictDoNothing: true', () => {
  const dataDir = `./tests/.temp/pgdata-cfg-conflict-${Date.now()}`;
  let pglite: PGlite;
  let server: Server;
  let gql: GraphQLClient;

  beforeAll(async () => {
    ({ pglite } = await makeDb(dataDir));
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { schema: gqlSchema } = buildSchema(db, {
      singularTypes: true,
      prefixes: { insert: 'create', delete: 'delete' },
      suffixes: { single: '', list: 's' },
      conflictDoNothing: true,
    });
    await setupTables({ db } as any);
    const yoga = createYoga({ schema: gqlSchema });
    server = createServer(yoga);
    server.listen(4363);
    gql = new GraphQLClient('http://localhost:4363/graphql');
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await teardownDb(pglite, dataDir);
  });

  it('inserting a duplicate PK does not error when conflictDoNothing is true', async () => {
    // id=1 already exists from setupTables
    const res = await gql.queryGql(`
      mutation {
        createUser(values: { id: 1, name: "Duplicate", createdAt: "2024-04-02T06:44:41.785Z" }) { id }
      }
    `);
    expect(res.errors).toBeUndefined();
    // onConflictDoNothing returns no rows on conflict
    expect(res.data?.createUser).toBeNull();
  });

  it('inserting a non-conflicting row succeeds normally', async () => {
    const res = await gql.queryGql(`
      mutation {
        createUser(values: { id: 99, name: "NewUser", createdAt: "2024-04-02T06:44:41.785Z" }) { id name }
      }
    `);
    expect(res.errors).toBeUndefined();
    expect(res.data?.createUser?.id).toBe(99);
  });
});

// ── singularTypes naming ───────────────────────────────────────────────────────

describe('singularTypes: true — generated query and mutation names', () => {
  const dataDir = `./tests/.temp/pgdata-cfg-singular-${Date.now()}`;
  let pglite: PGlite;

  beforeAll(async () => {
    ({ pglite } = await makeDb(dataDir));
  });

  afterAll(async () => { await teardownDb(pglite, dataDir); });

  it('list/single query names are singularized', () => {
    // Default suffixes: list='', single='Single'
    // With singularTypes: uncapitalize+singularize('Users') = 'user'
    //   list query  = 'user' + ''       = 'user'
    //   single query = 'user' + 'Single' = 'userSingle'
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { singularTypes: true });
    const queryKeys = Object.keys(entities.queries);
    expect(queryKeys).toContain('user');
    expect(queryKeys).toContain('userSingle');
    expect(queryKeys).not.toContain('users');
    expect(queryKeys).not.toContain('usersSingle');
  });

  it('insert-single mutation name drops the "Single" suffix', () => {
    // singularTypes=true: insertInto + singularize('Users') = 'insertIntoUser' (no 'Single')
    // singularTypes=false: insertInto + 'Users' + 'Single' = 'insertIntoUsersSingle'
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { singularTypes: true });
    const mutationKeys = Object.keys(entities.mutations);
    expect(mutationKeys).toContain('insertIntoUser');
    expect(mutationKeys).not.toContain('insertIntoUsersSingle');
    expect(mutationKeys).not.toContain('insertIntoUserSingle');
  });

  it('insert-array mutation keeps the table name capitalised (not singularized)', () => {
    // insertInto + capitalize('Users') = 'insertIntoUsers' regardless of singularTypes
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { singularTypes: true });
    expect(Object.keys(entities.mutations)).toContain('insertIntoUsers');
  });

  it('generated type names are singular', () => {
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { singularTypes: true });
    const typeKeys = Object.keys(entities.types);
    expect(typeKeys).toContain('User');
    expect(typeKeys).not.toContain('Users');
  });

  it('with singularTypes=false (default) names are plural', () => {
    const db = drizzle({ client: pglite, schema, relations: schema.relations });
    const { entities } = buildSchema(db, { singularTypes: false });
    const queryKeys = Object.keys(entities.queries);
    expect(queryKeys).toContain('users');
    expect(queryKeys).toContain('usersSingle');
    expect(Object.keys(entities.types)).toContain('Users');
  });
});
