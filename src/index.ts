import { is } from 'drizzle-orm';
import { MySqlDatabase } from 'drizzle-orm/mysql-core';
import { PgAsyncDatabase } from 'drizzle-orm/pg-core';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import {
  type GraphQLFieldConfig,
  type GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
  type GraphQLSchemaConfig,
} from 'graphql';
import type { ObjMap } from 'graphql/jsutils/ObjMap';
import type { AnyDrizzleDB, BuildSchemaConfig, GeneratedData } from './types.ts';
import { generateMySQL, generatePG, generateSQLite } from './util/builders/index.ts';

export const buildSchema = <TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  config?: BuildSchemaConfig,
): GeneratedData<TDbClient> => {
  const schema = db._.fullSchema;
  const relations = db._.relations;
  if (!schema) {
    throw new Error(
      "Drizzle-GraphQL Error: Schema not found in drizzle instance. Make sure you're using drizzle-orm v0.30.9 or above and schema is passed to drizzle constructor!",
    );
  }

  const prefixes = {
    insert: config?.prefixes?.insert ?? 'insertInto',
    delete: config?.prefixes?.delete ?? 'deleteFrom',
    update: config?.prefixes?.update ?? 'update',
  };

  const suffixes = {
    list: config?.suffixes?.list ?? '',
    single: config?.suffixes?.single ?? 'Single',
  };

  if (typeof config?.relationsDepthLimit === 'number') {
    if (config.relationsDepthLimit < 0) {
      throw new Error(
        'Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!',
      );
    }
    if (config.relationsDepthLimit !== ~~config.relationsDepthLimit) {
      throw new Error(
        'Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!',
      );
    }
    if (suffixes.list === suffixes.single) {
      throw new Error(
        'Drizzle-GraphQL Error: List and single query suffixes cannot be the same. This would create conflicting GraphQL field names.',
      );
    }
  }

  let generatorOutput;
  if (is(db, MySqlDatabase)) {
    generatorOutput = generateMySQL(db, schema, config?.relationsDepthLimit, prefixes, suffixes);
  } else if (is(db, PgAsyncDatabase)) {
    generatorOutput = generatePG(db, schema, relations, config?.relationsDepthLimit, prefixes, suffixes);
  } else if (is(db, BaseSQLiteDatabase)) {
    generatorOutput = generateSQLite(db, schema, config?.relationsDepthLimit, prefixes, suffixes);
  } else throw new Error('Drizzle-GraphQL Error: Unknown database instance type');

  const { queries, mutations, inputs, types } = generatorOutput;

  const graphQLSchemaConfig: GraphQLSchemaConfig = {
    types: [...Object.values(inputs), ...Object.values(types)] as (GraphQLInputObjectType | GraphQLObjectType)[],
    query: new GraphQLObjectType({
      name: 'Query',
      fields: queries as ObjMap<GraphQLFieldConfig<any, any, any>>,
    }),
  };

  if (config?.mutations !== false) {
    const mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: mutations as ObjMap<GraphQLFieldConfig<any, any, any>>,
    });

    graphQLSchemaConfig.mutation = mutation;
  }

  const outputSchema = new GraphQLSchema(graphQLSchemaConfig);

  return { schema: outputSchema, entities: generatorOutput };
};
