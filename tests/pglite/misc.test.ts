import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildSchema } from '@/index';
import { type Context, createCtx, schema, setupServer, setupTables, teardownServer, teardownTables } from './common';

const DATA_DIR = `./tests/.temp/pgdata-misc-${Date.now()}`;

const ctx: Context = createCtx();

beforeAll(async () => {
  await setupServer(ctx, 4016, DATA_DIR);
});

afterAll(async () => {
  await teardownServer(ctx, DATA_DIR);
});

beforeEach(async () => {
  await setupTables(ctx);
});

afterEach(async () => {
  await teardownTables(ctx);
});

describe.sequential('buildSchema idempotency', () => {
  it('can call buildSchema twice on the same db without type name conflicts', () => {
    expect(() => {
      buildSchema(ctx.db);
      buildSchema(ctx.db);
    }).not.toThrow();
  });
});

describe.sequential('Table without relations (Tags)', () => {
  it('Query tags list and single without relations', async () => {
    await ctx.db.insert(schema.Tags).values([{ id: 1, name: 'JavaScript', description: 'JS tag' }]);

    const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				tags { id name description }
				tag { id name description }
			}
		`);

    expect(res.data.tags).toEqual([{ id: 1, name: 'JavaScript', description: 'JS tag' }]);
    expect(res.data.tag).toEqual({ id: 1, name: 'JavaScript', description: 'JS tag' });
  });

  it('Insert single tag without relations', async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				createTag(values: { name: "TypeScript", description: "TS tag" }) {
					id
					name
					description
				}
			}
		`);

    expect(res.errors).toBeUndefined();
    expect(res.data?.createTag?.name).toBe('TypeScript');
    expect(res.data?.createTag?.description).toBe('TS tag');
  });

  it('Insert multiple tags without relations', async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				createTags(values: [
					{ name: "Go", description: "Go tag" }
					{ name: "Rust", description: "Rust tag" }
				]) {
					id
					name
					description
				}
			}
		`);

    expect(res.errors).toBeUndefined();
    expect(res.data?.createTags).toHaveLength(2);
  });
});

describe.sequential('Insert conflict behavior (no onConflictDoNothing by default)', () => {
  it('Insert single raises error on duplicate PK (no onConflictDoNothing)', async () => {
    // id=1 for Users already exists from beforeEach — inserting it again should error
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				createUser(values: { id: 1, name: "Duplicate", createdAt: "2024-04-02T06:44:41.785Z" }) {
					id
					name
				}
			}
		`);

    // Without onConflictDoNothing, duplicate PK must produce a GraphQL error,
    // NOT silently return undefined.
    expect(res.errors).toBeDefined();
    expect(res.errors!.length).toBeGreaterThan(0);
  });
});
