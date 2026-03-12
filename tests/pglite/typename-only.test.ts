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
				user {
					__typename
				}

				post {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        user: {
          __typename: 'Users',
        },
        post: {
          __typename: 'Posts',
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
            __typename: 'Users',
          },
          {
            __typename: 'Users',
          },
          {
            __typename: 'Users',
          },
        ],
        posts: [
          {
            __typename: 'Posts',
          },
          {
            __typename: 'Posts',
          },
          {
            __typename: 'Posts',
          },
          {
            __typename: 'Posts',
          },
          {
            __typename: 'Posts',
          },
          {
            __typename: 'Posts',
          },
        ],
      },
    });
  });

  it(`Select single with relations`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			{
				user {
					__typename
					posts {
						__typename
					}
				}

				post {
					__typename
					author {
						__typename
					}
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        user: {
          __typename: 'Users',
          posts: [
            {
              __typename: 'Posts',
            },
            {
              __typename: 'Posts',
            },
            {
              __typename: 'Posts',
            },

            {
              __typename: 'Posts',
            },
          ],
        },
        post: {
          __typename: 'Posts',
          author: {
            __typename: 'Users',
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
            __typename: 'Users',
            posts: [
              {
                __typename: 'Posts',
              },
              {
                __typename: 'Posts',
              },
              {
                __typename: 'Posts',
              },
              {
                __typename: 'Posts',
              },
            ],
          },
          {
            __typename: 'Users',
            posts: [],
          },
          {
            __typename: 'Users',
            posts: [
              {
                __typename: 'Posts',
              },
              {
                __typename: 'Posts',
              },
            ],
          },
        ],
        posts: [
          {
            __typename: 'Posts',
            author: {
              __typename: 'Users',
            },
          },
          {
            __typename: 'Posts',
            author: {
              __typename: 'Users',
            },
          },
          {
            __typename: 'Posts',
            author: {
              __typename: 'Users',
            },
          },
          {
            __typename: 'Posts',
            author: {
              __typename: 'Users',
            },
          },
          {
            __typename: 'Posts',
            author: {
              __typename: 'Users',
            },
          },
          {
            __typename: 'Posts',
            author: {
              __typename: 'Users',
            },
          },
        ],
      },
    });
  });

  it(`Insert single`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				createUser(
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
        createUser: {
          __typename: 'Users',
        },
      },
    });
  });

  it(`Insert array`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				createUsers(
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
        createUsers: [
          {
            __typename: 'Users',
          },
          {
            __typename: 'Users',
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
            __typename: 'Customers',
          },
          {
            __typename: 'Customers',
          },
        ],
      },
    });
  });

  it(`Delete`, async () => {
    const res = await ctx.gql.queryGql(/* GraphQL */ `
			mutation {
				deleteCustomers {
					__typename
				}
			}
		`);

    expect(res).toStrictEqual({
      data: {
        deleteCustomers: [
          {
            __typename: 'Customers',
          },
          {
            __typename: 'Customers',
          },
        ],
      },
    });
  });
});
