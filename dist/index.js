// src/index.ts
import { is as is6 } from "drizzle-orm";
import { MySqlDatabase } from "drizzle-orm/mysql-core";
import { PgAsyncDatabase } from "drizzle-orm/pg-core";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import {
  GraphQLObjectType as GraphQLObjectType4,
  GraphQLSchema
} from "graphql";

// src/util/builders/mysql.ts
import { is as is3 } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";
import {
  GraphQLBoolean as GraphQLBoolean3,
  GraphQLError as GraphQLError3,
  GraphQLInt as GraphQLInt3,
  GraphQLList as GraphQLList3,
  GraphQLNonNull as GraphQLNonNull3,
  GraphQLObjectType as GraphQLObjectType3
} from "graphql";
import { parseResolveInfo } from "graphql-parse-resolve-info";

// src/util/builders/common.ts
import {
  and,
  asc,
  desc,
  eq,
  getColumns as getColumns2,
  gt,
  gte,
  ilike,
  inArray,
  is as is2,
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
  or
} from "drizzle-orm";
import {
  GraphQLBoolean as GraphQLBoolean2,
  GraphQLEnumType as GraphQLEnumType2,
  GraphQLError as GraphQLError2,
  GraphQLInputObjectType as GraphQLInputObjectType2,
  GraphQLInt as GraphQLInt2,
  GraphQLList as GraphQLList2,
  GraphQLNonNull as GraphQLNonNull2,
  GraphQLObjectType as GraphQLObjectType2,
  GraphQLString as GraphQLString2
} from "graphql";

// src/util/case-ops/index.ts
import pluralize from "pluralize";
var uncapitalize = (input) => input?.length ? `${input[0].toLocaleLowerCase()}${input.length > 1 ? input.slice(1, input.length) : ""}` : input;
var capitalize = (input) => input?.length ? `${input[0].toLocaleUpperCase()}${input.length > 1 ? input.slice(1, input.length) : ""}` : input;
var singularize = (input) => pluralize.singular(input);

// src/util/data-mappers/index.ts
import { getTableColumns } from "drizzle-orm";
import { GraphQLError } from "graphql";
var remapToGraphQLCore = (key, value, tableName, column, relationMap) => {
  if (Array.isArray(value)) {
    const relations = relationMap?.[tableName];
    if (relations?.[key]) {
      const rel = relations[key];
      return remapToGraphQLArrayOutput(
        value,
        rel.targetTableName,
        rel.relation?.targetTable ?? rel.relation?.referencedTable,
        relationMap
      );
    }
  }
  if (typeof value === "object" && value !== null) {
    const relations = relationMap?.[tableName];
    if (relations?.[key]) {
      const rel = relations[key];
      const remapped = remapToGraphQLSingleOutput(
        value,
        rel.targetTableName,
        rel.relation?.targetTable ?? rel.relation?.referencedTable,
        relationMap
      );
      return remapped;
    }
  }
  if (!column) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Buffer) {
    return Array.from(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    if (column.columnType === "PgGeometry" || column.columnType === "PgVector") {
      return value;
    }
    return value.map((arrVal) => remapToGraphQLCore(key, arrVal, tableName, column, relationMap));
  }
  if (typeof value === "object" && value !== null) {
    if (column.columnType === "PgGeometryObject") {
      return value;
    }
    return JSON.stringify(value);
  }
  return value;
};
var remapToGraphQLSingleOutput = (queryOutput, tableName, table, relationMap) => {
  for (const [key, value] of Object.entries(queryOutput)) {
    if (value === void 0 || value === null) {
      delete queryOutput[key];
      continue;
    }
    const column = table[key];
    if (value === 0n && column && column.columnType === "SQLiteBigInt" && !column.notNull) {
      delete queryOutput[key];
      continue;
    }
    queryOutput[key] = remapToGraphQLCore(key, value, tableName, column, relationMap);
  }
  return queryOutput;
};
var remapToGraphQLArrayOutput = (queryOutput, tableName, table, relationMap) => {
  for (const entry of queryOutput) {
    remapToGraphQLSingleOutput(entry, tableName, table, relationMap);
  }
  return queryOutput;
};
var remapFromGraphQLCore = (value, column, columnName) => {
  const dataType = column.dataType ?? "";
  const columnType = column.columnType ?? "";
  const isTimestampColumn = columnType === "SQLiteTimestamp" || columnType === "SQLiteTimestampMs" || columnType === "MySqlTimestamp" || columnType === "MySqlDateTime" || columnType === "PgTimestamp" || columnType === "PgTimestampString";
  if (isTimestampColumn) {
    const formatted = new Date(value);
    if (Number.isNaN(formatted.getTime())) {
      throw new GraphQLError(`Field '${columnName}' is not a valid date!`);
    }
    return formatted;
  }
  const isDateOnlyColumn = columnType === "MySqlDate" || columnType === "PgDate";
  if (isDateOnlyColumn && typeof value === "string") {
    const dateOnly = value.includes("T") ? value.split("T")[0] : value;
    const check = new Date(dateOnly);
    if (Number.isNaN(check.getTime())) {
      throw new GraphQLError(`Field '${columnName}' is not a valid date!`);
    }
    return dateOnly;
  }
  if (dataType.includes("bigint")) {
    try {
      return BigInt(value);
    } catch {
      throw new GraphQLError(`Field '${columnName}' is not a BigInt!`);
    }
  }
  if (dataType.includes("json") && column.columnType !== "PgGeometryObject") {
    if (typeof value !== "string") {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new GraphQLError(
        `Invalid JSON in field '${columnName}':
${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }
  switch (dataType) {
    case "date": {
      const formatted = new Date(value);
      if (Number.isNaN(formatted.getTime())) {
        throw new GraphQLError(`Field '${columnName}' is not a valid date!`);
      }
      return formatted;
    }
    case "buffer": {
      if (!Array.isArray(value)) {
        throw new GraphQLError(`Field '${columnName}' is not an array!`);
      }
      return Buffer.from(value);
    }
    case "json": {
      if (column.columnType === "PgGeometryObject") {
        return value;
      }
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new GraphQLError(
          `Invalid JSON in field '${columnName}':
${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
    case "array": {
      if (!Array.isArray(value)) {
        throw new GraphQLError(`Field '${columnName}' is not an array!`);
      }
      if (column.columnType === "PgGeometry" && value.length !== 2) {
        throw new GraphQLError(
          `Invalid float tuple in field '${columnName}': expected array with length of 2, received ${value.length}`
        );
      }
      return value;
    }
    case "bigint": {
      try {
        return BigInt(value);
      } catch (_error) {
        throw new GraphQLError(`Field '${columnName}' is not a BigInt!`);
      }
    }
    default: {
      return value;
    }
  }
};
var remapFromGraphQLSingleInput = (queryInput, table) => {
  for (const [key, value] of Object.entries(queryInput)) {
    if (value === void 0) {
      delete queryInput[key];
    } else {
      const column = getTableColumns(table)[key];
      if (!column) {
        throw new GraphQLError(`Unknown column: ${key}`);
      }
      if (value === null && column.notNull) {
        delete queryInput[key];
        continue;
      }
      queryInput[key] = remapFromGraphQLCore(value, column, key);
    }
  }
  return queryInput;
};
var remapFromGraphQLArrayInput = (queryInput, table) => {
  for (const entry of queryInput) {
    remapFromGraphQLSingleInput(entry, table);
  }
  return queryInput;
};

// src/util/type-converter/index.ts
import { extractExtendedColumnType, getColumns, is } from "drizzle-orm";
import { MySqlInt, MySqlSerial } from "drizzle-orm/mysql-core";
import { PgDate, PgDateString, PgInteger, PgSerial, PgTimestamp, PgTimestampString } from "drizzle-orm/pg-core";
import { SQLiteInteger } from "drizzle-orm/sqlite-core";
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from "graphql";
import { GraphQLDate, GraphQLDateTime } from "graphql-scalars";
var allowedNameChars = /^[a-zA-Z0-9_]+$/;
var enumMap = /* @__PURE__ */ new WeakMap();
var generateEnumCached = (column, columnName, tableName) => {
  if (enumMap.has(column)) {
    return enumMap.get(column);
  }
  const gqlEnum = new GraphQLEnumType({
    name: `${capitalize(tableName)}${capitalize(columnName)}Enum`,
    values: Object.fromEntries(
      column.enumValues.map((e, index) => [
        allowedNameChars.test(e) ? e : `Option${index}`,
        {
          value: e,
          description: `Value: ${e}`
        }
      ])
    )
  });
  enumMap.set(column, gqlEnum);
  return gqlEnum;
};
var geoXyType = new GraphQLObjectType({
  name: "PgGeometryObject",
  fields: {
    x: { type: GraphQLFloat },
    y: { type: GraphQLFloat }
  }
});
var geoXyInputType = new GraphQLInputObjectType({
  name: "PgGeometryObjectInput",
  fields: {
    x: { type: GraphQLFloat },
    y: { type: GraphQLFloat }
  }
});
var columnToGraphQLCore = (column, columnName, tableName, isInput) => {
  const { type: baseType } = extractExtendedColumnType(column);
  switch (baseType) {
    case "boolean":
      return { type: GraphQLBoolean, description: "Boolean" };
    case "object":
      if (column instanceof PgTimestamp || column instanceof PgDate) {
        return { type: GraphQLDateTime, description: "DateTime" };
      }
      return column.columnType === "PgGeometryObject" ? {
        type: isInput ? geoXyInputType : geoXyType,
        description: "Geometry points XY"
      } : column.columnType === "PgBytea" ? {
        type: new GraphQLList(new GraphQLNonNull(GraphQLInt)),
        description: "Buffer"
      } : { type: GraphQLString, description: "JSON" };
    case "string":
      if (column.enumValues?.length) {
        return { type: generateEnumCached(column, columnName, tableName) };
      }
      if (column instanceof PgTimestamp || column instanceof PgTimestampString) {
        return { type: GraphQLDateTime, description: "DateTime" };
      }
      if (column instanceof PgDateString) {
        return isInput ? { type: GraphQLString, description: "Date" } : { type: GraphQLDate, description: "Date" };
      }
      return { type: GraphQLString, description: "String" };
    case "bigint":
      return { type: GraphQLString, description: "BigInt" };
    case "number": {
      const dims = column.dimensions;
      if (dims !== void 0 && dims > 0) {
        const baseDesc = is(column, PgInteger) || is(column, PgSerial) ? "Integer" : "Float";
        const baseType2 = baseDesc === "Integer" ? GraphQLInt : GraphQLFloat;
        return {
          type: new GraphQLList(new GraphQLNonNull(baseType2)),
          description: `Array<${baseDesc}>`
        };
      }
      return is(column, PgInteger) || is(column, PgSerial) || is(column, MySqlInt) || is(column, MySqlSerial) || is(column, SQLiteInteger) ? { type: GraphQLInt, description: "Integer" } : { type: GraphQLFloat, description: "Float" };
    }
    case "array": {
      if (column.columnType === "PgVector") {
        return {
          type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
          description: "Array<Float>"
        };
      }
      if (column.columnType === "PgGeometry") {
        return {
          type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
          description: "Tuple<[Float, Float]>"
        };
      }
      const innerType = columnToGraphQLCore(
        column.baseColumn,
        columnName,
        tableName,
        isInput
      );
      return {
        type: new GraphQLList(new GraphQLNonNull(innerType.type)),
        description: `Array<${innerType.description}>`
      };
    }
    default:
      throw new Error(`Drizzle-GraphQL Error: Type ${column.dataType} is not implemented!`);
  }
};
var drizzleRelationToGraphQLInsertType = (tables, relationMap) => {
  if (!relationMap) {
    return null;
  }
  for (const [tableName, _val] of Object.entries(relationMap)) {
    const table = tables[tableName];
    if (!table) {
      continue;
    }
    const columns = getColumns(table);
    const columnEntries = Object.entries(columns).filter(([_key, value]) => value.primary);
    const _connectFields = Object.fromEntries(
      columnEntries.map(([columnName, columnDescription]) => [
        columnName,
        drizzleColumnToGraphQLType(columnDescription, columnName, tableName, false, true, true)
      ])
    );
  }
};
var drizzleColumnToGraphQLType = (column, columnName, tableName, forceNullable = false, defaultIsNullable = false, isInput = false) => {
  const typeDesc = columnToGraphQLCore(column, columnName, tableName, isInput);
  const noDesc = ["string", "boolean", "number"];
  const { type: baseType } = extractExtendedColumnType(column);
  if (noDesc.find((e) => e === baseType)) {
    delete typeDesc.description;
  }
  if (forceNullable) {
    return typeDesc;
  }
  if (column.notNull && !(defaultIsNullable && (column.hasDefault || column.defaultFn))) {
    return {
      type: new GraphQLNonNull(typeDesc.type),
      description: typeDesc.description
    };
  }
  return typeDesc;
};

// src/util/builders/common.ts
var rqbCrashTypes = ["SQLiteBigInt", "SQLiteBlobJson", "SQLiteBlobBuffer"];
var toTypeName = (name, singular) => singular ? capitalize(singularize(name)) : capitalize(name);
var buildNamedRelations = (relations, tableEntries) => {
  const namedRelations = {};
  for (const [relTableName, relConfig] of Object.entries(relations)) {
    if (!relConfig?.relations) {
      continue;
    }
    const namedConfig = {};
    for (const [innerRelName, innerRelValue] of Object.entries(relConfig.relations)) {
      const targetTable = innerRelValue.targetTable ?? innerRelValue.referencedTable;
      const directTargetName = innerRelValue.targetTableName;
      let targetTableName;
      if (directTargetName) {
        const targetEntry = tableEntries.find(([key]) => key === directTargetName);
        targetTableName = targetEntry?.[0];
      } else if (targetTable) {
        const targetEntry = tableEntries.find(([, tableValue]) => tableValue === targetTable);
        targetTableName = targetEntry?.[0];
      }
      if (!targetTableName) {
        continue;
      }
      namedConfig[innerRelName] = {
        relation: innerRelValue,
        targetTableName
      };
    }
    if (Object.keys(namedConfig).length > 0) {
      namedRelations[relTableName] = namedConfig;
    }
  }
  return namedRelations;
};
var extractSelectedColumnsFromTree = (tree, table) => {
  const tableColumns = getColumns2(table);
  const treeEntries = Object.entries(tree);
  const selectedColumns = [];
  for (const [_fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) {
      continue;
    }
    selectedColumns.push([fieldData.name, true]);
  }
  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName = columnKeys.find((e) => rqbCrashTypes.find((haram) => e[1].columnType !== haram))?.[0] ?? columnKeys[0][0];
    selectedColumns.push([columnName, true]);
  }
  return Object.fromEntries(selectedColumns);
};
var extractSelectedColumnsFromTreeSQLFormat = (tree, table) => {
  const tableColumns = getColumns2(table);
  const treeEntries = Object.entries(tree);
  const selectedColumns = [];
  for (const [_fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) {
      continue;
    }
    selectedColumns.push([fieldData.name, tableColumns[fieldData.name]]);
  }
  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName = columnKeys.find((e) => rqbCrashTypes.find((haram) => e[1].columnType !== haram))?.[0] ?? columnKeys[0][0];
    selectedColumns.push([columnName, tableColumns[columnName]]);
  }
  return Object.fromEntries(selectedColumns);
};
var innerOrder = new GraphQLInputObjectType2({
  name: "InnerOrder",
  fields: {
    direction: {
      type: new GraphQLNonNull2(
        new GraphQLEnumType2({
          name: "OrderDirection",
          description: "Order by direction",
          values: {
            asc: {
              value: "asc",
              description: "Ascending order"
            },
            desc: {
              value: "desc",
              description: "Descending order"
            }
          }
        })
      )
    },
    priority: {
      type: new GraphQLNonNull2(GraphQLInt2),
      description: "Priority of current field"
    }
  }
});
var resolveGenericFilterName = (column, columnName, columnGraphQLType) => {
  if (columnName === "id" || columnName.endsWith("Id")) {
    return "Id";
  }
  if (columnGraphQLType.type === GraphQLBoolean2) {
    return "Boolean";
  }
  if (columnGraphQLType.type instanceof GraphQLEnumType2) {
    return columnGraphQLType.type.name;
  }
  if (columnGraphQLType.type instanceof GraphQLList2) {
    const desc2 = columnGraphQLType.description ?? "";
    return desc2.includes("Integer") ? "IntArray" : "FloatArray";
  }
  const ct = column.columnType ?? "";
  if (ct === "PgTimestamp" || ct === "PgTimestampString" || ct === "PgDate") {
    return "DateTime";
  }
  return "String";
};
var generateColumnFilterValues = (column, tableName, columnName, cacheCtx) => {
  const columnGraphQLType = drizzleColumnToGraphQLType(column, columnName, tableName, true, false, true);
  const genericName = resolveGenericFilterName(column, columnName, columnGraphQLType);
  const cached = cacheCtx.genericFilterCache.get(genericName);
  if (cached) {
    return cached.main;
  }
  const colType = columnGraphQLType.type;
  const colDesc = columnGraphQLType.description;
  const colArr = new GraphQLList2(new GraphQLNonNull2(colType));
  const isId = genericName === "Id";
  const baseFields = {
    eq: { type: colType, description: colDesc },
    ne: { type: colType, description: colDesc },
    lt: { type: colType, description: colDesc },
    lte: { type: colType, description: colDesc },
    gt: { type: colType, description: colDesc },
    gte: { type: colType, description: colDesc },
    ...isId ? {} : {
      like: { type: GraphQLString2 },
      notLike: { type: GraphQLString2 },
      ilike: { type: GraphQLString2 },
      notIlike: { type: GraphQLString2 }
    },
    inArray: { type: colArr, description: `Array<${colDesc}>` },
    notInArray: { type: colArr, description: `Array<${colDesc}>` },
    isNull: { type: GraphQLBoolean2 },
    isNotNull: { type: GraphQLBoolean2 }
  };
  const orType = new GraphQLInputObjectType2({
    name: `${genericName}FilterOr`,
    fields: { ...baseFields }
  });
  const mainType = new GraphQLInputObjectType2({
    name: `${genericName}Filter`,
    fields: {
      ...baseFields,
      OR: {
        type: new GraphQLList2(new GraphQLNonNull2(orType))
      }
    }
  });
  cacheCtx.genericFilterCache.set(genericName, { main: mainType, or: orType });
  return mainType;
};
var orderMap = /* @__PURE__ */ new WeakMap();
var generateTableOrderCached = (table) => {
  if (orderMap.has(table)) {
    return orderMap.get(table);
  }
  let remapped = {};
  try {
    const columns = getColumns2(table);
    const columnEntries = Object.entries(columns);
    remapped = Object.fromEntries(
      columnEntries.map(([columnName, _columnDescription]) => [columnName, { type: innerOrder }])
    );
    orderMap.set(table, remapped);
  } catch (_err) {
  }
  return remapped;
};
var filterMap = /* @__PURE__ */ new WeakMap();
var generateTableFilterValuesCached = (table, tableName, cacheCtx) => {
  if (filterMap.has(table)) {
    return filterMap.get(table);
  }
  const columns = getColumns2(table);
  const columnEntries = Object.entries(columns);
  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      {
        type: generateColumnFilterValues(columnDescription, tableName, columnName, cacheCtx)
      }
    ])
  );
  filterMap.set(table, remapped);
  return remapped;
};
var fieldMap = /* @__PURE__ */ new WeakMap();
var generateTableSelectTypeFieldsCached = (table, tableName) => {
  if (fieldMap.has(table)) {
    return fieldMap.get(table);
  }
  const columns = getColumns2(table);
  const columnEntries = Object.entries(columns);
  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName)
    ])
  );
  fieldMap.set(table, remapped);
  return remapped;
};
var orderTypeMap = /* @__PURE__ */ new WeakMap();
var generateTableOrderTypeCached = (table, tableName, singularTypes) => {
  if (orderTypeMap.has(table)) {
    return orderTypeMap.get(table);
  }
  const orderColumns = generateTableOrderCached(table);
  const order = new GraphQLInputObjectType2({
    name: `${toTypeName(tableName, singularTypes)}OrderBy`,
    fields: orderColumns
  });
  orderTypeMap.set(table, order);
  return order;
};
var filterTypeMap = /* @__PURE__ */ new WeakMap();
var generateTableFilterTypeCached = (table, tableName, cacheCtx, singularTypes) => {
  if (filterTypeMap.has(table)) {
    return filterTypeMap.get(table);
  }
  const filterColumns = generateTableFilterValuesCached(table, tableName, cacheCtx);
  const filters = new GraphQLInputObjectType2({
    name: `${toTypeName(tableName, singularTypes)}Filters`,
    fields: {
      ...filterColumns,
      OR: {
        type: new GraphQLList2(
          new GraphQLNonNull2(
            new GraphQLInputObjectType2({
              name: `${toTypeName(tableName, singularTypes)}FiltersOr`,
              fields: filterColumns
            })
          )
        )
      }
    }
  });
  filterTypeMap.set(table, filters);
  return filters;
};
var generateSelectFields = (tables, tableName, relationMap, fromTableName, fromRelationName, withOrder, _relationsDepthLimit, cacheCtx, singularTypes, usedTables = /* @__PURE__ */ new Set()) => {
  const table = tables[tableName];
  const order = withOrder ? generateTableOrderTypeCached(table, tableName, singularTypes) : void 0;
  const filters = generateTableFilterTypeCached(table, tableName, cacheCtx, singularTypes);
  const tableFields = generateTableSelectTypeFieldsCached(table, tableName);
  const relationsForTable = relationMap[tableName];
  const relationEntries = relationsForTable ? Object.entries(relationsForTable) : [];
  if (usedTables.has(tableName)) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {}
    };
  }
  const isRootCall = fromTableName === "" && fromRelationName === "";
  if (isRootCall && cacheCtx.fullyBuiltTables.has(tableName)) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {}
    };
  }
  let container = cacheCtx.relationFieldContainers.get(tableName);
  if (!container) {
    container = { fields: {} };
    cacheCtx.relationFieldContainers.set(tableName, container);
  }
  if (isRootCall && !cacheCtx.objectTypeCache.has(tableName)) {
    const typeName = toTypeName(tableName, singularTypes);
    const shell = new GraphQLObjectType2({
      name: typeName,
      fields: () => ({ ...tableFields, ...container.fields })
    });
    cacheCtx.objectTypeCache.set(tableName, shell);
  }
  if (relationEntries.length > 0) {
    const rawRelationFields = [];
    const nextUsedTables = new Set(usedTables);
    nextUsedTables.add(tableName);
    for (const [relationName, relEntry] of relationEntries) {
      const { targetTableName } = relEntry;
      const relation = relEntry.relation ?? relEntry;
      const isOne = is2(relation, One);
      const relSelectData = generateSelectFields(
        tables,
        targetTableName,
        relationMap,
        tableName,
        // fromTableName for the relation type
        relationName,
        // fromRelationName for the relation type
        !isOne,
        void 0,
        cacheCtx,
        singularTypes,
        nextUsedTables
      );
      let relType = cacheCtx.objectTypeCache.get(targetTableName);
      if (!relType) {
        const targetTable = tables[targetTableName];
        const targetTableFields = generateTableSelectTypeFieldsCached(targetTable, targetTableName);
        let targetContainer = cacheCtx.relationFieldContainers.get(targetTableName);
        if (!targetContainer) {
          targetContainer = { fields: {} };
          cacheCtx.relationFieldContainers.set(targetTableName, targetContainer);
        }
        const capturedTargetContainer = targetContainer;
        relType = new GraphQLObjectType2({
          name: toTypeName(targetTableName, singularTypes),
          fields: () => ({ ...targetTableFields, ...capturedTargetContainer.fields })
        });
        cacheCtx.objectTypeCache.set(targetTableName, relType);
      }
      if (isOne) {
        rawRelationFields.push([
          relationName,
          {
            type: relType,
            args: {
              where: { type: relSelectData.filters }
            }
          }
        ]);
        continue;
      }
      rawRelationFields.push([
        relationName,
        {
          type: new GraphQLNonNull2(new GraphQLList2(new GraphQLNonNull2(relType))),
          args: {
            where: { type: relSelectData.filters },
            orderBy: { type: relSelectData.order },
            offset: { type: GraphQLInt2 },
            limit: { type: GraphQLInt2 }
          }
        }
      ]);
    }
    const builtRelationFields = Object.fromEntries(rawRelationFields);
    if (isRootCall) {
      container.fields = builtRelationFields;
      cacheCtx.fullyBuiltTables.add(tableName);
    }
    return {
      order,
      filters,
      tableFields,
      relationFields: builtRelationFields
    };
  }
  if (isRootCall) {
    cacheCtx.fullyBuiltTables.add(tableName);
  }
  return {
    order,
    filters,
    tableFields,
    relationFields: {}
  };
};
var generateTableTypes = (tableName, tables, relationMap, withReturning, relationsDepthLimit, cacheCtx, singularTypes = false, insertPrefix = "insertInto", updatePrefix = "update") => {
  const { tableFields, relationFields, filters, order } = generateSelectFields(
    tables,
    tableName,
    relationMap,
    "",
    // root call: no fromTableName
    "",
    // root call: no fromRelationName
    true,
    relationsDepthLimit,
    cacheCtx,
    singularTypes
  );
  const table = tables[tableName];
  const columns = getColumns2(table);
  const columnEntries = Object.entries(columns);
  const _insertNested = drizzleRelationToGraphQLInsertType(tables, relationMap[tableName] ?? {});
  const insertFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName, false, true, true)
    ])
  );
  const updateFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName, true, false, true)
    ])
  );
  const insertInput = new GraphQLInputObjectType2({
    name: `${capitalize(insertPrefix)}${toTypeName(tableName, singularTypes)}Input`,
    fields: insertFields
  });
  const updateInput = new GraphQLInputObjectType2({
    name: `${capitalize(updatePrefix)}${toTypeName(tableName, singularTypes)}Input`,
    fields: updateFields
  });
  const selectSingleOutput = cacheCtx.objectTypeCache.get(tableName) ?? new GraphQLObjectType2({
    name: toTypeName(tableName, singularTypes),
    fields: { ...tableFields, ...relationFields }
  });
  const selectArrOutput = new GraphQLNonNull2(new GraphQLList2(new GraphQLNonNull2(selectSingleOutput)));
  const arrTableItemOutput = withReturning ? (
    //     ? new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(singleTableItemOutput!)))
    new GraphQLNonNull2(new GraphQLList2(new GraphQLNonNull2(selectSingleOutput)))
  ) : void 0;
  const inputs = {
    insertInput,
    updateInput,
    tableOrder: order,
    tableFilters: filters
  };
  const outputs = withReturning ? {
    selectSingleOutput,
    selectArrOutput,
    singleTableItemOutput: selectSingleOutput,
    //           singleTableItemOutput: singleTableItemOutput!,
    arrTableItemOutput
  } : {
    selectSingleOutput,
    selectArrOutput
  };
  return {
    inputs,
    outputs
  };
};
var extractOrderBy = (table, orderArgs) => {
  const res = [];
  for (const [column, config] of Object.entries(orderArgs).sort(
    (a, b) => (b[1]?.priority ?? 0) - (a[1]?.priority ?? 0)
  )) {
    if (!config) {
      continue;
    }
    const { direction } = config;
    res.push(direction === "asc" ? asc(getColumns2(table)[column]) : desc(getColumns2(table)[column]));
  }
  return res;
};
var extractFiltersColumn = (column, columnName, operators) => {
  if (!operators.OR?.length) {
    delete operators.OR;
  }
  const entries = Object.entries(operators);
  if (operators.OR) {
    if (entries.length > 1) {
      throw new GraphQLError2(`WHERE ${columnName}: Cannot specify both fields and 'OR' in column operators!`);
    }
    const variants2 = [];
    for (const variant of operators.OR) {
      const extracted = extractFiltersColumn(column, columnName, variant);
      if (extracted) {
        variants2.push(extracted);
      }
    }
    return variants2.length ? variants2.length > 1 ? or(...variants2) : variants2[0] : void 0;
  }
  const variants = [];
  for (const [operatorName, operatorValue] of entries) {
    if (operatorValue === null || operatorValue === false) {
      continue;
    }
    let operator;
    switch (operatorName) {
      case "eq":
        operator = operator ?? eq;
      case "ne":
        operator = operator ?? ne;
      case "gt":
        operator = operator ?? gt;
      case "gte":
        operator = operator ?? gte;
      case "lt":
        operator = operator ?? lt;
      case "lte": {
        operator = operator ?? lte;
        const singleValue = remapFromGraphQLCore(operatorValue, column, columnName);
        variants.push(operator(column, singleValue));
        break;
      }
      case "like":
        operator = operator ?? like;
      case "notLike":
        operator = operator ?? notLike;
      case "ilike":
        operator = operator ?? ilike;
      case "notIlike":
        operator = operator ?? notIlike;
        variants.push(operator(column, operatorValue));
        break;
      case "inArray":
        operator = operator ?? inArray;
      case "notInArray": {
        operator = operator ?? notInArray;
        if (!operatorValue.length) {
          throw new GraphQLError2(`WHERE ${columnName}: Unable to use operator ${operatorName} with an empty array!`);
        }
        const arrayValue = operatorValue.map((val) => remapFromGraphQLCore(val, column, columnName));
        variants.push(operator(column, arrayValue));
        break;
      }
      case "isNull":
        operator = operator ?? isNull;
      case "isNotNull":
        operator = operator ?? isNotNull;
        variants.push(operator(column));
    }
  }
  return variants.length ? variants.length > 1 ? and(...variants) : variants[0] : void 0;
};
var extractFilters = (table, tableName, filters) => {
  if (!filters.OR?.length) {
    delete filters.OR;
  }
  const entries = Object.entries(filters);
  if (!entries.length) {
    return;
  }
  if (filters.OR) {
    if (entries.length > 1) {
      throw new GraphQLError2(`WHERE ${tableName}: Cannot specify both fields and 'OR' in table filters!`);
    }
    const variants2 = [];
    for (const variant of filters.OR) {
      const extracted = extractFilters(table, tableName, variant);
      if (extracted) {
        variants2.push(extracted);
      }
    }
    return variants2.length ? variants2.length > 1 ? or(...variants2) : variants2[0] : void 0;
  }
  const variants = [];
  for (const [columnName, operators] of entries) {
    if (operators === null) {
      continue;
    }
    const column = getColumns2(table)[columnName];
    variants.push(extractFiltersColumn(column, columnName, operators));
  }
  return variants.length ? variants.length > 1 ? and(...variants) : variants[0] : void 0;
};
var extractRelationsParamsInner = (relationMap, tables, tableName, typeName, originField, singularTypes = false, _isInitial = false) => {
  const relationsForTable = relationMap[tableName];
  if (!relationsForTable) {
    return void 0;
  }
  const baseField = Object.entries(originField.fieldsByTypeName).find(([key, _value]) => key === typeName)?.[1];
  if (!baseField) {
    return void 0;
  }
  const args = {};
  for (const [relName, { targetTableName }] of Object.entries(relationsForTable)) {
    const relTypeName = toTypeName(targetTableName, singularTypes);
    const field = baseField[relName] ?? Object.values(baseField).find((f) => f.name === relName);
    if (!field) {
      continue;
    }
    const relField = field?.fieldsByTypeName;
    const relFieldSelection = relField?.[relTypeName];
    if (!relFieldSelection) {
      continue;
    }
    const columns = extractSelectedColumnsFromTree(relFieldSelection, tables[targetTableName]);
    const thisRecord = {};
    thisRecord.columns = columns;
    const relationField = Object.values(baseField).find((e) => e.name === relName);
    const relationArgs = relationField?.args;
    const offset = relationArgs?.offset ?? void 0;
    const limit = relationArgs?.limit ?? void 0;
    const relWhere = relationArgs?.where;
    thisRecord.where = relWhere ? { RAW: (aliasedTable) => extractFilters(aliasedTable, relName, relWhere) } : void 0;
    thisRecord.orderBy = relationArgs?.orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, relationArgs.orderBy) : void 0;
    thisRecord.offset = offset;
    thisRecord.limit = limit;
    const relWith = relationField ? extractRelationsParamsInner(relationMap, tables, targetTableName, relTypeName, relationField, singularTypes) : void 0;
    thisRecord.with = relWith;
    args[relName] = thisRecord;
  }
  return args;
};
var extractRelationsParams = (relationMap, tables, tableName, info, typeName, singularTypes = false) => {
  if (!info) {
    return void 0;
  }
  return extractRelationsParamsInner(relationMap, tables, tableName, typeName, info, singularTypes, true);
};

// src/util/builders/mysql.ts
var toTypeName2 = (name, singular) => singular ? capitalize(singularize(name)) : capitalize(name);
var generateSelectArray = (db, tableName, tables, relationMap, orderArgs, filterArgs, listSuffix, singularTypes) => {
  const queryName = `${uncapitalize(tableName)}${listSuffix}`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: GraphQLInt3
    },
    limit: {
      type: GraphQLInt3
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = toTypeName2(tableName, singularTypes);
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = parseResolveInfo(info, {
          deep: true
        });
        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, singularTypes) : void 0
        });
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError3(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSelectSingle = (db, tableName, tables, relationMap, orderArgs, filterArgs, singleSuffix, singularTypes) => {
  const queryName = `${uncapitalize(tableName)}${singleSuffix}`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: GraphQLInt3
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = toTypeName2(tableName, singularTypes);
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, orderBy, where } = args;
        const parsedInfo = parseResolveInfo(info, {
          deep: true
        });
        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, singularTypes) : void 0
        });
        const result = await query;
        if (!result) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError3(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertArray = (db, tableName, table, baseType) => {
  const queryName = `insertInto${capitalize(tableName)}`;
  const queryArgs = {
    values: {
      type: new GraphQLNonNull3(new GraphQLList3(new GraphQLNonNull3(baseType)))
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new GraphQLError3("No values were provided!");
        }
        await db.insert(table).values(input);
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError3(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertSingle = (db, tableName, table, baseType) => {
  const queryName = `insertInto${capitalize(tableName)}Single`;
  const queryArgs = {
    values: {
      type: new GraphQLNonNull3(baseType)
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);
        await db.insert(table).values(input);
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError3(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateUpdate = (db, tableName, table, setArgs, filterArgs) => {
  const queryName = `update${capitalize(tableName)}`;
  const queryArgs = {
    set: {
      type: new GraphQLNonNull3(setArgs)
    },
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const { where, set } = args;
        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError3("Unable to update with no values specified!");
        }
        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        await query;
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError3(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateDelete = (db, tableName, table, filterArgs) => {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const queryArgs = {
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const { where } = args;
        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        await query;
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError3(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var buildNamedRelations2 = (relations, tableEntries) => {
  const namedRelations = {};
  for (const [relTableName, relConfig] of Object.entries(relations)) {
    if (!relConfig?.relations) {
      continue;
    }
    const namedConfig = {};
    for (const [innerRelName, innerRelValue] of Object.entries(relConfig.relations)) {
      const targetTable = innerRelValue.targetTable ?? innerRelValue.referencedTable;
      const directTargetName = innerRelValue.targetTableName;
      let targetTableName;
      if (directTargetName) {
        const targetEntry = tableEntries.find(([key]) => key === directTargetName);
        targetTableName = targetEntry?.[0];
      } else if (targetTable) {
        const targetEntry = tableEntries.find(([, tableValue]) => tableValue === targetTable);
        targetTableName = targetEntry?.[0];
      }
      if (!targetTableName) {
        continue;
      }
      namedConfig[innerRelName] = {
        relation: innerRelValue,
        targetTableName
      };
    }
    if (Object.keys(namedConfig).length > 0) {
      namedRelations[relTableName] = namedConfig;
    }
  }
  return namedRelations;
};
var generateSchemaData = (db, schema, relations, relationsDepthLimit, prefixes, suffixes, singularTypes = false) => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);
  const tableEntries = schemaEntries.filter(([_key, value]) => is3(value, MySqlTable));
  const tables = Object.fromEntries(tableEntries);
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
    );
  }
  const namedRelations = buildNamedRelations2(relations ?? {}, tableEntries);
  const cacheCtx = {
    genericFilterCache: /* @__PURE__ */ new Map(),
    objectTypeCache: /* @__PURE__ */ new Map(),
    relationFieldContainers: /* @__PURE__ */ new Map(),
    fullyBuiltTables: /* @__PURE__ */ new Set(),
    relationTypeCache: /* @__PURE__ */ new Map()
  };
  const queries = {};
  const mutations = {};
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
        singularTypes,
        prefixes.insert,
        prefixes.update
      )
    ])
  );
  const mutationReturnType = new GraphQLObjectType3({
    name: "MutationReturn",
    fields: {
      isSuccess: {
        type: new GraphQLNonNull3(GraphQLBoolean3)
      }
    }
  });
  const inputs = {};
  const outputs = {
    MutationReturn: mutationReturnType
  };
  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput } = tableTypes.outputs;
    const selectArrGenerated = generateSelectArray(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.list,
      singularTypes
    );
    const selectSingleGenerated = generateSelectSingle(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.single,
      singularTypes
    );
    const insertArrGenerated = generateInsertArray(db, tableName, schema[tableName], insertInput);
    const insertSingleGenerated = generateInsertSingle(db, tableName, schema[tableName], insertInput);
    const updateGenerated = generateUpdate(db, tableName, schema[tableName], updateInput, tableFilters);
    const deleteGenerated = generateDelete(db, tableName, schema[tableName], tableFilters);
    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver
    };
    mutations[insertArrGenerated.name] = {
      type: mutationReturnType,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver
    };
    mutations[insertSingleGenerated.name] = {
      type: mutationReturnType,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver
    };
    mutations[updateGenerated.name] = {
      type: mutationReturnType,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver
    };
    mutations[deleteGenerated.name] = {
      type: mutationReturnType,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
  }
  return { queries, mutations, inputs, types: outputs };
};

// src/util/builders/pg.ts
import { is as is4 } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import {
  GraphQLError as GraphQLError4,
  GraphQLInt as GraphQLInt4,
  GraphQLList as GraphQLList4,
  GraphQLNonNull as GraphQLNonNull4
} from "graphql";
import { parseResolveInfo as parseResolveInfo2 } from "graphql-parse-resolve-info";
var toTypeName3 = (name, singular) => singular ? capitalize(singularize(name)) : capitalize(name);
var generateSelectArray2 = (db, tableName, tables, relationMap, orderArgs, filterArgs, listSuffix, singularTypes) => {
  const queryEntityBase = uncapitalize(tableName);
  const queryName = `${queryEntityBase}`;
  const queryBase = db.query[tableName];
  const queryArgs = {
    offset: {
      type: GraphQLInt4
    },
    limit: {
      type: GraphQLInt4
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = toTypeName3(tableName, singularTypes);
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = parseResolveInfo2(info, {
          deep: true
        });
        const selectedColumns = extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table);
        let result;
        if (queryBase) {
          const withParams = relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, singularTypes) : void 0;
          result = await queryBase.findMany({
            columns: selectedColumns,
            offset,
            limit,
            // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
            // d0, d1) — use it directly so column refs match the CTE alias.
            orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
            where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
            with: withParams
          });
        } else {
          let q = db.select(selectedColumns).from(table);
          if (where) {
            q = q.where(extractFilters(table, tableName, where));
          }
          if (orderBy) {
            q = q.orderBy(...extractOrderBy(table, orderBy));
          }
          if (offset) {
            q = q.offset(offset);
          }
          if (limit) {
            q = q.limit(limit);
          }
          result = await q;
        }
        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError4(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSelectSingle2 = (db, tableName, tables, relationMap, orderArgs, filterArgs, singleSuffix, singularTypes) => {
  const queryEntityBase = singularize(uncapitalize(tableName));
  const queryName = `${queryEntityBase}`;
  const queryBase = db.query[tableName];
  const queryArgs = {
    offset: {
      type: GraphQLInt4
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = toTypeName3(tableName, singularTypes);
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, orderBy, where } = args;
        const parsedInfo = parseResolveInfo2(info, {
          deep: true
        });
        const selectedColumns = extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table);
        let result;
        if (queryBase) {
          result = await queryBase.findFirst({
            columns: selectedColumns,
            offset,
            // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
            // d0, d1) — use it directly so column refs match the CTE alias.
            orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
            where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
            with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, singularTypes) : void 0
          });
        } else {
          let q = db.select(selectedColumns).from(table);
          if (where) {
            q = q.where(extractFilters(table, tableName, where));
          }
          if (orderBy) {
            q = q.orderBy(...extractOrderBy(table, orderBy));
          }
          if (offset) {
            q = q.offset(offset);
          }
          const rows = await q.limit(1);
          result = rows[0];
        }
        if (!result) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError4(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertArray2 = (db, tableName, table, baseType, prefix, conflictDoNothing = false, singularTypes = false) => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = toTypeName3(tableName, singularTypes);
  const queryArgs = {
    values: {
      type: new GraphQLNonNull4(new GraphQLList4(new GraphQLNonNull4(baseType)))
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new GraphQLError4("No values were provided!");
        }
        const parsedInfo = parseResolveInfo2(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.insert(table).values(input).returning(columns);
        if (conflictDoNothing) {
          query = query.onConflictDoNothing();
        }
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError4(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertSingle2 = (db, tableName, table, baseType, prefix, conflictDoNothing = false, singularTypes = false) => {
  const queryEntityBase = singularize(capitalize(tableName));
  const queryName = `${prefix}${queryEntityBase}`;
  const typeName = toTypeName3(tableName, singularTypes);
  const queryArgs = {
    values: {
      type: new GraphQLNonNull4(baseType)
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);
        const parsedInfo = parseResolveInfo2(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.insert(table).values(input).returning(columns);
        if (conflictDoNothing) {
          query = query.onConflictDoNothing();
        }
        const result = await query;
        if (!result[0]) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result[0], tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError4(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateUpdate2 = (db, tableName, table, setArgs, filterArgs, prefix, singularTypes = false) => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = toTypeName3(tableName, singularTypes);
  const queryArgs = {
    set: {
      type: new GraphQLNonNull4(setArgs)
    },
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where, set } = args;
        const parsedInfo = parseResolveInfo2(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError4("Unable to update with no values specified!");
        }
        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError4(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateDelete2 = (db, tableName, table, filterArgs, prefix, singularTypes = false) => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = toTypeName3(tableName, singularTypes);
  const queryArgs = {
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where } = args;
        const parsedInfo = parseResolveInfo2(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError4(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
function generateSchemaData2(db, schema, relations, relationsDepthLimit, prefixes, suffixes, conflictDoNothing = false, singularTypes = false) {
  const schemaEntries = Object.entries(schema);
  const tableEntries = schemaEntries.filter(([_key, value]) => is4(value, PgTable));
  const tables = Object.fromEntries(tableEntries);
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
    );
  }
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);
  const cacheCtx = {
    genericFilterCache: /* @__PURE__ */ new Map(),
    objectTypeCache: /* @__PURE__ */ new Map(),
    relationFieldContainers: /* @__PURE__ */ new Map(),
    fullyBuiltTables: /* @__PURE__ */ new Set(),
    relationTypeCache: /* @__PURE__ */ new Map()
  };
  const queries = {};
  const mutations = {};
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
        singularTypes,
        prefixes.insert,
        prefixes.update
      )
    ])
  );
  const inputs = {};
  const outputs = {};
  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput, singleTableItemOutput, arrTableItemOutput } = tableTypes.outputs;
    const selectArrGenerated = generateSelectArray2(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.list,
      singularTypes
    );
    const selectSingleGenerated = generateSelectSingle2(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.single,
      singularTypes
    );
    const insertArrGenerated = generateInsertArray2(
      db,
      tableName,
      schema[tableName],
      insertInput,
      prefixes.insert,
      conflictDoNothing,
      singularTypes
    );
    const insertSingleGenerated = generateInsertSingle2(
      db,
      tableName,
      schema[tableName],
      insertInput,
      prefixes.insert,
      conflictDoNothing,
      singularTypes
    );
    const updateGenerated = generateUpdate2(
      db,
      tableName,
      schema[tableName],
      updateInput,
      tableFilters,
      prefixes.update,
      singularTypes
    );
    const deleteGenerated = generateDelete2(
      db,
      tableName,
      schema[tableName],
      tableFilters,
      prefixes.delete,
      singularTypes
    );
    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver
    };
    mutations[insertArrGenerated.name] = {
      type: arrTableItemOutput,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver
    };
    mutations[insertSingleGenerated.name] = {
      type: singleTableItemOutput,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver
    };
    mutations[updateGenerated.name] = {
      type: arrTableItemOutput,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver
    };
    mutations[deleteGenerated.name] = {
      type: arrTableItemOutput,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }
  return { queries, mutations, inputs, types: outputs };
}

// src/util/builders/sqlite.ts
import { is as is5 } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  GraphQLError as GraphQLError5,
  GraphQLInt as GraphQLInt5,
  GraphQLList as GraphQLList5,
  GraphQLNonNull as GraphQLNonNull5
} from "graphql";
import { parseResolveInfo as parseResolveInfo3 } from "graphql-parse-resolve-info";
var toTypeName4 = (name, singular) => singular ? capitalize(singularize(name)) : capitalize(name);
var generateSelectArray3 = (db, tableName, tables, relationMap, orderArgs, filterArgs, _listSuffix, singularTypes) => {
  const queryName = `${uncapitalize(tableName)}`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: GraphQLInt5
    },
    limit: {
      type: GraphQLInt5
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = toTypeName4(tableName, singularTypes);
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = parseResolveInfo3(info, {
          deep: true
        });
        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, singularTypes) : void 0
        });
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError5(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSelectSingle3 = (db, tableName, tables, relationMap, orderArgs, filterArgs, _singleSuffix, singularTypes) => {
  const queryName = `${uncapitalize(tableName)}Single`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: GraphQLInt5
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = toTypeName4(tableName, singularTypes);
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, orderBy, where } = args;
        const parsedInfo = parseResolveInfo3(info, {
          deep: true
        });
        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName, singularTypes) : void 0
        });
        const result = await query;
        if (!result) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError5(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertArray3 = (db, tableName, table, baseType, singularTypes = false) => {
  const queryName = `insertInto${capitalize(tableName)}`;
  const typeName = toTypeName4(tableName, singularTypes);
  const queryArgs = {
    values: {
      type: new GraphQLNonNull5(new GraphQLList5(new GraphQLNonNull5(baseType)))
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new GraphQLError5("No values were provided!");
        }
        const parsedInfo = parseResolveInfo3(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const result = await db.insert(table).values(input).returning(columns).onConflictDoNothing();
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError5(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertSingle3 = (db, tableName, table, baseType, singularTypes = false) => {
  const queryName = `insertInto${capitalize(tableName)}Single`;
  const typeName = toTypeName4(tableName, singularTypes);
  const queryArgs = {
    values: {
      type: new GraphQLNonNull5(baseType)
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);
        const parsedInfo = parseResolveInfo3(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const result = await db.insert(table).values(input).returning(columns).onConflictDoNothing();
        if (!result[0]) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result[0], tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError5(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateUpdate3 = (db, tableName, table, setArgs, filterArgs, singularTypes = false) => {
  const queryName = `update${capitalize(tableName)}`;
  const typeName = toTypeName4(tableName, singularTypes);
  const queryArgs = {
    set: {
      type: new GraphQLNonNull5(setArgs)
    },
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where, set } = args;
        const parsedInfo = parseResolveInfo3(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new GraphQLError5("Unable to update with no values specified!");
        }
        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError5(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateDelete3 = (db, tableName, table, filterArgs, singularTypes = false) => {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const typeName = toTypeName4(tableName, singularTypes);
  const queryArgs = {
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where } = args;
        const parsedInfo = parseResolveInfo3(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new GraphQLError5(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSchemaData3 = (db, schema, relations, relationsDepthLimit, prefixes, suffixes, singularTypes = false) => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);
  const tableEntries = schemaEntries.filter(([_key, value]) => is5(value, SQLiteTable));
  const tables = Object.fromEntries(tableEntries);
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
    );
  }
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);
  const cacheCtx = {
    genericFilterCache: /* @__PURE__ */ new Map(),
    objectTypeCache: /* @__PURE__ */ new Map(),
    relationFieldContainers: /* @__PURE__ */ new Map(),
    fullyBuiltTables: /* @__PURE__ */ new Set(),
    relationTypeCache: /* @__PURE__ */ new Map()
  };
  const queries = {};
  const mutations = {};
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
        singularTypes,
        prefixes.insert,
        prefixes.update
      )
    ])
  );
  const inputs = {};
  const outputs = {};
  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput, singleTableItemOutput, arrTableItemOutput } = tableTypes.outputs;
    const selectArrGenerated = generateSelectArray3(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.list,
      singularTypes
    );
    const selectSingleGenerated = generateSelectSingle3(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.single,
      singularTypes
    );
    const insertArrGenerated = generateInsertArray3(
      db,
      tableName,
      schema[tableName],
      insertInput,
      singularTypes
    );
    const insertSingleGenerated = generateInsertSingle3(
      db,
      tableName,
      schema[tableName],
      insertInput,
      singularTypes
    );
    const updateGenerated = generateUpdate3(
      db,
      tableName,
      schema[tableName],
      updateInput,
      tableFilters,
      singularTypes
    );
    const deleteGenerated = generateDelete3(
      db,
      tableName,
      schema[tableName],
      tableFilters,
      singularTypes
    );
    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver
    };
    mutations[insertArrGenerated.name] = {
      type: arrTableItemOutput,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver
    };
    mutations[insertSingleGenerated.name] = {
      type: singleTableItemOutput,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver
    };
    mutations[updateGenerated.name] = {
      type: arrTableItemOutput,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver
    };
    mutations[deleteGenerated.name] = {
      type: arrTableItemOutput,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }
  return { queries, mutations, inputs, types: outputs };
};

// src/index.ts
var buildSchema = (db, config) => {
  const schema = db._.fullSchema;
  const relations = db._.relations;
  if (!schema) {
    throw new Error(
      "Drizzle-GraphQL Error: Schema not found in drizzle instance. Make sure you're using drizzle-orm v0.30.9 or above and schema is passed to drizzle constructor!"
    );
  }
  const prefixes = {
    insert: config?.prefixes?.insert ?? "insertInto",
    delete: config?.prefixes?.delete ?? "deleteFrom",
    update: config?.prefixes?.update ?? "update"
  };
  const suffixes = {
    list: config?.suffixes?.list ?? "",
    single: config?.suffixes?.single ?? "Single"
  };
  const singularTypes = config?.singularTypes ?? false;
  if (typeof config?.relationsDepthLimit === "number") {
    if (config.relationsDepthLimit < 0) {
      throw new Error(
        "Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!"
      );
    }
    if (config.relationsDepthLimit !== ~~config.relationsDepthLimit) {
      throw new Error(
        "Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!"
      );
    }
    if (suffixes.list === suffixes.single) {
      throw new Error(
        "Drizzle-GraphQL Error: List and single query suffixes cannot be the same. This would create conflicting GraphQL field names."
      );
    }
  }
  let generatorOutput;
  if (is6(db, MySqlDatabase)) {
    generatorOutput = generateSchemaData(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      singularTypes
    );
  } else if (is6(db, PgAsyncDatabase)) {
    generatorOutput = generateSchemaData2(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      config?.conflictDoNothing ?? false,
      singularTypes
    );
  } else if (is6(db, BaseSQLiteDatabase)) {
    generatorOutput = generateSchemaData3(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      singularTypes
    );
  } else {
    throw new Error("Drizzle-GraphQL Error: Unknown database instance type");
  }
  const { queries, mutations, inputs, types } = generatorOutput;
  const graphQLSchemaConfig = {
    types: [...Object.values(inputs), ...Object.values(types)],
    query: new GraphQLObjectType4({
      name: "Query",
      fields: queries
    })
  };
  if (config?.mutations !== false) {
    const mutation = new GraphQLObjectType4({
      name: "Mutation",
      fields: mutations
    });
    graphQLSchemaConfig.mutation = mutation;
  }
  const outputSchema = new GraphQLSchema(graphQLSchemaConfig);
  return { schema: outputSchema, entities: generatorOutput };
};
export {
  buildSchema
};
//# sourceMappingURL=index.js.map