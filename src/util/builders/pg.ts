// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import {
  is,
  Relation,
  Table,
  type View,
} from 'drizzle-orm';
import type { RelationalQueryBuilder } from 'drizzle-orm/mysql-core/query-builders/query';
import { type PgAsyncDatabase, type PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
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
} from '../builders/common.ts';
import {
  capitalize,
  cleanTableName,
  tableNameToModel,
} from '../case-ops/index.ts';
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
import {GraphQLBoolean} from 'graphql';

const generateSelectArray = (
  db: PgAsyncDatabase<any, any, any>,
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  orderArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  listSuffix: string,
): CreatedResolver => {
  const queryName = `${cleanTableName(tableName)}${listSuffix}`;
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

  const typeName = `${tableNameToModel(tableName)}`;
  const table = tables[tableName]!;

  return {
    name: queryName,
    resolver: async (source, args: Partial<TableSelectArgs>, context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;

        const parsedInfo = parseResolveInfo(info, {
          deep: true,
        }) as ResolveTree;

        const withParams = relationMap[tableName]
          ? extractRelationsParams(
              relationMap,
              tables,
              tableName,
              parsedInfo,
              typeName,
            )
          : undefined;

        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(
            parsedInfo.fieldsByTypeName[typeName]!,
            table,
          ) 
          /*extractSelectedColumnsFromNode(tableSelection, info.fragments, table) */,
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
          // d0, d1) — use it directly so column refs match the CTE alias.
          orderBy: orderBy
            ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy)
            : undefined,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : undefined,
          with: withParams,
        });

        const result = await query;

        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if(e instanceof Error) {
          console.trace(e)
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
  singleSuffix: string,
): CreatedResolver => {

  const queryName = `${cleanTableName(tableName)}${singleSuffix}`;
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

  const typeName = `${tableNameToModel(tableName)}`;
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
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
          // d0, d1) — use it directly so column refs match the CTE alias.
          orderBy: orderBy
            ? (aliasedTable: Table) => extractOrderBy(aliasedTable, orderBy)
            : undefined,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : undefined,
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
        if(e instanceof Error) {
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

const generateInsertArray = (
  db: PgAsyncDatabase<any, any, any>,
  tableName: string,
  table: PgTable,
  baseType: GraphQLInputObjectType,
  prefix: string,
): CreatedResolver => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}`;

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

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
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
        if(e instanceof Error) {
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
  baseType: GraphQLInputObjectType,
  prefix: string,
): CreatedResolver => {
  const queryName = `${prefix}${tableNameToModel(tableName)}`;
  const typeName = `${tableNameToModel(tableName)}`;

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

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
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
        if(e instanceof Error) {
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
  setArgs: GraphQLInputObjectType,
  filterArgs: GraphQLInputObjectType,
  prefix: string,
): CreatedResolver => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = `${tableNameToModel(tableName)}`;

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

        const columns = extractSelectedColumnsFromTreeSQLFormat<PgColumn>(
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
        if(e instanceof Error) {
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
  prefix: string,
): CreatedResolver => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = `${tableNameToModel(tableName)}`;

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
        if(e instanceof Error) {
          throw new GraphQLError(e.message);
        }

        throw e;
      }
    },
    args: queryArgs,
  };
};

type SchemaEntry = Table<any> | View<string, boolean, any>;
interface TableRelationalConfig {
  table: SchemaEntry;
  name: string;
  relations: Record<string, Relation<string>>;
}
type TablesRelationalConfig = Record<string, TableRelationalConfig>;


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
): GeneratedEntities<TDrizzleInstance, TSchema>  {
  const schemaEntries = Object.entries(schema);
  const tableEntries = schemaEntries.filter(([key, value]) =>
    is(value, PgTable),
  ) as [string, PgTable][];
  const tables = Object.fromEntries(tableEntries) as Record<string, PgTable>;

  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?",
    );
  }

  const queries: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const mutations: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, table]) => [
      tableName,
      generateTableTypes(
        tableName,
        tables,
        relations,
        true,
        relationsDepthLimit,
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
      relations,
      tableOrder,
      tableFilters,
      suffixes.list,
    );
    const selectSingleGenerated = generateSelectSingle(
      db,
      tableName,
      tables,
      relations,
      tableOrder,
      tableFilters,
      suffixes.single,
    );
    const insertArrGenerated = generateInsertArray(
      db,
      tableName,
      schema[tableName] as PgTable,
      insertInput,
      prefixes.insert,
    );
    const insertSingleGenerated = generateInsertSingle(
      db,
      tableName,
      schema[tableName] as PgTable,
      insertInput,
      prefixes.insert,
    );
    const updateGenerated = generateUpdate(
      db,
      tableName,
      schema[tableName] as PgTable,
      updateInput,
      tableFilters,
      prefixes.update,
    );
    const deleteGenerated = generateDelete(
      db,
      tableName,
      schema[tableName] as PgTable,
      tableFilters,
      prefixes.delete,
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
      (e) => (inputs[e.name] = e),
    );
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }

  return { queries, mutations, inputs, types: outputs } as any;
};
