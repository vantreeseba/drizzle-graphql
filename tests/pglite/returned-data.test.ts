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
            user: z
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
            post: z
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
            customer: z
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
            tag: z
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
            createUsers: z
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
            createUser: z
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
            deleteUsers: z
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
            createPosts: z
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
            createPost: z
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
            deletePosts: z
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
            createCustomers: z
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
            createCustomer: z
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
            deleteCustomers: z
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
            createTags: z
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
            createTag: z
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
            deleteTags: z
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
            Users: z.instanceof(GraphQLObjectType),
            Users: z.instanceof(GraphQLObjectType),
            Posts: z.instanceof(GraphQLObjectType),
            Posts: z.instanceof(GraphQLObjectType),
            Customers: z.instanceof(GraphQLObjectType),
            Customers: z.instanceof(GraphQLObjectType),
            Tags: z.instanceof(GraphQLObjectType),
            Tags: z.instanceof(GraphQLObjectType),
          })
          .strict(),
        inputs: z
          .object({
            UsersFilters: z.instanceof(GraphQLInputObjectType),
            UsersOrderBy: z.instanceof(GraphQLInputObjectType),
            CreateUsersInput: z.instanceof(GraphQLInputObjectType),
            UpdateUsersInput: z.instanceof(GraphQLInputObjectType),
            PostsFilters: z.instanceof(GraphQLInputObjectType),
            PostsOrderBy: z.instanceof(GraphQLInputObjectType),
            CreatePostsInput: z.instanceof(GraphQLInputObjectType),
            UpdatePostsInput: z.instanceof(GraphQLInputObjectType),
            CustomersFilters: z.instanceof(GraphQLInputObjectType),
            CustomersOrderBy: z.instanceof(GraphQLInputObjectType),
            CreateCustomersInput: z.instanceof(GraphQLInputObjectType),
            UpdateCustomersInput: z.instanceof(GraphQLInputObjectType),
            TagsFilters: z.instanceof(GraphQLInputObjectType),
            TagsOrderBy: z.instanceof(GraphQLInputObjectType),
            CreateTagsInput: z.instanceof(GraphQLInputObjectType),
            UpdateTagsInput: z.instanceof(GraphQLInputObjectType),
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
