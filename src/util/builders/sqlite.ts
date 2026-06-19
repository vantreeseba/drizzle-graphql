// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import { is, One, type Table } from 'drizzle-orm';
import type { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';
import { type BaseSQLiteDatabase, getTableConfig, type SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLResolveInfo, ThunkObjMap } from 'graphql';
import {
  GraphQLError,
  type GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
} from 'graphql';
import type { ResolveTree } from 'graphql-parse-resolve-info';
import { parseResolveInfo } from 'graphql-parse-resolve-info';

import type { BuildSchemaConfig, GeneratedEntities, MakeRequired } from '../../types.ts';
import {
  buildNamedRelations,
  createRelationResolverFactory,
  eagerLoadMutationRelations,
  extractFilters,
  extractOrderBy,
  extractRelationsParams,
  extractSelectedColumnsFromTree,
  extractSelectedColumnsFromTreeSQLFormat,
  generateTableTypes,
  getPrimaryKeyPropNames,
  pruneNonEagerRelations,
  type RelationResolverFactory,
  type TablesRelationalConfig,
  type TypeCacheCtx,
  type TypeNameMapper,
  withPrimaryKeyColumns,
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
  db: BaseSQLiteDatabase<any, any, any, any>,
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
    resolver: async (_source: any, args: Partial<TableSelectArgs>, _context: any, info: GraphQLResolveInfo) => {
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
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateSelectSingle = (
  db: BaseSQLiteDatabase<any, any, any, any>,
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
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

/** Primary-key property names for a SQLite table, including table-level composite keys. */
const sqlitePrimaryKeyPropNames = (table: SQLiteTable): string[] => {
  const compositePkColumnNames = getTableConfig(table).primaryKeys.flatMap((pk: any) =>
    pk.columns.map((c: any) => c.name),
  );
  return getPrimaryKeyPropNames(table, compositePkColumnNames);
};

const generateInsertArray = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  baseType: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
): CreatedResolver => {
  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(baseType))),
    },
  };

  // Primary-key prop names are constant per table — derive them once at build time
  // rather than re-running getTableConfig on every mutation request.
  const pkNames = sqlitePrimaryKeyPropNames(table);

  return {
    name: fieldName,
    resolver: async (_source, args: { values: Record<string, any>[] }, _context, info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new GraphQLError('No values were provided!');
        }

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = withPrimaryKeyColumns(
          extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(parsedInfo.fieldsByTypeName[typeName]!, table),
          table,
          pkNames,
        );

        const result = await db.insert(table).values(input).returning(columns).onConflictDoNothing();

        const enriched = await eagerLoadMutationRelations(
          db,
          tableName,
          table,
          tables,
          relationMap,
          typeName,
          typeNameMapper,
          parsedInfo,
          result,
          pkNames,
        );

        return remapToGraphQLArrayOutput(enriched, tableName, table, relationMap);
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
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  baseType: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
): CreatedResolver => {
  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(baseType),
    },
  };

  // Derived once at build time — PK prop names don't change per request.
  const pkNames = sqlitePrimaryKeyPropNames(table);

  return {
    name: fieldName,
    resolver: async (_source, args: { values: Record<string, any> }, _context, info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = withPrimaryKeyColumns(
          extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(parsedInfo.fieldsByTypeName[typeName]!, table),
          table,
          pkNames,
        );
        const result = await db.insert(table).values(input).returning(columns).onConflictDoNothing();

        if (!result[0]) {
          return undefined;
        }

        const enriched = await eagerLoadMutationRelations(
          db,
          tableName,
          table,
          tables,
          relationMap,
          typeName,
          typeNameMapper,
          parsedInfo,
          result,
          pkNames,
        );

        return remapToGraphQLSingleOutput(enriched[0], tableName, table, relationMap);
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
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  setArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
): CreatedResolver => {
  const queryArgs = {
    set: {
      type: new GraphQLNonNull(setArgs),
    },
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  // Derived once at build time — PK prop names don't change per request.
  const pkNames = sqlitePrimaryKeyPropNames(table);

  return {
    name: fieldName,
    resolver: async (_source, args: { where?: Filters<Table>; set: Record<string, any> }, _context, info) => {
      try {
        const { where, set } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = withPrimaryKeyColumns(
          extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(parsedInfo.fieldsByTypeName[typeName]!, table),
          table,
          pkNames,
        );

        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError('Unable to update with no values specified!');
        }

        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters) as any;
        }

        query = query.returning(columns) as any;

        const result = await query;

        const enriched = await eagerLoadMutationRelations(
          db,
          tableName,
          table,
          tables,
          relationMap,
          typeName,
          typeNameMapper,
          parsedInfo,
          result,
          pkNames,
        );

        return remapToGraphQLArrayOutput(enriched, tableName, table, relationMap);
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
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  filterArgs: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
): CreatedResolver => {
  const queryArgs = {
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: fieldName,
    resolver: async (_source, args: { where?: Filters<Table> }, _context, info) => {
      try {
        const { where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters) as any;
        }

        query = query.returning(columns) as any;

        const result = await query;

        return remapToGraphQLArrayOutput(result, tableName, table);
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
  TDrizzleInstance extends BaseSQLiteDatabase<any, any, any, any>,
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

  const tableEntries = schemaEntries.filter(([_key, value]) => is(value, SQLiteTable)) as [string, SQLiteTable][];
  const tables = Object.fromEntries(tableEntries) as Record<string, SQLiteTable>;

  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?",
    );
  }

  // Build namedRelations from the drizzle-orm v1 relations config.
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);
  // Pruned map for query/mutation resolvers' `with:`; type generation keeps the full map.
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
        true,
        relationsDepthLimit,
        cacheCtx,
        typeNameMapper,
        prefixes.insert,
        prefixes.update,
        resolverFactory,
      ),
    ]),
  );

  const inputs: Record<string, GraphQLInputObjectType> = {};
  const outputs: Record<string, GraphQLObjectType> = {};

  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput, singleTableItemOutput, arrTableItemOutput } = tableTypes.outputs;

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
      schema[tableName] as SQLiteTable,
      tables,
      eagerRelations,
      insertInput,
      createArrayFieldName,
      typeName,
      typeNameMapper,
    );
    const insertSingleGenerated = generateInsertSingle(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      tables,
      eagerRelations,
      insertInput,
      createSingleFieldName,
      typeName,
      typeNameMapper,
    );
    const updateGenerated = generateUpdate(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      tables,
      eagerRelations,
      updateInput,
      tableFilters,
      updateFieldName,
      typeName,
      typeNameMapper,
    );
    const deleteGenerated = generateDelete(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      tableFilters,
      deleteFieldName,
      typeName,
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
      type: arrTableItemOutput,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver,
    };
    mutations[insertSingleGenerated.name] = {
      type: singleTableItemOutput,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver,
    };
    mutations[updateGenerated.name] = {
      type: arrTableItemOutput,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver,
    };
    mutations[deleteGenerated.name] = {
      type: arrTableItemOutput,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver,
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
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
