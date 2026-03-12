// =============================================================================
// LOCAL MODIFICATION — diverges from upstream drizzle-graphql
//
// 1. generateColumnFilterValues() rewritten to produce generic shared filter
//    types (IdFilter, StringFilter, DateTimeFilter, BooleanFilter, per-enum)
//    instead of one type per (table, column) pair.
//
// 2. Type naming follows upstream drizzle-graphql convention:
//    - Select types: ${capitalize(tableName)}SelectItem (e.g. UsersSelectItem)
//    - Relation types: ${capitalize(fromTable)}${capitalize(relName)}Relation
//    - Mutation return: ${capitalize(tableName)}Item
//    - Insert input: ${capitalize(tableName)}InsertInput
//    - Update input: ${capitalize(tableName)}UpdateInput
// =============================================================================
// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import type { Column, Relation, Table } from 'drizzle-orm';
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
import { capitalize } from '../case-ops/index.ts';
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

/**
 * Shape of the relational config from drizzle-orm v1 db._.relations.
 * Each entry has { table, name, relations }.
 */
interface TableRelationalConfig {
  table: Table;
  name: string;
  relations: Record<string, Relation<string>>;
}
export type TablesRelationalConfig = Record<string, TableRelationalConfig>;

/**
 * Flatten drizzle-orm v1 TablesRelationalConfig into the canonical
 * Record<tableName, Record<relName, TableNamedRelations>> shape used
 * throughout common.ts.  Both pg.ts and sqlite.ts call this before
 * passing the relation map to any shared function.
 */
export const buildNamedRelations = (
  relations: TablesRelationalConfig,
  tableEntries: [string, Table][],
): Record<string, Record<string, TableNamedRelations>> => {
  const namedRelations: Record<string, Record<string, TableNamedRelations>> = {};

  for (const [relTableName, relConfig] of Object.entries(relations)) {
    if (!relConfig?.relations) {
      continue;
    }

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

      if (!targetTableName) {
        continue;
      }

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

/** Per-call cache context — created fresh on each generateSchemaData call to avoid type name collisions. */
export interface TypeCacheCtx {
  /** Cache of generic filter type pairs, keyed by generic name (e.g. "String", "DateTime"). */
  genericFilterCache: Map<string, { main: GraphQLInputObjectType; or: GraphQLInputObjectType }>;
  /**
   * Cache of shared select object types, keyed by table name.
   * Value: the ${capitalize(tableName)}SelectItem type.
   */
  objectTypeCache: Map<string, GraphQLObjectType>;
  /**
   * Cache of relation types, keyed by "${fromTableName}::${relName}".
   * Value: the ${capitalize(fromTableName)}${capitalize(relName)}Relation type.
   */
  relationTypeCache: Map<string, GraphQLObjectType>;
}

export const extractSelectedColumnsFromTree = (
  tree: Record<string, ResolveTree>,
  table: Table,
): Record<string, true> => {
  const tableColumns = getColumns(table);

  const treeEntries = Object.entries(tree);
  const selectedColumns: SelectedColumnsRaw = [];

  for (const [_fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) {
      continue;
    }

    selectedColumns.push([fieldData.name, true]);
  }

  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName =
      columnKeys.find((e) => rqbCrashTypes.find((haram) => e[1].columnType !== haram))?.[0] ?? columnKeys[0]![0];

    selectedColumns.push([columnName, true]);
  }

  return Object.fromEntries(selectedColumns);
};

/**
 * Can't automatically determine column type on type level
 * Since drizzle table types extend eachother
 */
export const extractSelectedColumnsFromTreeSQLFormat = <TColType extends Column = Column>(
  tree: Record<string, ResolveTree>,
  table: Table,
): Record<string, TColType> => {
  const tableColumns = getColumns(table);

  const treeEntries = Object.entries(tree);
  const selectedColumns: SelectedSQLColumns = [];

  for (const [_fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) {
      continue;
    }

    selectedColumns.push([fieldData.name, tableColumns[fieldData.name]!]);
  }

  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName =
      columnKeys.find((e) => rqbCrashTypes.find((haram) => e[1].columnType !== haram))?.[0] ?? columnKeys[0]![0];

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
 * - "Id"          → uuid PK/FK columns (no like/ilike operators)
 * - "DateTime"    → timestamp and date columns
 * - "Boolean"     → boolean columns
 * - the enum GraphQL type name → enum columns (still unique per enum)
 * - "IntArray"    → integer[]/serial[] array columns
 * - "FloatArray"  → float[]/numeric[] array columns
 * - "String"      → all other text/varchar columns
 */
const resolveGenericFilterName = (
  column: Column,
  columnName: string,
  columnGraphQLType: ReturnType<typeof drizzleColumnToGraphQLType>,
): string => {
  // ID / foreign-key columns
  if (columnName === 'id' || columnName.endsWith('Id')) {
    return 'Id';
  }
  // Boolean scalar
  if (columnGraphQLType.type === GraphQLBoolean) {
    return 'Boolean';
  }
  // Enum type — keep unique per enum since values differ
  if (columnGraphQLType.type instanceof GraphQLEnumType) {
    return columnGraphQLType.type.name;
  }
  // Array columns — give them a distinct name so they never collide with StringFilter.
  // integer().array() columns have a `dimensions` property set on them.
  if (columnGraphQLType.type instanceof GraphQLList) {
    const desc = (columnGraphQLType as any).description ?? '';
    return desc.includes('Integer') ? 'IntArray' : 'FloatArray';
  }
  // Date / timestamp columns (check Drizzle internal columnType string)
  const ct: string = (column as any).columnType ?? '';
  if (ct === 'PgTimestamp' || ct === 'PgTimestampString' || ct === 'PgDate') {
    return 'DateTime';
  }
  // Default: plain text/varchar
  return 'String';
};

const generateColumnFilterValues = (
  column: Column,
  tableName: string,
  columnName: string,
  cacheCtx: TypeCacheCtx,
): GraphQLInputObjectType => {
  const columnGraphQLType = drizzleColumnToGraphQLType(column, columnName, tableName, true, false, true);

  const genericName = resolveGenericFilterName(column, columnName, columnGraphQLType);
  const cached = cacheCtx.genericFilterCache.get(genericName);
  if (cached) {
    return cached.main;
  }

  const colType = columnGraphQLType.type;
  const colDesc = columnGraphQLType.description;
  const colArr = new GraphQLList(new GraphQLNonNull(colType));

  // IdFilter omits like/notLike/ilike/notIlike — they are nonsensical on UUIDs.
  const isId = genericName === 'Id';

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

  cacheCtx.genericFilterCache.set(genericName, { main: mainType, or: orType });
  return mainType;
};

const orderMap = new WeakMap<Object, Record<string, ConvertedInputColumn>>();
const generateTableOrderCached = (table: Table) => {
  if (orderMap.has(table)) {
    return orderMap.get(table)!;
  }

  let remapped = {};
  try {
    const columns = getColumns(table);
    const columnEntries = Object.entries(columns);

    remapped = Object.fromEntries(
      columnEntries.map(([columnName, _columnDescription]) => [columnName, { type: innerOrder }]),
    );

    orderMap.set(table, remapped);
  } catch (_err) {}
  return remapped;
};

const filterMap = new WeakMap<Object, Record<string, ConvertedInputColumn>>();
const generateTableFilterValuesCached = (table: Table, tableName: string, cacheCtx: TypeCacheCtx) => {
  if (filterMap.has(table)) {
    return filterMap.get(table)!;
  }

  const columns = getColumns(table);
  const columnEntries = Object.entries(columns);

  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      {
        type: generateColumnFilterValues(columnDescription, tableName, columnName, cacheCtx),
      },
    ]),
  );

  filterMap.set(table, remapped);

  return remapped;
};

const fieldMap = new WeakMap<Object, Record<string, ConvertedColumn>>();
const generateTableSelectTypeFieldsCached = (table: Table, tableName: string): Record<string, ConvertedColumn> => {
  if (fieldMap.has(table)) {
    return fieldMap.get(table)!;
  }

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
  if (orderTypeMap.has(table)) {
    return orderTypeMap.get(table)!;
  }

  const orderColumns = generateTableOrderCached(table);
  const order = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}OrderBy`,
    fields: orderColumns,
  });

  orderTypeMap.set(table, order);

  return order;
};

const filterTypeMap = new WeakMap<Object, GraphQLInputObjectType>();
const generateTableFilterTypeCached = (table: Table, tableName: string, cacheCtx: TypeCacheCtx) => {
  if (filterTypeMap.has(table)) {
    return filterTypeMap.get(table)!;
  }

  const filterColumns = generateTableFilterValuesCached(table, tableName, cacheCtx);
  const filters = new GraphQLInputObjectType({
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

/**
 * Build the select fields for a table.
 * Creates:
 * - Main select type: ${capitalize(tableName)}SelectItem (e.g. UsersSelectItem)
 * - Relation field types: ${capitalize(fromTable)}${capitalize(relName)}Relation
 *
 * The function is called recursively for relation targets.
 * Cycle detection: usedTables tracks tables currently being processed in the call stack.
 * When we see a table already in usedTables, we stop recursing (no relation fields for that type).
 */
const generateSelectFields = <TWithOrder extends boolean>(
  tables: Record<string, Table>,
  tableName: string,
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  fromTableName: string,
  fromRelationName: string,
  withOrder: TWithOrder,
  _relationsDepthLimit: number | undefined,
  cacheCtx: TypeCacheCtx,
  usedTables: Set<string> = new Set(),
): SelectData<TWithOrder> => {
  const table = tables[tableName]!;
  const order = withOrder ? generateTableOrderTypeCached(table, tableName) : undefined;
  const filters = generateTableFilterTypeCached(table, tableName, cacheCtx);
  const tableFields = generateTableSelectTypeFieldsCached(table, tableName);

  const relationsForTable = relationMap[tableName];
  const relationEntries: [string, TableNamedRelations][] = relationsForTable ? Object.entries(relationsForTable) : [];

  // If this table is already being processed (cycle), stop recursing.
  // Return just the base fields with no relation fields.
  if (usedTables.has(tableName)) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {},
    } as SelectData<TWithOrder>;
  }

  // For the root call (fromTableName === '' && fromRelationName === ''), this builds the
  // main ${capitalize(tableName)}SelectItem type.
  // For recursive calls, this builds the relation type.
  const isRootCall = fromTableName === '' && fromRelationName === '';

  // If the root type is already fully cached, return early.
  if (isRootCall && cacheCtx.objectTypeCache.has(tableName)) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {},
    } as SelectData<TWithOrder>;
  }

  let relationFields: Record<string, ConvertedRelationColumnWithArgs> = {};

  if (isRootCall) {
//     const typeName = `${capitalize(tableName)}SelectItem`;
    const typeName = `${capitalize(tableName)}`;
    // Pre-register shell with thunk BEFORE recursing to break circular refs.
    const shell = new GraphQLObjectType({
      name: typeName,
      fields: () => ({ ...tableFields, ...relationFields }),
    });
    cacheCtx.objectTypeCache.set(tableName, shell);
  }

  // Build relation fields — recurse into each related table.
  // Mark this table as in-progress before recursing to detect cycles.
  if (relationEntries.length > 0) {
    const rawRelationFields: [string, ConvertedRelationColumnWithArgs][] = [];

    // Mark this table as currently being processed.
    const nextUsedTables = new Set(usedTables);
    nextUsedTables.add(tableName);

    for (const [relationName, relEntry] of relationEntries) {
      const { targetTableName } = relEntry;
      const relation = (relEntry as any).relation ?? relEntry;
      const isOne = is(relation, One);

      // Always recurse to get the target table's filters/order (needed for args).
      // The usedTables check inside the recursive call prevents actual infinite recursion.
      const relSelectData = generateSelectFields(
        tables,
        targetTableName,
        relationMap,
        tableName, // fromTableName for the relation type
        relationName, // fromRelationName for the relation type
        !isOne,
        undefined,
        cacheCtx,
        nextUsedTables,
      );

      // Get or create the relation type.
      const relCacheKey = `${tableName}::${relationName}`;
      const relTypeName = `${capitalize(tableName)}${capitalize(relationName)}Relation`;

      let relType = cacheCtx.relationTypeCache.get(relCacheKey);
      if (!relType) {
        relType = new GraphQLObjectType({
          name: relTypeName,
          fields: { ...relSelectData.tableFields, ...relSelectData.relationFields },
        });
        cacheCtx.relationTypeCache.set(relCacheKey, relType);
      }

      if (isOne) {
        rawRelationFields.push([
          relationName,
          {
            type: relType,
            args: {
              where: { type: relSelectData.filters },
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
            where: { type: relSelectData.filters },
            orderBy: { type: relSelectData.order! },
            offset: { type: GraphQLInt },
            limit: { type: GraphQLInt },
          },
        },
      ]);
    }

    // Assign into the pre-declared variable — the thunk above will see this value.
    relationFields = Object.fromEntries(rawRelationFields);
  }

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
  cacheCtx: TypeCacheCtx,
): GeneratedTableTypes<WithReturning> => {
  const { tableFields, relationFields, filters, order } = generateSelectFields(
    tables,
    tableName,
    relationMap,
    '', // root call: no fromTableName
    '', // root call: no fromRelationName
    true,
    relationsDepthLimit,
    cacheCtx,
  );

  const table = tables[tableName]!;
  const columns = getColumns(table);
  const columnEntries = Object.entries(columns);

  const _insertNested = drizzleRelationToGraphQLInsertType(tables, relationMap[tableName] ?? {});

  const insertFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName, false, true, true),
    ]),
  );

  const updateFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName, true, false, true),
    ]),
  );

  // Insert/update input types: ${capitalize(tableName)}InsertInput / ${capitalize(tableName)}UpdateInput
  const insertInput = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}InsertInput`,
    fields: insertFields,
  });

  const updateInput = new GraphQLInputObjectType({
    name: `${capitalize(tableName)}UpdateInput`,
    fields: updateFields,
  });

  // Select type: ${capitalize(tableName)}SelectItem (with relation fields)
  // Reuse the cached shell created in generateSelectFields.
  const selectSingleOutput =
    cacheCtx.objectTypeCache.get(tableName) ??
    new GraphQLObjectType({
//       name: `${capitalize(tableName)}SelectItem`,
      name: `${capitalize(tableName)}`,
      fields: { ...tableFields, ...relationFields },
    });

  const selectArrOutput = new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(selectSingleOutput)));

  // Mutation return type: ${capitalize(tableName)}Item (table columns only, no relations)
//   const singleTableItemOutput = withReturning
//     ? new GraphQLObjectType({
//         name: `${capitalize(tableName)}`,
// //         name: `${capitalize(tableName)}Item`,
//         fields: tableFields,
//       })
//     : undefined;

  const arrTableItemOutput = withReturning
//     ? new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(singleTableItemOutput!)))
    ? new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(selectSingleOutput!)))
    : undefined;

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
          singleTableItemOutput: selectSingleOutput!,
//           singleTableItemOutput: singleTableItemOutput!,
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

export const extractOrderBy = <TTable extends Table, TArgs extends OrderByArgs<any> = OrderByArgs<TTable>>(
  table: TTable,
  orderArgs: TArgs,
): SQL[] => {
  const res = [] as SQL[];

  for (const [column, config] of Object.entries(orderArgs).sort(
    (a, b) => (b[1]?.priority ?? 0) - (a[1]?.priority ?? 0),
  )) {
    if (!config) {
      continue;
    }
    const { direction } = config;

    res.push(direction === 'asc' ? asc(getColumns(table)[column]!) : desc(getColumns(table)[column]!));
  }

  return res;
};

export const extractFiltersColumn = <TColumn extends Column>(
  column: TColumn,
  columnName: string,
  operators: FilterColumnOperators<TColumn>,
): SQL | undefined => {
  if (!operators.OR?.length) {
    delete operators.OR;
  }

  const entries = Object.entries(operators as FilterColumnOperatorsCore<TColumn>);

  if (operators.OR) {
    if (entries.length > 1) {
      throw new GraphQLError(`WHERE ${columnName}: Cannot specify both fields and 'OR' in column operators!`);
    }

    const variants = [] as SQL[];

    for (const variant of operators.OR) {
      const extracted = extractFiltersColumn(column, columnName, variant);

      if (extracted) {
        variants.push(extracted);
      }
    }

    return variants.length ? (variants.length > 1 ? or(...variants) : variants[0]) : undefined;
  }

  const variants = [] as SQL[];
  for (const [operatorName, operatorValue] of entries) {
    if (operatorValue === null || operatorValue === false) {
      continue;
    }

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

        const singleValue = remapFromGraphQLCore(operatorValue, column, columnName);
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
          throw new GraphQLError(`WHERE ${columnName}: Unable to use operator ${operatorName} with an empty array!`);
        }
        const arrayValue = (operatorValue as any[]).map((val) => remapFromGraphQLCore(val, column, columnName));

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

  return variants.length ? (variants.length > 1 ? and(...variants) : variants[0]) : undefined;
};

export const extractFilters = <TTable extends Table>(
  table: TTable,
  tableName: string,
  filters: Filters<TTable>,
): SQL | undefined => {
  if (!filters.OR?.length) {
    delete filters.OR;
  }

  const entries = Object.entries(filters as FiltersCore<TTable>);
  if (!entries.length) {
    return;
  }

  if (filters.OR) {
    if (entries.length > 1) {
      throw new GraphQLError(`WHERE ${tableName}: Cannot specify both fields and 'OR' in table filters!`);
    }

    const variants = [] as SQL[];

    for (const variant of filters.OR) {
      const extracted = extractFilters(table, tableName, variant);
      if (extracted) {
        variants.push(extracted);
      }
    }

    return variants.length ? (variants.length > 1 ? or(...variants) : variants[0]) : undefined;
  }

  const variants = [] as SQL[];
  for (const [columnName, operators] of entries) {
    if (operators === null) {
      continue;
    }

    const column = getColumns(table)[columnName]!;
    variants.push(extractFiltersColumn(column, columnName, operators)!);
  }

  return variants.length ? (variants.length > 1 ? and(...variants) : variants[0]) : undefined;
};

const extractRelationsParamsInner = (
  relationMap: Record<string, Record<string, TableNamedRelations>>,
  tables: Record<string, Table>,
  tableName: string,
  typeName: string,
  originField: ResolveTree,
  _isInitial: boolean = false,
) => {
  const relationsForTable = relationMap[tableName];
  if (!relationsForTable) {
    return undefined;
  }

  const baseField = Object.entries(originField.fieldsByTypeName).find(([key, _value]) => key === typeName)?.[1];
  if (!baseField) {
    return undefined;
  }

  const args: Record<string, Partial<ProcessedTableSelectArgs>> = {};

  for (const [relName, { targetTableName }] of Object.entries(relationsForTable)) {
    // The relation type name: ${capitalize(tableName)}${capitalize(relName)}Relation
    const relTypeName = `${capitalize(tableName)}${capitalize(relName)}Relation`;
    // Look up by field name OR by alias (when the caller uses an alias for the relation).
    // graphql-parse-resolve-info keys fieldsByTypeName entries by alias.
    const field = baseField[relName] ?? Object.values(baseField).find((f) => (f as ResolveTree).name === relName);
    if (!field) {
      continue;
    }
    const relField = (field as ResolveTree)?.fieldsByTypeName;
    const relFieldSelection = relField?.[relTypeName];

    // Guard: if the relation type is not in fieldsByTypeName, this field is
    // either an aliased scalar column (not an actual relation) or the relation
    // was not selected in the query. Skip it in both cases.
    if (!relFieldSelection) {
      continue;
    }

    const columns = extractSelectedColumnsFromTree(relFieldSelection, tables[targetTableName]!);

    const thisRecord: Partial<ProcessedTableSelectArgs> = {};
    thisRecord.columns = columns;

    const relationField = Object.values(baseField).find((e) => e.name === relName);
    const relationArgs: Partial<TableSelectArgs> | undefined = relationField?.args;

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
      ? extractRelationsParamsInner(relationMap, tables, targetTableName, relTypeName, relationField)
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
  if (!info) {
    return undefined;
  }

  return extractRelationsParamsInner(relationMap, tables, tableName, typeName, info, true);
};
