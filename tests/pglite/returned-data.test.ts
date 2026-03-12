import { GraphQLInputObjectType, GraphQLNonNull, GraphQLObjectType, GraphQLScalarType, GraphQLSchema } from 'graphql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import z from 'zod';
import { createMinimalCtx, type MinimalContext, setupMinimal, teardownMinimal } from './common';

const DATA_DIR = `./tests/.temp/pgdata-returned-data-${Date.now()}`;

const ctx: MinimalContext = createMinimalCtx();

beforeAll(async () => {
  await setupMinimal(ctx, DATA_DIR);
});

afterAll(async () => {
  await teardownMinimal(ctx, DATA_DIR);
});

describe.sequential('Returned data tests', () => {
  it('Schema', () => {
    expect(ctx.schema instanceof GraphQLSchema).toBe(true);
  });

  it('Entities', () => {
    ctx.entities.mutations;
    const schema = z
      .object({
        queries: z
          .object({
            users: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    limit: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            usersSingle: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            posts: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    limit: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            postsSingle: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            customers: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    limit: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            customersSingle: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            tags: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    limit: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            tagsSingle: z
              .object({
                args: z
                  .object({
                    orderBy: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                    offset: z
                      .object({
                        type: z.instanceof(GraphQLScalarType),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
          })
          .strict(),
        mutations: z
          .object({
            insertIntoUsers: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoUsersSingle: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            updateUsers: z
              .object({
                args: z
                  .object({
                    set: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            deleteFromUsers: z
              .object({
                args: z
                  .object({
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoPosts: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoPostsSingle: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            updatePosts: z
              .object({
                args: z
                  .object({
                    set: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            deleteFromPosts: z
              .object({
                args: z
                  .object({
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoCustomers: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoCustomersSingle: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            updateCustomers: z
              .object({
                args: z
                  .object({
                    set: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            deleteFromCustomers: z
              .object({
                args: z
                  .object({
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoTags: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            insertIntoTagsSingle: z
              .object({
                args: z
                  .object({
                    values: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLObjectType),
              })
              .strict(),
            updateTags: z
              .object({
                args: z
                  .object({
                    set: z
                      .object({
                        type: z.instanceof(GraphQLNonNull),
                      })
                      .strict(),
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
            deleteFromTags: z
              .object({
                args: z
                  .object({
                    where: z
                      .object({
                        type: z.instanceof(GraphQLInputObjectType),
                      })
                      .strict(),
                  })
                  .strict(),
                resolve: z.function(),
                type: z.instanceof(GraphQLNonNull),
              })
              .strict(),
          })
          .strict(),
        types: z
          .object({
            UsersItem: z.instanceof(GraphQLObjectType),
            UsersSelectItem: z.instanceof(GraphQLObjectType),
            PostsItem: z.instanceof(GraphQLObjectType),
            PostsSelectItem: z.instanceof(GraphQLObjectType),
            CustomersItem: z.instanceof(GraphQLObjectType),
            CustomersSelectItem: z.instanceof(GraphQLObjectType),
            TagsItem: z.instanceof(GraphQLObjectType),
            TagsSelectItem: z.instanceof(GraphQLObjectType),
          })
          .strict(),
        inputs: z
          .object({
            UsersFilters: z.instanceof(GraphQLInputObjectType),
            UsersOrderBy: z.instanceof(GraphQLInputObjectType),
            UsersInsertInput: z.instanceof(GraphQLInputObjectType),
            UsersUpdateInput: z.instanceof(GraphQLInputObjectType),
            PostsFilters: z.instanceof(GraphQLInputObjectType),
            PostsOrderBy: z.instanceof(GraphQLInputObjectType),
            PostsInsertInput: z.instanceof(GraphQLInputObjectType),
            PostsUpdateInput: z.instanceof(GraphQLInputObjectType),
            CustomersFilters: z.instanceof(GraphQLInputObjectType),
            CustomersOrderBy: z.instanceof(GraphQLInputObjectType),
            CustomersInsertInput: z.instanceof(GraphQLInputObjectType),
            CustomersUpdateInput: z.instanceof(GraphQLInputObjectType),
            TagsFilters: z.instanceof(GraphQLInputObjectType),
            TagsOrderBy: z.instanceof(GraphQLInputObjectType),
            TagsInsertInput: z.instanceof(GraphQLInputObjectType),
            TagsUpdateInput: z.instanceof(GraphQLInputObjectType),
          })
          .strict(),
      })
      .strict();

    const parseRes = schema.safeParse(ctx.entities);

    if (!parseRes.success) {
      console.log(parseRes.error);
    }

    expect(parseRes.success).toEqual(true);
  });
});
