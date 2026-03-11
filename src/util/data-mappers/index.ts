// @ts-nocheck — vendored file, drizzle-orm 1.0 type compat not guaranteed
import { type Column, getTableColumns, type Table } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import type { TableNamedRelations } from '../builders/index.ts';

export const remapToGraphQLCore = (
  key: string,
  value: any,
  tableName: string,
  column: Column,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
): any => {
  // Check for relation fields BEFORE the column check.
  // Relation fields don't have corresponding table columns.
  if (Array.isArray(value)) {
    const relations = relationMap?.[tableName];
    if (relations?.[key]) {
      const rel = relations[key]!;
      return remapToGraphQLArrayOutput(
        value,
        rel.targetTableName,
        (rel.relation as any)?.targetTable ?? (rel.relation as any)?.referencedTable,
        relationMap,
      );
    }
  }

  if (typeof value === 'object' && value !== null) {
    const relations = relationMap?.[tableName];
    if (relations?.[key]) {
      const rel = relations[key]!;
      const remapped = remapToGraphQLSingleOutput(
        value,
        rel.targetTableName,
        (rel.relation as any)?.targetTable ?? (rel.relation as any)?.referencedTable,
        relationMap,
      );
      return remapped;
    }
  }

  // For non-relation fields, require a column definition.
  if (!column) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Buffer) {
    return Array.from(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    if (column.columnType === 'PgGeometry' || column.columnType === 'PgVector') {
      return value;
    }

    return value.map((arrVal) => remapToGraphQLCore(key, arrVal, tableName, column, relationMap));
  }

  if (typeof value === 'object' && value !== null) {
    if (column.columnType === 'PgGeometryObject') {
      return value;
    }

    return JSON.stringify(value);
  }

  return value;
};

export const remapToGraphQLSingleOutput = (
  queryOutput: Record<string, any>,
  tableName: string,
  table: Table,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
) => {
  for (const [key, value] of Object.entries(queryOutput)) {
    if (value === undefined || value === null) {
      delete queryOutput[key];
      continue;
    }

    const column = table[key as keyof Table] as Column | undefined;

    // SQLite blob(bigint) returns 0n for null DB values — treat as absent when nullable.
    if (value === 0n && column && (column as any).columnType === 'SQLiteBigInt' && !(column as any).notNull) {
      delete queryOutput[key];
      continue;
    }

    queryOutput[key] = remapToGraphQLCore(key, value, tableName, column!, relationMap);
  }

  return queryOutput;
};

export const remapToGraphQLArrayOutput = (
  queryOutput: Record<string, any>[],
  tableName: string,
  table: Table,
  relationMap?: Record<string, Record<string, TableNamedRelations>>,
) => {
  for (const entry of queryOutput) {
    remapToGraphQLSingleOutput(entry, tableName, table, relationMap);
  }

  return queryOutput;
};

export const remapFromGraphQLCore = (value: any, column: Column, columnName: string) => {
  // drizzle-orm v1 uses compound dataType strings (e.g. "object date", "bigint int64").
  // We must check inclusion rather than equality to handle these cases.
  const dataType: string = (column as any).dataType ?? '';

  // Timestamp/datetime columns (SQLite: "object date", MySQL timestamp/datetime: "object date").
  // Only convert string→Date for timestamp/datetime columns, NOT pure DATE columns.
  // MySqlDateString has dataType "string date" (excluded by startsWith check).
  // MySqlDate has columnType "MySqlDate" — excluded below since it can accept raw strings.
  const columnType: string = (column as any).columnType ?? '';
  const isTimestampColumn =
    columnType === 'SQLiteTimestamp' ||
    columnType === 'SQLiteTimestampMs' ||
    columnType === 'MySqlTimestamp' ||
    columnType === 'MySqlDateTime' ||
    columnType === 'PgTimestamp' ||
    columnType === 'PgTimestampString';
  if (isTimestampColumn) {
    const formatted = new Date(value);
    if (Number.isNaN(formatted.getTime())) {
      throw new GraphQLError(`Field '${columnName}' is not a valid date!`);
    }

    return formatted;
  }

  // Date-only columns (no time component) — extract YYYY-MM-DD portion to avoid
  // timezone shifts when mysql2 formats Date objects using local time.
  const isDateOnlyColumn = columnType === 'MySqlDate' || columnType === 'PgDate';
  if (isDateOnlyColumn && typeof value === 'string') {
    // Accept ISO strings like "2024-04-04T00:00:00.000Z" or plain "2024-04-04"
    const dateOnly = value.includes('T') ? value.split('T')[0] : value;
    // Validate it's a real date by parsing
    const check = new Date(dateOnly!);
    if (Number.isNaN(check.getTime())) {
      throw new GraphQLError(`Field '${columnName}' is not a valid date!`);
    }

    return dateOnly;
  }

  // BigInt columns (SQLite: "bigint int64", others: "bigint").
  if (dataType.includes('bigint')) {
    try {
      return BigInt(value);
    } catch {
      throw new GraphQLError(`Field '${columnName}' is not a BigInt!`);
    }
  }

  // JSON columns (SQLite: "object json", PG: "json").
  // PgGeometryObject is already handled by the switch case below.
  if (dataType.includes('json') && (column as any).columnType !== 'PgGeometryObject') {
    if (typeof value !== 'string') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new GraphQLError(
        `Invalid JSON in field '${columnName}':\n${e instanceof Error ? e.message : 'Unknown error'}`,
      );
    }
  }

  switch (dataType) {
    case 'date': {
      const formatted = new Date(value);
      if (Number.isNaN(formatted.getTime())) {
        throw new GraphQLError(`Field '${columnName}' is not a valid date!`);
      }

      return formatted;
    }

    case 'buffer': {
      if (!Array.isArray(value)) {
        throw new GraphQLError(`Field '${columnName}' is not an array!`);
      }

      return Buffer.from(value);
    }

    case 'json': {
      if (column.columnType === 'PgGeometryObject') {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch (e) {
        throw new GraphQLError(
          `Invalid JSON in field '${columnName}':\n${e instanceof Error ? e.message : 'Unknown error'}`,
        );
      }
    }

    case 'array': {
      if (!Array.isArray(value)) {
        throw new GraphQLError(`Field '${columnName}' is not an array!`);
      }

      if (column.columnType === 'PgGeometry' && value.length !== 2) {
        throw new GraphQLError(
          `Invalid float tuple in field '${columnName}': expected array with length of 2, received ${value.length}`,
        );
      }

      return value;
    }

    case 'bigint': {
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

export const remapFromGraphQLSingleInput = (queryInput: Record<string, any>, table: Table) => {
  for (const [key, value] of Object.entries(queryInput)) {
    if (value === undefined) {
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

export const remapFromGraphQLArrayInput = (queryInput: Record<string, any>[], table: Table) => {
  for (const entry of queryInput) {
    remapFromGraphQLSingleInput(entry, table);
  }

  return queryInput;
};
