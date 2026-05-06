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
import type { AnyDrizzleDB, BuildSchemaConfig, GeneratedData } from './types.ts';
import { generateMySQL, generatePG, generateSQLite } from './util/builders/index.ts';

export { extractFilters, extractOrderBy } from './util/builders/common.ts';

export type {
  AnyDrizzleDB,
  BuildSchemaConfig,
  DeleteResolver,
  ExtractRelations,
  ExtractTableByName,
  ExtractTableRelations,
  ExtractTables,
  GeneratedData,
  GeneratedEntities,
  GeneratedInputs,
  GeneratedOutputs,
  InsertArrResolver,
  InsertResolver,
  MutationReturnlessResult,
  MutationsCore,
  QueriesCore,
  SelectResolver,
  SelectSingleResolver,
  UpdateResolver,
} from './types.ts';

type ObjMap<T> = Record<string, T>;

export const buildSchema = <TDbClient extends AnyDrizzleDB<any>>(
  db: TDbClient,
  config?: BuildSchemaConfig,
): GeneratedData<TDbClient> => {
  const relations = db._.relations;
  // drizzle-orm v1 rc.2 removed fullSchema from PgAsyncDatabase._
  // For PG, reconstruct a schema-like map from db._.relations (each entry has { table }).
  // MySQL and SQLite still expose fullSchema directly.
  const schema =
    (db._ as any).fullSchema ??
    Object.fromEntries(
      Object.entries(relations as Record<string, any>)
        .filter(([, config]) => config?.table != null)
        .map(([key, config]) => [key, config.table]),
    );

  if (!schema || !Object.keys(schema).length) {
    throw new Error(
      "Drizzle-GraphQL Error: Schema not found in drizzle instance. Pass relations (from buildRelations/defineRelations) to the drizzle constructor so drizzle-graphql can detect your tables.",
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

  const singularTypes = config?.singularTypes ?? false;

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
    generatorOutput = generateMySQL(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      singularTypes,
    );
  } else if (is(db, PgAsyncDatabase)) {
    generatorOutput = generatePG(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      config?.conflictDoNothing ?? false,
      singularTypes,
    );
  } else if (is(db, BaseSQLiteDatabase)) {
    generatorOutput = generateSQLite(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      singularTypes,
    );
  } else {
    throw new Error('Drizzle-GraphQL Error: Unknown database instance type');
  }

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
