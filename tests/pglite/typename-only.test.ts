import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Context, createCtx, setupServer, setupTables, teardownServer, teardownTables } from './common';

const DATA_DIR = `./tests/.temp/pgdata-typename-only-${Date.now()}`;

const ctx: Context = createCtx();

beforeAll(async () => {
  await setupServer(ctx, 4014, DATA_DIR);
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

describe.sequential('__typename only tests', async () => {
  it(`Select single`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				usersSingle {
					__typename
				}

				postsSingle {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        usersSingle: {
          __typename: 'UsersSelectItem',
        },
        postsSingle: {
          __typename: 'PostsSelectItem',
        },
      },
    });
  });

  it(`Select array`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				users {
					__typename
				}

				posts {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        users: [
          {
            __typename: 'UsersSelectItem',
          },
          {
            __typename: 'UsersSelectItem',
          },
          {
            __typename: 'UsersSelectItem',
          },
        ],
        posts: [
          {
            __typename: 'PostsSelectItem',
          },
          {
            __typename: 'PostsSelectItem',
          },
          {
            __typename: 'PostsSelectItem',
          },
          {
            __typename: 'PostsSelectItem',
          },
          {
            __typename: 'PostsSelectItem',
          },
          {
            __typename: 'PostsSelectItem',
          },
        ],
      },
    });
  });

  it(`Select single with relations`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				usersSingle {
					__typename
					posts {
						__typename
					}
				}

				postsSingle {
					__typename
					author {
						__typename
					}
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        usersSingle: {
          __typename: 'UsersSelectItem',
          posts: [
            {
              __typename: 'UsersPostsRelation',
            },
            {
              __typename: 'UsersPostsRelation',
            },
            {
              __typename: 'UsersPostsRelation',
            },

            {
              __typename: 'UsersPostsRelation',
            },
          ],
        },
        postsSingle: {
          __typename: 'PostsSelectItem',
          author: {
            __typename: 'PostsAuthorRelation',
          },
        },
      },
    });
  });

  it(`Select array with relations`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				users {
					__typename
					posts {
						__typename
					}
				}

				posts {
					__typename
					author {
						__typename
					}
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        users: [
          {
            __typename: 'UsersSelectItem',
            posts: [
              {
                __typename: 'UsersPostsRelation',
              },
              {
                __typename: 'UsersPostsRelation',
              },
              {
                __typename: 'UsersPostsRelation',
              },
              {
                __typename: 'UsersPostsRelation',
              },
            ],
          },
          {
            __typename: 'UsersSelectItem',
            posts: [],
          },
          {
            __typename: 'UsersSelectItem',
            posts: [
              {
                __typename: 'UsersPostsRelation',
              },
              {
                __typename: 'UsersPostsRelation',
              },
            ],
          },
        ],
        posts: [
          {
            __typename: 'PostsSelectItem',
            author: {
              __typename: 'PostsAuthorRelation',
            },
          },
          {
            __typename: 'PostsSelectItem',
            author: {
              __typename: 'PostsAuthorRelation',
            },
          },
          {
            __typename: 'PostsSelectItem',
            author: {
              __typename: 'PostsAuthorRelation',
            },
          },
          {
            __typename: 'PostsSelectItem',
            author: {
              __typename: 'PostsAuthorRelation',
            },
          },
          {
            __typename: 'PostsSelectItem',
            author: {
              __typename: 'PostsAuthorRelation',
            },
          },
          {
            __typename: 'PostsSelectItem',
            author: {
              __typename: 'PostsAuthorRelation',
            },
          },
        ],
      },
    });
  });

  it(`Insert single`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				insertIntoUsersSingle(
					values: {
						a: [1, 5, 10, 25, 40]
						id: 3
						name: "ThirdUser"
						email: "userThree@notmail.com"
						birthdayString: "2024-04-02T06:44:41.785Z"
						birthdayDate: "2024-04-02T06:44:41.785Z"
						createdAt: "2024-04-02T06:44:41.785Z"
						role: admin
						roleText: null
						profession: "ThirdUserProf"
						initials: "FU"
						isConfirmed: true
					}
				) {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        insertIntoUsersSingle: {
          __typename: 'UsersItem',
        },
      },
    });
  });

  it(`Insert array`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				insertIntoUsers(
					values: [
						{
							a: [1, 5, 10, 25, 40]
							id: 3
							name: "ThirdUser"
							email: "userThree@notmail.com"
							birthdayString: "2024-04-02T06:44:41.785Z"
							birthdayDate: "2024-04-02T06:44:41.785Z"
							createdAt: "2024-04-02T06:44:41.785Z"
							role: admin
							roleText: null
							profession: "ThirdUserProf"
							initials: "FU"
							isConfirmed: true
						}
						{
							a: [1, 5, 10, 25, 40]
							id: 4
							name: "FourthUser"
							email: "userFour@notmail.com"
							birthdayString: "2024-04-04"
							birthdayDate: "2024-04-04T00:00:00.000Z"
							createdAt: "2024-04-04T06:44:41.785Z"
							role: user
							roleText: null
							roleText2: user
							profession: "FourthUserProf"
							initials: "SU"
							isConfirmed: false
						}
					]
				) {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        insertIntoUsers: [
          {
            __typename: 'UsersItem',
          },
          {
            __typename: 'UsersItem',
          },
        ],
      },
    });
  });

  it(`Update`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				updateCustomers(set: { isConfirmed: true, address: "Edited" }) {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        updateCustomers: [
          {
            __typename: 'CustomersItem',
          },
          {
            __typename: 'CustomersItem',
          },
        ],
      },
    });
  });

  it(`Delete`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				deleteFromCustomers {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        deleteFromCustomers: [
          {
            __typename: 'CustomersItem',
          },
          {
            __typename: 'CustomersItem',
          },
        ],
      },
    });
  });
});
