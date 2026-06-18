# Drizzle-GraphQL

Automatically create GraphQL schema or customizable schema config fields from Drizzle ORM schema

## Usage

-   Pass your drizzle database instance and schema into builder to generate `{ schema, entities }` object
-   Use `schema` if pre-built schema already satisfies all your neeeds. It's compatible witn any server that consumes `GraphQLSchema` class instance

    Example: hosting schema using [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)

    ```Typescript
    import { createServer } from 'node:http'
    import { createYoga } from 'graphql-yoga'
    import { buildSchema } from 'drizzle-graphql'

    // db - your drizzle instance
    import { db } from './database'

    const { schema } = buildSchema(db)

    const yoga = createYoga({ schema })

    server.listen(4000, () => {
        console.info('Server is running on http://localhost:4000/graphql')
    })
    ```

-   If you want to customize your schema, you can use `entities` object to build your own new schema

    ```Typescript
    import { createServer } from 'node:http'
    import { GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema } from 'graphql'
    import { createYoga } from 'graphql-yoga'
    import { buildSchema } from 'drizzle-graphql'

    // Schema contains 'Users' and 'Customers' tables
    import { db } from './database'

    const { entities } = buildSchema(db)

    // You can customize which parts of queries or mutations you want
    const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'Query',
            fields: {
                // Select only wanted queries out of all generated
                users: entities.queries.users,
                customer: entities.queries.customersSingle,

                // Create a custom one
                customUsers: {
                    // You can reuse and customize types from original schema
                    type: new GraphQLList(new GraphQLNonNull(entities.types.UsersItem)),
                    args: {
                        // You can reuse inputs as well
                        where: {
                            type: entities.inputs.UsersFilters
                        }
                    },
                    resolve: async (source, args, context, info) => {
                        // Your custom logic goes here...
                        const result = await db.select(schema.Users).where()...

                        return result
                    }
                }
            }
        }),
        // Same rules apply to mutations
        mutation: new GraphQLObjectType({
            name: 'Mutation',
            fields: entities.mutations
        }),
        // In case you need types inside your schema
        types: [...Object.values(entities.types), ...Object.values(entities.inputs)]
    })

    const yoga = createYoga({
        schema
    })

    server.listen(4000, () => {
        console.info('Server is running on http://localhost:4000/graphql')
    })
    ```

## Relations & N+1 handling

Generated schemas resolve nested relations without N+1 query explosions:

-   **Queries** — root queries (`entities.queries.*`) eagerly load every requested
    relation in a single round-trip using Drizzle's relational query builder
    (`with:`), including nested relations and per-relation `where` / `orderBy` /
    `limit` / `offset` arguments.
-   **Mutations** — after an insert or update, if the selection set includes relation
    fields, the affected rows are re-fetched by primary key through one relational
    query so their relations are eagerly loaded (single- and composite-column primary
    keys are supported). `delete` mutations keep using the request-scoped batch loader,
    since the rows no longer exist to re-fetch.
-   **Custom schemas** — each relation field also has a standalone resolver, exported as
    `entities.fieldResolvers[TableName][relationName]`. When you wire generated types
    into your own schema and your root resolver does **not** pre-fetch relations, these
    resolvers batch all sibling loads in a request into a single `IN (…)` query
    (request-scoped, keyed on the GraphQL `context`), preventing N+1. Per-parent
    `limit` / `offset` on a to-many relation is applied across the whole batch using a
    `ROW_NUMBER() OVER (PARTITION BY …)` window function — still one query, not one per
    parent.

    ```Typescript
    // entities.fieldResolvers is keyed by table name, then relation name
    const usersPostsResolver = entities.fieldResolvers.Users.posts
    ```

> [!IMPORTANT]
> Per-parent paginated relations (a to-many relation field with `limit` or `offset`)
> rely on SQL window functions. These require **PostgreSQL**, **MySQL 8.0+**, or
> **SQLite 3.25+**. Relations without pagination, and all other query/mutation paths,
> have no such requirement.
