// =============================================================================
// LOCAL MODIFICATION — diverges from upstream drizzle-graphql
//
// 1. generateColumnFilterValues() rewritten to produce generic shared filter
//    types (IdFilter, StringFilter, DateTimeFilter, BooleanFilter, per-enum)
//    instead of one type per (table, column) pair.
//
// 2. generateSelectFields() rewritten to produce one shared GraphQLObjectType
//    per table (e.g. Person, Activity) reused across all relation fields,
//    instead of path-concatenated types (ActivityPersonRelation, etc.).
//    extractRelationsParamsInner() updated to match the flattened type names.
// =============================================================================
// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import type { Column, Table } from 'drizzle-orm';
import {
  and,
  asc,
  desc,
  eq,
  getColumns,
  gt,
  gte,
  ilike,
  inArray,
  is,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notIlike,
  notInArray,
  notLike,
  One,
  or,
  type SQL,
} from 'drizzle-orm';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLError,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import type { ResolveTree } from 'graphql-parse-resolve-info';
import { capitalize, tableNameToModel } from '../case-ops/index.ts';
import { remapFromGraphQLCore } from '../data-mappers/index.ts';
import { drizzleColumnToGraphQLType, drizzleRelationToGraphQLInsertType } from '../type-converter/index.ts';
import type {
  ConvertedColumn,
  ConvertedInputColumn,
  ConvertedRelationColumnWithArgs,
} from '../type-converter/types.ts';
import type {
  FilterColumnOperators,
  FilterColumnOperatorsCore,
  Filters,
  FiltersCore,
  GeneratedTableTypes,
  GeneratedTableTypesOutputs,
  OrderByArgs,
  ProcessedTableSelectArgs,
  SelectData,
  SelectedColumnsRaw,
  SelectedSQLColumns,
  TableNamedRelations,
  TableSelectArgs,
} from './types.ts';

const rqbCrashTypes = ['SQLiteBigInt', 'SQLiteBlobJson', 'SQLiteBlobBuffer'];

/** Cache of generic filter type pairs, keyed by generic name (e.g. "String", "DateTime"). */
const genericFilterCache = new Map<
  string,
  { main: GraphQLInputObjectType; or: GraphQLInputObjectType }
>();

/** Cache of shared object types, keyed by table name. One type per table, reused everywhere. */
const objectTypeCache = new Map<string, GraphQLObjectType>();

export const extractSelectedColumnsFromTree = (
  tree: Record<string, ResolveTree>,
  table: Table,
): Record<string, true> => {
  const tableColumns = getColumns(table);

  const treeEntries = Object.entries(tree);
  const selectedColumns: SelectedColumnsRaw = [];

  for (const [fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) continue;

    selectedColumns.push([fieldData.name, true]);
  }

  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName =
      columnKeys.find((e) =>
        rqbCrashTypes.find((haram) => e[1].columnType !== haram),
      )?.[0] ?? columnKeys[0]![0];

    selectedColumns.push([columnName, true]);
  }

  return Object.fromEntries(selectedColumns);
};

/**
 * Can't automatically determine column type on type level
 * Since drizzle table types extend eachother
 */
export const extractSelectedColumnsFromTreeSQLFormat = <
  TColType extends Column = Column,
>(
  tree: Record<string, ResolveTree>,
  table: Table,
): Record<string, TColType> => {
  const tableColumns = getColumns(table);

  const treeEntries = Object.entries(tree);
  const selectedColumns: SelectedSQLColumns = [];

  for (const [fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) continue;

    selectedColumns.push([fieldData.name, tableColumns[fieldData.name]!]);
  }

  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName =
      columnKeys.find((e) =>
        rqbCrashTypes.find((haram) => e[1].columnType !== haram),
      )?.[0] ?? columnKeys[0]![0];

    selectedColumns.push([columnName, tableColumns[columnName]!]);
  }

  return Object.fromEntries(selectedColumns) as Record<string, TColType>;
};

export const innerOrder = new GraphQLInputObjectType({
  name: 'InnerOrder' as const,
  fields: {
    direction: {
      type: new GraphQLNonNull(
        new GraphQLEnumType({
          name: 'OrderDirection',
          description: 'Order by direction',
          values: {
            asc: {
              value: 'asc',
              description: 'Ascending order',
            },
            desc: {
              value: 'desc',
              description: 'Descending order',
            },
          },
        }),
      ),
    },
    priority: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'Priority of current field',
    },
  } as const,
});

/**
 * Maps a Drizzle column to the generic filter type name to use.
 * - "Id"       → uuid PK/FK columns (no like/ilike operators)
 * - "DateTime" → timestamp and date columns
 * - "Boolean"  → boolean columns
 * - the enum GraphQL type name → enum columns (still unique per enum)
 * - "String"   → all other text/varchar columns
 */
const resolveGenericFilterName = (
  column: Column,
  columnName: string,
  columnGraphQLType: ReturnType<typeof drizzleColumnToGraphQLType>,
): string => {
  // ID / foreign-key columns
  if (columnName === "id" || columnName.endsWith("Id")) return "Id";
  // Boolean scalar
  if (columnGraphQLType.type === GraphQLBoolean) return "Boolean";
  // Enum type — keep unique per enum since values differ
  if (columnGraphQLType.type instanceof GraphQLEnumType)
    return columnGraphQLType.type.name;
  // Date / timestamp columns (check Drizzle internal columnType string)
  const ct: string = (column as any).columnType ?? "";
  if (ct === "PgTimestamp" || ct === "PgTimestampString" || ct === "PgDate")
    return "DateTime";
  // Default: plain text/varchar
  return "String";
};

const generateColumnFilterValues = (
  column: Column,
  tableName: string,
  columnName: string,
): GraphQLInputObjectType => {
  const columnGraphQLType = drizzleColumnToGraphQLType(
    column,
    columnName,
    tableName,
    true,
    false,
    true,
  );

  const genericName = resolveGenericFilterName(column, columnName, columnGraphQLType);
  const cached = genericFilterCache.get(genericName);
  if (cached) return cached.main;

  const colType = columnGraphQLType.type;
  const colDesc = columnGraphQLType.description;
  const colArr = new GraphQLList(new GraphQLNonNull(colType));

  // IdFilter omits like/notLike/ilike/notIlike — they are nonsensical on UUIDs.
  const isId = genericName === "Id";

  const baseFields = {
    eq: { type: colType, description: colDesc },
    ne: { type: colType, description: colDesc },
    lt: { type: colType, description: colDesc },
    lte: { type: colType, description: colDesc },
    gt: { type: colType, description: colDesc },
    gte: { type: colType, description: colDesc },
    ...(isId
      ? {}
      : {
          like: { type: GraphQLString },
          notLike: { type: GraphQLString },
          ilike: { type: GraphQLString },
          notIlike: { type: GraphQLString },
        }),
    inArray: { type: colArr, description: `Array<${colDesc}>` },
    notInArray: { type: colArr, description: `Array<${colDesc}>` },
    isNull: { type: GraphQLBoolean },
    isNotNull: { type: GraphQLBoolean },
  };

  const orType = new GraphQLInputObjectType({
    name: `${genericName}FilterOr`,
    fields: { ...baseFields },
  });

  const mainType = new GraphQLInputObjectType({
    name: `${genericName}Filter`,
    fields: {
      ...baseFields,
      OR: {
        type: new GraphQLList(new GraphQLNonNull(orType)),
      },
    },
  });

  genericFilterCache.set(genericName, { main: mainType, or: orType });
  return mainType;
};

const orderMap = new WeakMap<Object, Record<string, ConvertedInputColumn>>();
const generateTableOrderCached = (table: Table) => {
  if (orderMap.has(table)) return orderMap.get(table)!;

  let remapped = {};
  try{
  const columns = getColumns(table);
  const columnEntries = Object.entries(columns);

  remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      { type: innerOrder },
    ]),
  );

  orderMap.set(table, remapped);

  }catch(err) {
  }
  return remapped;
};

const filterMap = new WeakMap<Object, Record<string, ConvertedInputColumn>>();
const generateTableFilterValuesCached = (table: Table, tableName: string) => {
  if (filterMap.has(table)) return filterMap.get(table)!;

  const columns = getColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      {
        type: generateColumnFilterValues(
          columnDescription,
          tableName,
          columnName,
        ),
      },
    ]),
  );

  filterMap.set(table, remapped);

  return remapped;
};

const fieldMap = new WeakMap<Object, Record<string, ConvertedColumn>>();
const generateTableSelectTypeFieldsCached = (
  table: Table,
  tableName: string,
): Record<string, ConvertedColumn> => {
  if (fieldMap.has(table)) return fieldMap.get(table)!;

  const columns = getColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName),
    ]),
  );

  fieldMap.set(table, remapped);

  return remapped;
};

const orderTypeMap = new WeakMap<Object, GraphQLInputObjectType>();
const generateTableOrderTypeCached = (table: Table, tableName: string) => {
  if (orderTypeMap.has(table)) return orderTypeMap.get(table)!;

  const orderColumns = generateTableOrderCached(table);
  const order = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}OrderBy`,
    fields: orderColumns,
  });

  orderTypeMap.set(table, order);

  return order;
};

const filterTypeMap = new WeakMap<Object, GraphQLInputObjectType>();
const generateTableFilterTypeCached = (table: Table, tableName: string) => {
  if (filterTypeMap.has(table)) return filterTypeMap.get(table)!;

  const filterColumns = generateTableFilterValuesCached(table, tableName);
  const filters: GraphQLInputObjectType = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}Filters`,
    fields: {
      ...filterColumns,
      OR: {
        type: new GraphQLList(
          new GraphQLNonNull(
            new GraphQLInputObjectType({
              name: `${capitalize(tableName)}FiltersOr`,
              fields: filterColumns,
            }),
          ),
        ),
      },
    },
  });

  filterTypeMap.set(table, filters);

  return filters;
};

const generateSelectFields = <TWithOrder extends boolean>(
  tables: Record<string, Table>,
  tableName: string,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  _typeName: string,
  withOrder: TWithOrder,
  _relationsDepthLimit: number | undefined,
  _currentDepth: number = 0,
  _usedTables: Set<string> = new Set(),
): SelectData<TWithOrder> => {
  const table = tables[tableName]!;
  const order = withOrder
    ? generateTableOrderTypeCached(table, tableName)
    : undefined;
  const filters = generateTableFilterTypeCached(table, tableName);
  const tableFields = generateTableSelectTypeFieldsCached(table, tableName);

  const relations = relationMap[tableName]?.relations;
  const relationEntries: [string, TableNamedRelations][] = relations
    ? Object.entries(relations)
    : [];

  // If already cached (cycle) or no relations, return early with no relation fields.
  if (objectTypeCache.has(tableName) || !relationEntries.length) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {},
    } as SelectData<TWithOrder>;
  }

  const typeName = tableNameToModel(tableName);

  // IMPORTANT: declare relationFields before the shell so the thunk can close over it.
  // It will be assigned after recursion below.
  let relationFields: Record<string, ConvertedRelationColumnWithArgs> = {};

  // Pre-register the shell with a thunk BEFORE recursing — breaks circular refs.
  // The thunk captures `relationFields` by reference; it is populated below.
  const shell = new GraphQLObjectType({
    name: typeName,
    fields: () => ({ ...tableFields, ...relationFields }),
  });
  objectTypeCache.set(tableName, shell);

  // Build relation fields — recurse into each related table.
  const rawRelationFields: [string, ConvertedRelationColumnWithArgs][] = [];

  for (const [relationName, relEntry] of relationEntries) {
    const { targetTableName } = relEntry;
    const relation = (relEntry as any).relation ?? relEntry;
    const isOne = is(relation, One);

    // Recurse — returns cached shell immediately if target already registered.
    const relData = generateSelectFields(
      tables,
      targetTableName,
      relationMap,
      tableNameToModel(targetTableName),
      !isOne,
      undefined,
    );

    // Get or create the type for the related table.
    const relType =
      objectTypeCache.get(targetTableName) ??
      new GraphQLObjectType({
        name: tableNameToModel(targetTableName),
        fields: { ...relData.tableFields, ...relData.relationFields },
      });

    if (isOne) {
      rawRelationFields.push([
        relationName,
        {
          type: relType,
          args: {
            where: { type: relData.filters },
          },
        },
      ]);
      continue;
    }

    rawRelationFields.push([
      relationName,
      {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(relType))),
        args: {
          where: { type: relData.filters },
          orderBy: { type: relData.order! },
          offset: { type: GraphQLInt },
          limit: { type: GraphQLInt },
        },
      },
    ]);
  }

  // Assign into the pre-declared variable — the thunk above will see this value.
  relationFields = Object.fromEntries(rawRelationFields);

  return {
    order,
    filters,
    tableFields,
    relationFields,
  } as SelectData<TWithOrder>;
};

export const generateTableTypes = <WithReturning extends boolean>(
  tableName: string,
  tables: Record<string, Table>,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  withReturning: WithReturning,
  relationsDepthLimit: number | undefined,
): GeneratedTableTypes<WithReturning> => {
  const stylizedName = tableNameToModel(tableName);
  const { tableFields, relationFields, filters, order } = generateSelectFields(
    tables,
    tableName,
    relationMap,
    stylizedName,
    true,
    relationsDepthLimit,
  );

  const table = tables[tableName]!;
  const columns = getColumns(table);
  const columnEntries = Object.entries(columns);

  const insertNested = drizzleRelationToGraphQLInsertType(tables, relationMap[tableName].relations); 

  const insertFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(
        columnDescription,
        columnName,
        tableName,
        false,
        true,
        true,
      ),
    ]),
  );

  const updateFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(
        columnDescription,
        columnName,
        tableName,
        true,
        false,
        true,
      ),
    ]),
  );

  const insertInput = new GraphQLInputObjectType({
    //     name: `${stylizedName}InsertInput`,
    name: `Create${stylizedName}Input`,
    fields: insertFields,
  });

  // Reuse the cached type from generateSelectFields so there is only ONE
  // GraphQLObjectType instance named e.g. "Person" — creating a second instance
  // with the same name would fail GraphQL schema uniqueness validation.
  const selectSingleOutput =
    objectTypeCache.get(tableName) ??
    new GraphQLObjectType({
      name: `${stylizedName}`,
      fields: { ...tableFields, ...relationFields },
    });

  const selectArrOutput = new GraphQLNonNull(
    new GraphQLList(new GraphQLNonNull(selectSingleOutput)),
  );

  //   const singleTableItemOutput = withReturning
  //     ? new GraphQLObjectType({
  //         name: `${stylizedName}`,
  // //         name: `${stylizedName}Item`,
  //         fields: tableFields,
  //       })
  //     : undefined;

  const arrTableItemOutput = withReturning
    ? new GraphQLNonNull(
        //         new GraphQLList(new GraphQLNonNull(singleTableItemOutput!)),
        new GraphQLList(new GraphQLNonNull(selectSingleOutput!)),
      )
    : undefined;

  const updateInput = new GraphQLInputObjectType({
    name: `Update${stylizedName}Input`,
    //     name: `${stylizedName}UpdateInput`,
    fields: updateFields,
  });

  const inputs = {
    insertInput,
    updateInput,
    tableOrder: order,
    tableFilters: filters,
  };

  const outputs = (
    withReturning
      ? {
          selectSingleOutput,
          selectArrOutput,
          //           singleTableItemOutput: singleTableItemOutput!,
          singleTableItemOutput: selectSingleOutput!,
          arrTableItemOutput: arrTableItemOutput!,
        }
      : {
          selectSingleOutput,
          selectArrOutput,
        }
  ) as GeneratedTableTypesOutputs<WithReturning>;

  return {
    inputs,
    outputs,
  };
};

export const extractOrderBy = <
  TTable extends Table,
  TArgs extends OrderByArgs<any> = OrderByArgs<TTable>,
>(
  table: TTable,
  orderArgs: TArgs,
): SQL[] => {
  const res = [] as SQL[];

  for (const [column, config] of Object.entries(orderArgs).sort(
    (a, b) => (b[1]?.priority ?? 0) - (a[1]?.priority ?? 0),
  )) {
    if (!config) continue;
    const { direction } = config;

    res.push(
      direction === 'asc'
        ? asc(getColumns(table)[column]!)
        : desc(getColumns(table)[column]!),
    );
  }

  return res;
};

export const extractFiltersColumn = <TColumn extends Column>(
  column: TColumn,
  columnName: string,
  operators: FilterColumnOperators<TColumn>,
): SQL | undefined => {
  if (!operators.OR?.length) delete operators.OR;

  const entries = Object.entries(
    operators as FilterColumnOperatorsCore<TColumn>,
  );

  if (operators.OR) {
    if (entries.length > 1) {
      throw new GraphQLError(
        `WHERE ${columnName}: Cannot specify both fields and 'OR' in column operators!`,
      );
    }

    const variants = [] as SQL[];

    for (const variant of operators.OR) {
      const extracted = extractFiltersColumn(column, columnName, variant);

      if (extracted) variants.push(extracted);
    }

    return variants.length
      ? variants.length > 1
        ? or(...variants)
        : variants[0]
      : undefined;
  }

  const variants = [] as SQL[];
  for (const [operatorName, operatorValue] of entries) {
    if (operatorValue === null || operatorValue === false) continue;

    let operator: ((...args: any[]) => SQL) | undefined;
    switch (operatorName as keyof FilterColumnOperatorsCore<TColumn>) {
      case 'eq':
        operator = operator ?? eq;
      case 'ne':
        operator = operator ?? ne;
      case 'gt':
        operator = operator ?? gt;
      case 'gte':
        operator = operator ?? gte;
      case 'lt':
        operator = operator ?? lt;
      case 'lte': {
        operator = operator ?? lte;

        const singleValue = remapFromGraphQLCore(
          operatorValue,
          column,
          columnName,
        );
        variants.push(operator(column, singleValue));

        break;
      }

      case 'like':
        operator = operator ?? like;
      case 'notLike':
        operator = operator ?? notLike;
      case 'ilike':
        operator = operator ?? ilike;
      case 'notIlike':
        operator = operator ?? notIlike;

        variants.push(operator(column, operatorValue as string));

        break;

      case 'inArray':
        operator = operator ?? inArray;
      case 'notInArray': {
        operator = operator ?? notInArray;

        if (!(operatorValue as any[]).length) {
          throw new GraphQLError(
            `WHERE ${columnName}: Unable to use operator ${operatorName} with an empty array!`,
          );
        }
        const arrayValue = (operatorValue as any[]).map((val) =>
          remapFromGraphQLCore(val, column, columnName),
        );

        variants.push(operator(column, arrayValue));
        break;
      }

      case 'isNull':
        operator = operator ?? isNull;
      case 'isNotNull':
        operator = operator ?? isNotNull;

        variants.push(operator(column));
    }
  }

  return variants.length
    ? variants.length > 1
      ? and(...variants)
      : variants[0]
    : undefined;
};

export const extractFilters = <TTable extends Table>(
  table: TTable,
  tableName: string,
  filters: Filters<TTable>,
): SQL | undefined => {
  if (!filters.OR?.length) delete filters.OR;

  const entries = Object.entries(filters as FiltersCore<TTable>);
  if (!entries.length) return;

  if (filters.OR) {
    if (entries.length > 1) {
      throw new GraphQLError(
        `WHERE ${tableName}: Cannot specify both fields and 'OR' in table filters!`,
      );
    }

    const variants = [] as SQL[];

    for (const variant of filters.OR) {
      const extracted = extractFilters(table, tableName, variant);
      if (extracted) variants.push(extracted);
    }

    return variants.length
      ? variants.length > 1
        ? or(...variants)
        : variants[0]
      : undefined;
  }

  const variants = [] as SQL[];
  for (const [columnName, operators] of entries) {
    if (operators === null) continue;

    const column = getColumns(table)[columnName]!;
    variants.push(extractFiltersColumn(column, columnName, operators)!);
  }

  return variants.length
    ? variants.length > 1
      ? and(...variants)
      : variants[0]
    : undefined;
};

const extractRelationsParamsInner = (
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  tables: Record<string, Table>,
  tableName: string,
  typeName: string,
  originField: ResolveTree,
  isInitial: boolean = false,
) => {
  const relations = relationMap[tableName].relations;
  if (!relations) return undefined;

  const baseField = Object.entries(originField.fieldsByTypeName).find(
    ([key, value]) => key === typeName,
  )?.[1];
  if (!baseField) return undefined;

  const args: Record<string, Partial<ProcessedTableSelectArgs>> = {};

  for (const [relName, { targetTableName }] of Object.entries(
    relations,
  )) {
    const relTypeName = tableNameToModel(targetTableName);
    const field = baseField[relName];
    if (!field) continue;
    const relField = field?.fieldsByTypeName;
    const relFieldSelection = relField?.[relTypeName];

    const columns = extractSelectedColumnsFromTree(
      relFieldSelection,
      tables[targetTableName]!,
    );

    const thisRecord: Partial<ProcessedTableSelectArgs> = {};
    thisRecord.columns = columns;

    const relationField = Object.values(baseField).find(
      (e) => e.name === relName,
    );
    const relationArgs: Partial<TableSelectArgs> | undefined =
      relationField?.args;

    const offset = relationArgs?.offset ?? undefined;
    const limit = relationArgs?.limit ?? undefined;

    // drizzle-orm v1 RQB calls both `where` and `orderBy` callbacks with an
    // aliased table proxy (e.g. d0, d1). Pass the proxy through so column
    // references in the generated SQL match the CTE alias rather than the
    // original unaliased table name.
    const relWhere = relationArgs?.where;
    thisRecord.where = relWhere
      ? { RAW: (aliasedTable: Table) => extractFilters(aliasedTable, relName, relWhere) }
      : undefined;
    thisRecord.orderBy = relationArgs?.orderBy
      ? (aliasedTable: Table) => extractOrderBy(aliasedTable, relationArgs.orderBy!)
      : undefined;
    thisRecord.offset = offset;
    thisRecord.limit = limit;

    const relWith = relationField
      ? extractRelationsParamsInner(
          relationMap,
          tables,
          targetTableName,
          relTypeName,
          relationField,
        )
      : undefined;
    thisRecord.with = relWith;

    args[relName] = thisRecord;
  }

  return args;
};

export const extractRelationsParams = (
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  tables: Record<string, Table>,
  tableName: string,
  info: ResolveTree | undefined,
  typeName: string,
): Record<string, Partial<ProcessedTableSelectArgs>> | undefined => {
  if (!info) return undefined;

  return extractRelationsParamsInner(
    relationMap,
    tables,
    tableName,
    typeName,
    info,
    true,
  );
};
