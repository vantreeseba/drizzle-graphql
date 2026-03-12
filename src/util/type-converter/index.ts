import type { Column, Table } from 'drizzle-orm';
import { extractExtendedColumnType, getColumns, is } from 'drizzle-orm';
import { MySqlInt, MySqlSerial } from 'drizzle-orm/mysql-core';
import { PgDate, PgDateString, PgInteger, PgSerial, PgTimestamp, PgTimestampString } from 'drizzle-orm/pg-core';
import { SQLiteInteger } from 'drizzle-orm/sqlite-core';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars';
import type { TableNamedRelations } from '../builders/types.ts';
import { capitalize } from '../case-ops/index.ts';
import type { ConvertedColumn } from './types.ts';

const allowedNameChars = /^[a-zA-Z0-9_]+$/;

const enumMap = new WeakMap<Object, GraphQLEnumType>();
const generateEnumCached = (column: Column, columnName: string, tableName: string): GraphQLEnumType => {
  if (enumMap.has(column)) {
    return enumMap.get(column)!;
  }

  const gqlEnum = new GraphQLEnumType({
    name: `${capitalize(tableName)}${capitalize(columnName)}Enum`,
    values: Object.fromEntries(
      column.enumValues!.map((e, index) => [
        allowedNameChars.test(e) ? e : `Option${index}`,
        {
          value: e,
          description: `Value: ${e}`,
        },
      ]),
    ),
  });

  enumMap.set(column, gqlEnum);

  return gqlEnum;
};

const geoXyType = new GraphQLObjectType({
  name: 'PgGeometryObject',
  fields: {
    x: { type: GraphQLFloat },
    y: { type: GraphQLFloat },
  },
});

const geoXyInputType = new GraphQLInputObjectType({
  name: 'PgGeometryObjectInput',
  fields: {
    x: { type: GraphQLFloat },
    y: { type: GraphQLFloat },
  },
});

const columnToGraphQLCore = (
  column: Column,
  columnName: string,
  tableName: string,
  isInput: boolean,
): ConvertedColumn<boolean> => {
  const { type: baseType } = extractExtendedColumnType(column);
  switch (baseType) {
    case 'boolean':
      return { type: GraphQLBoolean, description: 'Boolean' };
    case 'object':
      if (column instanceof PgTimestamp || column instanceof PgDate) {
        return { type: GraphQLDateTime, description: 'DateTime' };
      }
      return column.columnType === 'PgGeometryObject'
        ? {
            type: isInput ? geoXyInputType : geoXyType,
            description: 'Geometry points XY',
          }
        : column.columnType === 'PgBytea'
          ? {
              type: new GraphQLList(new GraphQLNonNull(GraphQLInt)),
              description: 'Buffer',
            }
          : { type: GraphQLString, description: 'JSON' };
    case 'string':
      if (column.enumValues?.length) {
        return { type: generateEnumCached(column, columnName, tableName) };
      }

      if (column instanceof PgTimestamp || column instanceof PgTimestampString) {
        return { type: GraphQLDateTime, description: 'DateTime' };
      }
      if (column instanceof PgDateString) {
        // For input, accept any string (drivers truncate ISO timestamps to date on write).
        // For output, keep the strict GraphQLDate scalar so the returned value is validated.
        return isInput ? { type: GraphQLString, description: 'Date' } : { type: GraphQLDate, description: 'Date' };
      }

      return { type: GraphQLString, description: 'String' };
    case 'bigint':
      return { type: GraphQLString, description: 'BigInt' };
    case 'number': {
      // integer().array() columns keep columnType=PgInteger but gain a `dimensions` property.
      // drizzle-orm's extractExtendedColumnType still returns 'number' for them, so we
      // detect the array wrapper here and recurse with a synthetic base-int scalar.
      const dims = (column as any).dimensions as number | undefined;
      if (dims !== undefined && dims > 0) {
        const baseDesc = is(column, PgInteger) || is(column, PgSerial) ? 'Integer' : 'Float';
        const baseType = baseDesc === 'Integer' ? GraphQLInt : GraphQLFloat;
        return {
          type: new GraphQLList(new GraphQLNonNull(baseType)),
          description: `Array<${baseDesc}>`,
        };
      }
      return is(column, PgInteger) ||
        is(column, PgSerial) ||
        is(column, MySqlInt) ||
        is(column, MySqlSerial) ||
        is(column, SQLiteInteger)
        ? { type: GraphQLInt, description: 'Integer' }
        : { type: GraphQLFloat, description: 'Float' };
    }
    case 'array': {
      if (column.columnType === 'PgVector') {
        return {
          type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
          description: 'Array<Float>',
        };
      }

      if (column.columnType === 'PgGeometry') {
        return {
          type: new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
          description: 'Tuple<[Float, Float]>',
        };
      }

      const innerType = columnToGraphQLCore(
        (column as unknown as { baseColumn: Column }).baseColumn,
        columnName,
        tableName,
        isInput,
      );

      return {
        type: new GraphQLList(new GraphQLNonNull(innerType.type as GraphQLScalarType)),
        description: `Array<${innerType.description}>`,
      };
    }
    default:
      throw new Error(`Drizzle-GraphQL Error: Type ${column.dataType} is not implemented!`);
  }
};

export const drizzleRelationToGraphQLInsertType = (tables: Record<string, Table>, relationMap: TableNamedRelations) => {
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
        drizzleColumnToGraphQLType(columnDescription, columnName, tableName, false, true, true),
      ]),
    );
  }

  //   const typeDesc = columnToGraphQLCore(column, columnName, tableName, isInput);
  //   const noDesc = ['string', 'boolean', 'number'];
  //   const { type: baseType } = extractExtendedColumnType(column);
  //   if (noDesc.find((e) => e === baseType)) delete typeDesc.description;
  //
  //   if (forceNullable) return typeDesc as ConvertedColumn<TIsInput>;
  //   if (
  //     column.notNull &&
  //     !(defaultIsNullable && (column.hasDefault || column.defaultFn))
  //   ) {
  //     return {
  //       type: new GraphQLNonNull(typeDesc.type),
  //       description: typeDesc.description,
  //     } as ConvertedColumn<TIsInput>;
  //   }
  //
  //   return typeDesc as ConvertedColumn<TIsInput>;
};

export const drizzleColumnToGraphQLType = <TColumn extends Column, TIsInput extends boolean>(
  column: TColumn,
  columnName: string,
  tableName: string,
  forceNullable = false,
  defaultIsNullable = false,
  isInput: TIsInput = false as TIsInput,
): ConvertedColumn<TIsInput> => {
  const typeDesc = columnToGraphQLCore(column, columnName, tableName, isInput);
  const noDesc = ['string', 'boolean', 'number'];
  const { type: baseType } = extractExtendedColumnType(column);
  if (noDesc.find((e) => e === baseType)) {
    delete typeDesc.description;
  }

  if (forceNullable) {
    return typeDesc as ConvertedColumn<TIsInput>;
  }
  if (column.notNull && !(defaultIsNullable && (column.hasDefault || column.defaultFn))) {
    return {
      type: new GraphQLNonNull(typeDesc.type),
      description: typeDesc.description,
    } as ConvertedColumn<TIsInput>;
  }

  return typeDesc as ConvertedColumn<TIsInput>;
};
