// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import {
  is,
  type Relation,
  type Table,
} from 'drizzle-orm';
import type { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';
import {
  type BaseSQLiteDatabase,
  type SQLiteColumn,
  SQLiteTable,
} from 'drizzle-orm/sqlite-core';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLResolveInfo,
  ThunkObjMap,
} from 'graphql';
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

import type {
  BuildSchemaConfig,
  GeneratedEntities,
  MakeRequired,
} from '../../types.ts';
import {
  extractFilters,
  extractOrderBy,
  extractRelationsParams,
  extractSelectedColumnsFromTree,
  extractSelectedColumnsFromTreeSQLFormat,
  generateTableTypes,
  type TypeCacheCtx,
} from '../builders/common.ts';
import { capitalize, uncapitalize } from '../case-ops/index.ts';
import {
  remapFromGraphQLArrayInput,
  remapFromGraphQLSingleInput,
  remapToGraphQLArrayOutput,
  remapToGraphQLSingleOutput,
} from '../data-mappers/index.ts';
import type {
  CreatedResolver,
  Filters,
  TableNamedRelations,
  TableSelectArgs,
} from './types.ts';

const generateSelectArray = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  listSuffix: string,
): CreatedResolver => {
  const queryName = `${uncapitalize(tableName)}`;
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

  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName]!;

  return {
    name: queryName,
    resolver: async (
      source: any,
      args: Partial<TableSelectArgs>,
      context: any,
      info: GraphQLResolveInfo,
    ) => {
      try {
        const { offset, limit, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          ),
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy
            ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy)
            : undefined,
          where: where
            ? { RAW: (aliased: Table) => extractFilters(aliased, tableName, where) }
            : undefined,
          with: relationMap[tableName]
            ? extractRelationsParams(
                relationMap,
                tables,
                tableName,
                parsedInfo,
                typeName,
              )
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
  singleSuffix: string,
): CreatedResolver => {
  const queryName = `${uncapitalize(tableName)}Single`;
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

  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName]!;

  return {
    name: queryName,
    resolver: async (source, args: Partial<TableSelectArgs>, context, info) => {
      try {
        const { offset, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          ),
          offset,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy
            ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy)
            : undefined,
          where: where
            ? { RAW: (aliased: Table) => extractFilters(aliased, tableName, where) }
            : undefined,
          with: relationMap[tableName]
            ? extractRelationsParams(
                relationMap,
                tables,
                tableName,
                parsedInfo,
                typeName,
              )
            : undefined,
        });

        const result = await query;
        if (!result) return undefined;

        return remapToGraphQLSingleOutput(
          result,
          tableName,
          table,
          relationMap,
        );
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

const generateInsertArray = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  baseType: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `insertInto${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(baseType))),
    },
  };

  return {
    name: queryName,
    resolver: async (
      source,
      args: { values: Record<string, any>[] },
      context,
      info,
    ) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) throw new GraphQLError('No values were provided!');

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        const result = await db
          .insert(table)
          .values(input)
          .returning(columns)
          .onConflictDoNothing();

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

const generateInsertSingle = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  baseType: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `insertInto${capitalize(tableName)}Single`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs: GraphQLFieldConfigArgumentMap = {
    values: {
      type: new GraphQLNonNull(baseType),
    },
  };

  return {
    name: queryName,
    resolver: async (
      source,
      args: { values: Record<string, any> },
      context,
      info,
    ) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );
        const result = await db
          .insert(table)
          .values(input)
          .returning(columns)
          .onConflictDoNothing();

        if (!result[0]) return undefined;

        return remapToGraphQLSingleOutput(result[0], tableName, table);
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
  setArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `update${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs = {
    set: {
      type: new GraphQLNonNull(setArgs),
    },
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: queryName,
    resolver: async (
      source,
      args: { where?: Filters<Table>; set: Record<string, any> },
      context,
      info,
    ) => {
      try {
        const { where, set } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const columns = extractSelectedColumnsFromTreeSQLFormat<SQLiteColumn>(
          parsedInfo.fieldsByTypeName[typeName]!,
          table,
        );

        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length)
          throw new GraphQLError('Unable to update with no values specified!');

        let query = db.update(table).set(input);
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

const generateDelete = (
  db: BaseSQLiteDatabase<any, any, any, any>,
  tableName: string,
  table: SQLiteTable,
  filterArgs: GraphQLInputObjectType,
): CreatedResolver => {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;

  const queryArgs = {
    where: {
      type: filterArgs,
    },
  } as const satisfies GraphQLFieldConfigArgumentMap;

  return {
    name: queryName,
    resolver: async (
      source,
      args: { where?: Filters<Table> },
      context,
      info,
    ) => {
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

/** Shape of the relational config from drizzle-orm v1 db._.relations */
interface TableRelationalConfig {
  table: Table;
  name: string;
  relations: Record<string, Relation<string>>;
}
type TablesRelationalConfig = Record<string, TableRelationalConfig>;

/**
 * Build namedRelations from drizzle-orm v1 TablesRelationalConfig.
 *
 * In drizzle-orm 1.0, db._.relations is a Record where each key is the
 * schema variable name (e.g. "Users") and the value has { table, name, relations }.
 * Each relation has a referencedTable property we can match against tableEntries.
 */
const buildNamedRelations = (
  relations: TablesRelationalConfig,
  tableEntries: [string, Table][],
): Record<string, Record<string, TableNamedRelations>> => {
  const namedRelations: Record<string, Record<string, TableNamedRelations>> = {};

  for (const [relTableName, relConfig] of Object.entries(relations)) {
    if (!relConfig?.relations) continue;

    const namedConfig: Record<string, TableNamedRelations> = {};

    for (const [innerRelName, innerRelValue] of Object.entries(relConfig.relations)) {
      // drizzle-orm v1 uses `targetTable` (not `referencedTable`)
      // and provides `targetTableName` directly.
      const targetTable = (innerRelValue as any).targetTable ?? (innerRelValue as any).referencedTable;
      const directTargetName = (innerRelValue as any).targetTableName as string | undefined;

      let targetTableName: string | undefined;

      if (directTargetName) {
        // v1: use the direct name to find the schema key
        const targetEntry = tableEntries.find(([key]) => key === directTargetName);
        targetTableName = targetEntry?.[0];
      } else if (targetTable) {
        // fallback: match by object reference
        const targetEntry = tableEntries.find(([, tableValue]) => tableValue === targetTable);
        targetTableName = targetEntry?.[0];
      }

      if (!targetTableName) continue;

      namedConfig[innerRelName] = {
        relation: innerRelValue,
        targetTableName,
      };
    }

    if (Object.keys(namedConfig).length > 0) {
      namedRelations[relTableName] = namedConfig;
    }
  }

  return namedRelations;
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
): GeneratedEntities<TDrizzleInstance, TSchema> => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);

  const tableEntries = schemaEntries.filter(([key, value]) =>
    is(value, SQLiteTable),
  ) as [string, SQLiteTable][];
  const tables = Object.fromEntries(tableEntries) as Record<
    string,
    SQLiteTable
  >;

  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?",
    );
  }

  // Build namedRelations from the drizzle-orm v1 relations config.
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);

  // Fresh cache per generateSchemaData call — prevents type name collisions
  // when buildSchema() is called multiple times.
  const cacheCtx: TypeCacheCtx = {
    genericFilterCache: new Map(),
    objectTypeCache: new Map(),
    relationTypeCache: new Map(),
  };

  const queries: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const mutations: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, table]) => [
      tableName,
      generateTableTypes(
        tableName,
        tables,
        namedRelations,
        true,
        relationsDepthLimit,
        cacheCtx,
      ),
    ]),
  );

  const inputs: Record<string, GraphQLInputObjectType> = {};
  const outputs: Record<string, GraphQLObjectType> = {};

  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } =
      tableTypes.inputs;
    const {
      selectSingleOutput,
      selectArrOutput,
      singleTableItemOutput,
      arrTableItemOutput,
    } = tableTypes.outputs;

    const selectArrGenerated = generateSelectArray(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.list,
    );
    const selectSingleGenerated = generateSelectSingle(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.single,
    );
    const insertArrGenerated = generateInsertArray(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      insertInput,
    );
    const insertSingleGenerated = generateInsertSingle(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      insertInput,
    );
    const updateGenerated = generateUpdate(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      updateInput,
      tableFilters,
    );
    const deleteGenerated = generateDelete(
      db,
      tableName,
      schema[tableName] as SQLiteTable,
      tableFilters,
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
    [insertInput, updateInput, tableFilters, tableOrder].forEach(
      (e) => { inputs[e.name] = e; },
    );
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }

  return { queries, mutations, inputs, types: outputs } as any;
};
