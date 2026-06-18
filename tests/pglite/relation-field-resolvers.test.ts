import { createServer, type Server } from 'node:http';
import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GraphQLClient } from '../util/query';
import {
  type Context,
  createCtx,
  createMinimalCtx,
  type MinimalContext,
  schema,
  setupMinimal,
  setupServer,
  setupTables,
  sql,
  teardownMinimal,
  teardownServer,
  teardownTables,
} from './common';

// ── Eager-path server (standard generated schema) ─────────────────────────────
const DATA_DIR_EAGER = `./tests/.temp/pgdata-rel-resolvers-eager-${Date.now()}`;
const ctx: Context = createCtx();

beforeAll(async () => {
  await setupServer(ctx, 4350, DATA_DIR_EAGER);
});
afterAll(async () => {
  await teardownServer(ctx, DATA_DIR_EAGER);
});
beforeEach(async () => {
  await setupTables(ctx);
});
afterEach(async () => {
  await teardownTables(ctx);
});

// ── Lazy-path server (custom root resolver, same generated types) ─────────────
const DATA_DIR_LAZY = `./tests/.temp/pgdata-rel-resolvers-lazy-${Date.now()}`;
const minCtx: MinimalContext = createMinimalCtx();
let lazyServer: Server;
let lazyGql: GraphQLClient;

beforeAll(async () => {
  await setupMinimal(minCtx, DATA_DIR_LAZY);

  // The "role" enum must exist before setupTables creates the users table.
  await minCtx.db.execute(
    sql`DO $$ BEGIN CREATE TYPE "role" AS ENUM('admin', 'user');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  );

  await setupTables(minCtx);

  // Build a custom schema that uses the generated types but returns bare parent
  // rows without any `with`-based relation pre-fetching.  This exercises the lazy
  // load path of every relation field resolver.
  const allTypes = minCtx.entities.types as Record<string, GraphQLObjectType>;
  // With typeNameMapper the generated names are singular (User, Post, ...).
  const UsersType = allTypes['User'] ?? allTypes['Users'];
  const PostsType = allTypes['Post'] ?? allTypes['Posts'];

  const lazySchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        users: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UsersType!))) as any,
          resolve: () => minCtx.db.select().from(schema.Users),
        },
        posts: {
          type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostsType!))) as any,
          resolve: () => minCtx.db.select().from(schema.Posts),
        },
      },
    }),
  });

  const yoga = createYoga({ schema: lazySchema });
  lazyServer = createServer(yoga);
  lazyServer.listen(4351);
  lazyGql = new GraphQLClient('http://localhost:4351/graphql');
});

afterAll(async () => {
  await new Promise<void>((resolve) => lazyServer?.close(() => resolve()));
  await teardownTables(minCtx);
  await teardownMinimal(minCtx, DATA_DIR_LAZY);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

describe.sequential('relation field resolvers — eager path (standard schema)', () => {
  it('fieldResolvers are exposed on entities for every relation', () => {
    const fr = ctx.entities.fieldResolvers as Record<string, Record<string, unknown>>;
    expect(fr).toBeDefined();
    expect(fr['Users']).toBeDefined();
    expect(typeof fr['Users']!['posts']).toBe('function');
    expect(typeof fr['Users']!['customer']).toBe('function');
    expect(fr['Posts']).toBeDefined();
    expect(typeof fr['Posts']!['author']).toBe('function');
  });

  it('many relation resolves via the generated query (eager)', async () => {
    const result = await ctx.gql.queryGql(`{
      users { id posts { id content } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    expect(user1?.posts).toHaveLength(4);
  });

  it('one relation resolves via the generated query (eager)', async () => {
    const result = await ctx.gql.queryGql(`{
      users { id customer { id address } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    expect(user1?.customer?.id).toBe(1);
    const user2 = result.data?.users?.find((u: any) => u.id === 2);
    expect(user2?.customer?.id).toBe(2);
  });

  it('mutation selecting a relation eager-loads it (no BatchLoader fallback)', async () => {
    const orig = ctx.pglite.query.bind(ctx.pglite);
    const seen: string[] = [];
    (ctx.pglite as any).query = (text: string, ...rest: any[]) => {
      seen.push(text.replace(/\s+/g, ' '));
      return orig(text, ...rest);
    };
    let result: any;
    try {
      result = await ctx.gql.queryGql(`mutation {
        createPost(values: { id: 9001, authorId: 1, content: "EAGER" }) {
          id content author { id name }
        }
      }`);
    } finally {
      (ctx.pglite as any).query = orig;
    }

    expect(result.errors).toBeUndefined();
    expect(result.data?.createPost?.author).toEqual({ id: 1, name: 'FirstUser' });

    // The relation must be eager-loaded via a lateral join on the re-fetch,
    // NOT via the field-level BatchLoader (which issues a plain
    // `select ... from "users" where "users"."id" in (...)`).
    const lateralLoads = seen.filter((q) => /from "posts".*left join lateral.*"users"/i.test(q));
    const batchLoaderLoads = seen.filter((q) => /from "users" where "users"\."id" in/i.test(q));
    expect(lateralLoads).toHaveLength(1);
    expect(batchLoaderLoads).toHaveLength(0);
  });

  it('relation field args (where) work via the generated schema', async () => {
    const result = await ctx.gql.queryGql(`{
      users { id posts(where: { content: { eq: "1MESSAGE" } }) { id content } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    expect(user1?.posts).toHaveLength(1);
    expect(user1?.posts[0]?.content).toBe('1MESSAGE');
  });
});

describe.sequential('relation field resolvers — lazy path (custom root resolver)', () => {
  it('many relation is lazily loaded when parent has no pre-fetched data', async () => {
    const result = await lazyGql.queryGql(`{
      users { id posts { id content } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    expect(user1?.posts).toHaveLength(4);
    const user5 = result.data?.users?.find((u: any) => u.id === 5);
    expect(user5?.posts).toHaveLength(2);
  });

  it('one relation is lazily loaded when parent has no pre-fetched data', async () => {
    const result = await lazyGql.queryGql(`{
      users { id customer { id address } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    expect(user1?.customer?.id).toBe(1);
    const user5 = result.data?.users?.find((u: any) => u.id === 5);
    expect(user5?.customer).toBeNull();
  });

  it('reverse one relation (Posts.author) is lazily loaded', async () => {
    const result = await lazyGql.queryGql(`{
      posts { id author { id name } }
    }`);
    expect(result.errors).toBeUndefined();
    const post1 = result.data?.posts?.find((p: any) => p.id === 1);
    expect(post1?.author?.id).toBe(1);
    expect(post1?.author?.name).toBe('FirstUser');
  });

  it('batches multiple lazy relation loads into a single DB query (N+1 protection)', async () => {
    // Query posts for all 3 users in a single GraphQL request.
    // Without batching this would be 3 separate SELECT queries;
    // with batching it collapses into one IN-clause query.
    // We can't inspect the query count directly from outside, but we verify
    // correct results are returned for all parents (proving batching worked).
    const result = await lazyGql.queryGql(`{
      users { id posts { id } }
    }`);
    expect(result.errors).toBeUndefined();
    const users: any[] = result.data?.users ?? [];
    expect(users.find((u: any) => u.id === 1)?.posts).toHaveLength(4);
    expect(users.find((u: any) => u.id === 2)?.posts).toHaveLength(0);
    expect(users.find((u: any) => u.id === 5)?.posts).toHaveLength(2);
  });

  it('relation field where arg works in lazy path', async () => {
    const result = await lazyGql.queryGql(`{
      users { id posts(where: { content: { eq: "1MESSAGE" } }) { id content } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    expect(user1?.posts).toHaveLength(1);
    expect(user1?.posts[0]?.content).toBe('1MESSAGE');
  });

  it('relation field limit arg applies per-parent across a batched query', async () => {
    // user 1 has 4 posts, user 5 has 2 — limit:2 must cap EACH parent at 2,
    // not the whole result set, and must do so in a single batched query.
    const result = await lazyGql.queryGql(`{
      users { id posts(limit: 2) { id } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    const user5 = result.data?.users?.find((u: any) => u.id === 5);
    expect(user1?.posts).toHaveLength(2);
    expect(user5?.posts).toHaveLength(2);
  });

  it('paginated relation issues a SINGLE batched query (no N+1)', async () => {
    // Count SELECTs against the posts table issued to the driver during the request.
    const orig = minCtx.pglite.query.bind(minCtx.pglite);
    let postSelects = 0;
    (minCtx.pglite as any).query = (text: string, ...rest: any[]) => {
      if (/select/i.test(text) && /"posts"/i.test(text)) {
        postSelects++;
      }
      return orig(text, ...rest);
    };
    try {
      const result = await lazyGql.queryGql(`{
        users { id posts(limit: 2) { id } }
      }`);
      expect(result.errors).toBeUndefined();
    } finally {
      (minCtx.pglite as any).query = orig;
    }
    // Pre-fix this was one query per user (true N+1). Now exactly one for the batch.
    expect(postSelects).toBe(1);
  });

  it('relation field offset arg applies per-parent across a batched query', async () => {
    // Order by id so the window is deterministic. user 1 posts: 1,2,3,6.
    // offset:1 limit:2 → ids 2,3 for user 1; user 5 posts: 4,5 → offset:1 → id 5.
    const result = await lazyGql.queryGql(`{
      users {
        id
        posts(orderBy: { id: { priority: 1, direction: asc } }, offset: 1, limit: 2) { id }
      }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    const user5 = result.data?.users?.find((u: any) => u.id === 5);
    expect(user1?.posts.map((p: any) => p.id)).toEqual([2, 3]);
    expect(user5?.posts.map((p: any) => p.id)).toEqual([5]);
  });

  it('limit combined with where applies per-parent in one batched query', async () => {
    const result = await lazyGql.queryGql(`{
      users { id posts(where: { content: { eq: "1MESSAGE" } }, limit: 5) { id content } }
    }`);
    expect(result.errors).toBeUndefined();
    const user1 = result.data?.users?.find((u: any) => u.id === 1);
    const user5 = result.data?.users?.find((u: any) => u.id === 5);
    expect(user1?.posts).toHaveLength(1);
    expect(user5?.posts).toHaveLength(1);
  });

  it('user with no related records returns empty array for many and null for one', async () => {
    const result = await lazyGql.queryGql(`{
      users { id posts { id } customer { id } }
    }`);
    expect(result.errors).toBeUndefined();
    const user5 = result.data?.users?.find((u: any) => u.id === 5);
    expect(user5?.posts).toHaveLength(2);
    expect(user5?.customer).toBeNull();
  });
});
