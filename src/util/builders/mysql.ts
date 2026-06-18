// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import { is, One, type Table } from 'drizzle-orm';
import { type MySqlDatabase, MySqlTable } from 'drizzle-orm/mysql-core';
import type { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';
import type { GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, ThunkObjMap } from 'graphql';
import {
  GraphQLBoolean,
  GraphQLError,
  type GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql';
import type { ResolveTree } from 'graphql-parse-resolve-info';
import { parseResolveInfo } from 'graphql-parse-resolve-info';

import type { BuildSchemaConfig, GeneratedEntities, MakeRequired } from '../../types.ts';
import {
  buildNamedRelations,
  createRelationResolverFactory,
  extractFilters,
  extractOrderBy,
  extractRelationsParams,
  extractSelectedColumnsFromTree,
  generateTableTypes,
  pruneNonEagerRelations,
  type RelationResolverFactory,
  type TablesRelationalConfig,
  type TypeCacheCtx,
  type TypeNameMapper,
} from '../builders/common.ts';
import { capitalize, uncapitalize } from '../case-ops/index.ts';

import {
  remapFromGraphQLArrayInput,
  remapFromGraphQLSingleInput,
  remapToGraphQLArrayOutput,
  remapToGraphQLSingleOutput,
} from '../data-mappers/index.ts';
import type { CreatedResolver, Filters, TableNamedRelations, TableSelectArgs } from './types.ts';

const generateSelectArray = (
  db: MySqlDatabase<any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
): CreatedResolver => {
  const queryBase = db.query[tableName as keyof typeof db.query] as unknown as
    | RelationalQueryBuilder<any, any, any>
    | undefined;
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`,
    );
  }

  const queryArgs = {
    offset: {
      type: GraphQLInt,
    },
    limit: {
      type: GraphQLInt,
    },
    orderBy: {
      type: orderArgs,
    },
    where: {
      type: filterArgs,
    },
  } as GraphQLFieldConfigArgumentMap;

  const table = tables[tableName]!;

  return {
    name: fieldName,
    resolver: async (_source, args: Partial<TableSelectArgs>, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName]!, table),
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy) : undefined,
          where: where ? { RAW: (aliased: Table) => extractFilters(aliased, tableName, where) } : undefined,
          with: relationMap[tableName]
            ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, typeNameMapper)
            : undefined,
        });

        const result = await query;

        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError((e as any).message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateSelectSingle = (
  db: MySqlDatabase<any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
): CreatedResolver => {
  const queryBase = db.query[tableName as keyof typeof db.query] as unknown as
    | RelationalQueryBuilder<any, any, any>
    | undefined;
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`,
    );
  }

  const queryArgs = {
    offset: {
      type: GraphQLInt,
    },
    orderBy: {
      type: orderArgs,
    },
    where: {
      type: filterArgs,
    },
  } as GraphQLFieldConfigArgumentMap;

  const table = tables[tableName]!;

  return {
    name: fieldName,
    resolver: async (_source, args: Partial<TableSelectArgs>, _context, info) => {
      try {
        const { offset, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName]!, table),
          offset,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy) : undefined,
          where: where ? { RAW: (aliased: Table) => extractFilters(aliased, tableName, where) } : undefined,
          with: relationMap[tableName]
            ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, typeNameMapper)
            : undefined,
        });

        const result = await query;
        if (!result) {
          return undefined;
        }

        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError((e as any).message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateInsertArray = (
  db: MySqlDatabase<any, any, any, any>,
  _tableName: string,
  table: MySqlTable,
  baseType: GraphQLInputObjectType,
  fieldName: string,
): CreatedResolver => {
  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(baseType))),
    },
  };

  return {
    name: fieldName,
    resolver: async (_source, args: { values: Record<string, any>[] }, _context, _info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new GraphQLError('No values were provided!');
        }

        await db.insert(table).values(input);

        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateInsertSingle = (
  db: MySqlDatabase<any, any, any, any>,
  _tableName: string,
  table: MySqlTable,
  baseType: GraphQLInputObjectType,
  fieldName: string,
): CreatedResolver => {
  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(baseType),
    },
  };

  return {
    name: fieldName,
    resolver: async (_source, args: { values: Record<string, any> }, _context, _info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);

        await db.insert(table).values(input);

        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateUpdate = (
  db: MySqlDatabase<any, any, any>,
  tableName: string,
  table: MySqlTable,
  setArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  fieldName: string,
): CreatedResolver => {
  const queryArgs = {
    set: {
      type: new GraphQLNonNull(setArgs),
    },
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: fieldName,
    resolver: async (_source, args: { where?: Filters<Table>; set: Record<string, any> }, _context, _info) => {
      try {
        const { where, set } = args;

        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError('Unable to update with no values specified!');
        }

        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters) as any;
        }

        await query;

        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateDelete = (
  db: MySqlDatabase<any, any, any>,
  tableName: string,
  table: MySqlTable,
  filterArgs: GraphQLInputObjectType,
  fieldName: string,
): CreatedResolver => {
  const queryArgs = {
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: fieldName,
    resolver: async (_source, args: { where?: Filters<Table> }, _context, _info) => {
      try {
        const { where } = args;

        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters) as any;
        }

        await query;

        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

export const generateSchemaData = <
  TDrizzleInstance extends MySqlDatabase<any, any, any, any>,
  TSchema extends Record<string, Table | unknown>,
>(
  db: TDrizzleInstance,
  schema: TSchema,
  relations: TablesRelationalConfig,
  relationsDepthLimit: number | undefined,
  prefixes: MakeRequired<MakeRequired<BuildSchemaConfig>['prefixes']>,
  suffixes: MakeRequired<MakeRequired<BuildSchemaConfig>['suffixes']>,
  typeNameMapper?: TypeNameMapper,
  shouldEagerLoad: (tableName: string, relationName: string) => boolean = () => true,
): GeneratedEntities<TDrizzleInstance, TSchema> => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);

  const tableEntries = schemaEntries.filter(([_key, value]) => is(value, MySqlTable)) as [string, MySqlTable][];
  const tables = Object.fromEntries(tableEntries);

  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?",
    );
  }

  // Build namedRelations from the drizzle-orm v1 relations config.
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);
  // Pruned map for query resolvers' `with:`; type generation keeps the full map.
  const eagerRelations = pruneNonEagerRelations(namedRelations, shouldEagerLoad);

  const resolverFactory: RelationResolverFactory = createRelationResolverFactory(db, tables);

  // Fresh cache per generateSchemaData call — prevents type name collisions
  // when buildSchema() is called multiple times.
  const cacheCtx: TypeCacheCtx = {
    genericFilterCache: new Map(),
    objectTypeCache: new Map(),
    relationFieldContainers: new Map(),
    fullyBuiltTables: new Set(),
    relationTypeCache: new Map(),
    orderTypeCache: new WeakMap(),
    filterTypeCache: new WeakMap(),
  };

  const queries: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const mutations: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, _table]) => [
      tableName,
      generateTableTypes(
        tableName,
        tables,
        namedRelations,
        false,
        relationsDepthLimit,
        cacheCtx,
        typeNameMapper,
        prefixes.insert,
        prefixes.update,
        resolverFactory,
      ),
    ]),
  );

  const mutationReturnType = new GraphQLObjectType({
    name: 'MutationReturn',
    fields: {
      isSuccess: {
        type: new GraphQLNonNull(GraphQLBoolean),
      },
    },
  });

  const inputs: Record<string, GraphQLInputObjectType> = {};
  const outputs: Record<string, GraphQLObjectType> = {
    MutationReturn: mutationReturnType,
  };

  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput } = tableTypes.outputs;

    // Compute field names using the mapper logic
    const mapped = typeNameMapper?.(tableName);
    const typeName = mapped ? capitalize(mapped.singular) : capitalize(tableName);
    const listFieldName = (mapped?.plural ?? uncapitalize(tableName)) + suffixes.list;
    const singleFieldName = mapped?.singular ?? uncapitalize(tableName) + suffixes.single;
    const createArrayFieldName = `${prefixes.insert}${mapped ? capitalize(mapped.plural) : capitalize(tableName)}`;
    const createSingleFieldName = mapped
      ? `${prefixes.insert}${capitalize(mapped.singular)}`
      : `${prefixes.insert}${capitalize(tableName)}${suffixes.single}`;
    const updateFieldName = `${prefixes.update}${mapped ? capitalize(mapped.singular) : capitalize(tableName)}`;
    const deleteFieldName = `${prefixes.delete}${mapped ? capitalize(mapped.singular) : capitalize(tableName)}`;

    const selectArrGenerated = generateSelectArray(
      db,
      tableName,
      tables,
      eagerRelations,
      tableOrder,
      tableFilters,
      listFieldName,
      typeName,
      typeNameMapper,
    );
    const selectSingleGenerated = generateSelectSingle(
      db,
      tableName,
      tables,
      eagerRelations,
      tableOrder,
      tableFilters,
      singleFieldName,
      typeName,
      typeNameMapper,
    );
    const insertArrGenerated = generateInsertArray(
      db,
      tableName,
      schema[tableName] as MySqlTable,
      insertInput,
      createArrayFieldName,
    );
    const insertSingleGenerated = generateInsertSingle(
      db,
      tableName,
      schema[tableName] as MySqlTable,
      insertInput,
      createSingleFieldName,
    );
    const updateGenerated = generateUpdate(
      db,
      tableName,
      schema[tableName] as MySqlTable,
      updateInput,
      tableFilters,
      updateFieldName,
    );
    const deleteGenerated = generateDelete(
      db,
      tableName,
      schema[tableName] as MySqlTable,
      tableFilters,
      deleteFieldName,
    );

    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver,
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver,
    };
    mutations[insertArrGenerated.name] = {
      type: mutationReturnType,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver,
    };
    mutations[insertSingleGenerated.name] = {
      type: mutationReturnType,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver,
    };
    mutations[updateGenerated.name] = {
      type: mutationReturnType,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver,
    };
    mutations[deleteGenerated.name] = {
      type: mutationReturnType,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver,
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
  }

  const fieldResolvers: Record<string, Record<string, any>> = {};
  for (const [tableName, tableRelations] of Object.entries(namedRelations)) {
    const relResolvers: Record<string, any> = {};
    for (const [relName, relEntry] of Object.entries(tableRelations)) {
      const isOne = is((relEntry as any).relation ?? relEntry, One);
      const resolver = resolverFactory({ tableName, relationName: relName, relEntry, isOne });
      if (resolver) {
        relResolvers[relName] = resolver;
      }
    }
    if (Object.keys(relResolvers).length > 0) {
      fieldResolvers[tableName] = relResolvers;
    }
  }

  return { queries, mutations, inputs, types: outputs, fieldResolvers } as any;
};
