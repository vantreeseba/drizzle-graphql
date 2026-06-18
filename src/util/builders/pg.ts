// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import { is, One, type Table, type View } from 'drizzle-orm';
import type { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';
import { getTableConfig, type PgAsyncDatabase, type PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, ThunkObjMap } from 'graphql';
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
  db: PgAsyncDatabase<any, any, any>,
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
  // Tables without relations won't have db.query support — fall back to basic select.

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

        const selectedColumns = extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName]!, table);

        let result: any[];
        if (queryBase) {
          const withParams = relationMap[tableName]
            ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, typeNameMapper)
            : undefined;

          result = await queryBase.findMany({
            columns: selectedColumns,
            offset,
            limit,
            // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
            // d0, d1) — use it directly so column refs match the CTE alias.
            orderBy: orderBy ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy) : undefined,
            where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : undefined,
            with: withParams,
          });
        } else {
          // Fallback for tables without relational query builder support.
          // Use SQL column objects (not Record<string,true>) so db.select() receives valid expressions.
          const selectedColumnsSql = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          );
          let q = db.select(selectedColumnsSql).from(table);
          if (where) {
            q = q.where(extractFilters(table, tableName, where)) as any;
          }
          if (orderBy) {
            q = q.orderBy(...extractOrderBy(table, orderBy)) as any;
          }
          if (offset) {
            q = q.offset(offset) as any;
          }
          if (limit) {
            q = q.limit(limit) as any;
          }
          result = await q;
        }

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
  db: PgAsyncDatabase<any, any, any>,
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
  // Tables without relations won't have db.query support — fall back to basic select.

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

        const selectedColumns = extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName]!, table);

        let result: any;
        if (queryBase) {
          result = await queryBase.findFirst({
            columns: selectedColumns,
            offset,
            // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
            // d0, d1) — use it directly so column refs match the CTE alias.
            orderBy: orderBy ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy) : undefined,
            where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : undefined,
            with: relationMap[tableName]
              ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, typeNameMapper)
              : undefined,
          });
        } else {
          // Fallback for tables without relational query builder support.
          const selectedColumnsSql = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          );
          let q = db.select(selectedColumnsSql).from(table);
          if (where) {
            q = q.where(extractFilters(table, tableName, where)) as any;
          }
          if (orderBy) {
            q = q.orderBy(...extractOrderBy(table, orderBy)) as any;
          }
          if (offset) {
            q = q.offset(offset) as any;
          }
          const rows = await q.limit(1);
          result = rows[0];
        }

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

/** Primary-key property names for a PG table, including table-level composite keys. */
const pgPrimaryKeyPropNames = (table: PgTable): string[] => {
  const compositePkColumnNames = getTableConfig(table).primaryKeys.flatMap((pk: any) =>
    pk.columns.map((c: any) => c.name),
  );
  return getPrimaryKeyPropNames(table, compositePkColumnNames);
};

const generateInsertArray = (
  db: PgAsyncDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  baseType: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
  conflictDoNothing: boolean = false,
): CreatedResolver => {
  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(baseType))),
    },
  };

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

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        let query = db.insert(table).values(input).returning(columns);
        if (conflictDoNothing) {
          query = query.onConflictDoNothing() as any;
        }
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
          pgPrimaryKeyPropNames(table),
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
  db: PgAsyncDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  baseType: GraphQLInputObjectType,
  fieldName: string,
  typeName: string,
  typeNameMapper?: TypeNameMapper,
  conflictDoNothing: boolean = false,
): CreatedResolver => {
  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(baseType),
    },
  };

  return {
    name: fieldName,
    resolver: async (_source, args: { values: Record<string, any> }, _context, info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        let query = db.insert(table).values(input).returning(columns);
        if (conflictDoNothing) {
          query = query.onConflictDoNothing() as any;
        }
        const result = await query;

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
          pgPrimaryKeyPropNames(table),
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
  db: PgAsyncDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
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

  return {
    name: fieldName,
    resolver: async (_source, args: { where?: Filters<Table>; set: Record<string, any> }, _context, info) => {
      try {
        const { where, set } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
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
          pgPrimaryKeyPropNames(table),
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
  db: PgAsyncDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
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

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
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

type SchemaEntry = Table<any> | View<string, boolean, any>;

export function generateSchemaData<
  TDrizzleInstance extends PgAsyncDatabase<any, any>,
  TRelations extends TablesRelationalConfig,
  TSchema extends Record<string, SchemaEntry>,
>(
  db: TDrizzleInstance,
  schema: TSchema,
  relations: TRelations,
  relationsDepthLimit: number | undefined,
  prefixes: MakeRequired<MakeRequired<BuildSchemaConfig>['prefixes']>,
  suffixes: MakeRequired<MakeRequired<BuildSchemaConfig>['suffixes']>,
  conflictDoNothing: boolean = false,
  typeNameMapper?: TypeNameMapper,
): GeneratedEntities<TDrizzleInstance, TSchema> {
  const schemaEntries = Object.entries(schema);
  const tableEntries = schemaEntries.filter(([_key, value]) => is(value, PgTable)) as [string, PgTable][];
  const tables = Object.fromEntries(tableEntries) as Record<string, PgTable>;

  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?",
    );
  }

  // Flatten drizzle-orm v1 TablesRelationalConfig into the canonical shape
  // used throughout common.ts: Record<tableName, Record<relName, TableNamedRelations>>
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);

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
      namedRelations,
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
      namedRelations,
      tableOrder,
      tableFilters,
      singleFieldName,
      typeName,
      typeNameMapper,
    );
    const insertArrGenerated = generateInsertArray(
      db,
      tableName,
      schema[tableName] as PgTable,
      tables,
      namedRelations,
      insertInput,
      createArrayFieldName,
      typeName,
      typeNameMapper,
      conflictDoNothing,
    );
    const insertSingleGenerated = generateInsertSingle(
      db,
      tableName,
      schema[tableName] as PgTable,
      tables,
      namedRelations,
      insertInput,
      createSingleFieldName,
      typeName,
      typeNameMapper,
      conflictDoNothing,
    );
    const updateGenerated = generateUpdate(
      db,
      tableName,
      schema[tableName] as PgTable,
      tables,
      namedRelations,
      updateInput,
      tableFilters,
      updateFieldName,
      typeName,
      typeNameMapper,
    );
    const deleteGenerated = generateDelete(
      db,
      tableName,
      schema[tableName] as PgTable,
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
}
