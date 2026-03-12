import { Table, Column, Relation, One, Many } from 'drizzle-orm';
import { MySqlDatabase } from 'drizzle-orm/mysql-core';
import { PgAsyncDatabase } from 'drizzle-orm/pg-core';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { GraphQLResolveInfo, GraphQLSchema, GraphQLInputObjectType, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLScalarType } from 'graphql';

type ColTypeIsNull<TColumn extends Column, TColType> = TColumn['_']['notNull'] extends true ? TColType : TColType | null;
type ColTypeIsNullOrUndefinedWithDefault<TColumn extends Column, TColType> = TColumn['_']['notNull'] extends true ? TColumn['_']['hasDefault'] extends true ? TColType | null | undefined : TColumn['defaultFn'] extends undefined ? TColType : TColType | null | undefined : TColType | null | undefined;
type GetColumnGqlDataType<TColumn extends Column> = TColumn['dataType'] extends 'boolean' ? ColTypeIsNull<TColumn, boolean> : TColumn['dataType'] extends 'json' ? TColumn['_']['columnType'] extends 'PgGeometryObject' ? ColTypeIsNull<TColumn, {
    x: number;
    y: number;
}> : ColTypeIsNull<TColumn, string> : TColumn['dataType'] extends 'date' | 'string' | 'bigint' ? TColumn['enumValues'] extends [string, ...string[]] ? ColTypeIsNull<TColumn, TColumn['enumValues'][number]> : ColTypeIsNull<TColumn, string> : TColumn['dataType'] extends 'number' ? ColTypeIsNull<TColumn, number> : TColumn['dataType'] extends 'buffer' ? ColTypeIsNull<TColumn, number[]> : TColumn['dataType'] extends 'array' ? TColumn['columnType'] extends 'PgVector' ? ColTypeIsNull<TColumn, number[]> : TColumn['columnType'] extends 'PgGeometry' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, [number, number]> : ColTypeIsNull<TColumn, Array<GetColumnGqlDataType<TColumn extends {
    baseColumn: Column;
} ? TColumn['baseColumn'] : never> extends infer InnerColType ? InnerColType extends null | undefined ? never : InnerColType : never>> : never;
type GetColumnGqlInsertDataType<TColumn extends Column> = TColumn['dataType'] extends 'boolean' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, boolean> : TColumn['dataType'] extends 'json' ? TColumn['_']['columnType'] extends 'PgGeometryObject' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, {
    x: number;
    y: number;
}> : ColTypeIsNullOrUndefinedWithDefault<TColumn, string> : TColumn['dataType'] extends 'date' | 'string' | 'bigint' ? TColumn['enumValues'] extends [string, ...string[]] ? ColTypeIsNullOrUndefinedWithDefault<TColumn, TColumn['enumValues'][number]> : ColTypeIsNullOrUndefinedWithDefault<TColumn, string> : TColumn['dataType'] extends 'number' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, number> : TColumn['dataType'] extends 'buffer' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, number[]> : TColumn['dataType'] extends 'array' ? TColumn['columnType'] extends 'PgVector' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, number[]> : TColumn['columnType'] extends 'PgGeometry' ? ColTypeIsNullOrUndefinedWithDefault<TColumn, [number, number]> : ColTypeIsNullOrUndefinedWithDefault<TColumn, Array<GetColumnGqlDataType<TColumn extends {
    baseColumn: Column;
} ? TColumn['baseColumn'] : never> extends infer InnerColType ? InnerColType extends null | undefined ? never : InnerColType : never>> : never;
type GetColumnGqlUpdateDataType<TColumn extends Column> = TColumn['dataType'] extends 'boolean' ? boolean | null | undefined : TColumn['dataType'] extends 'json' ? TColumn['_']['columnType'] extends 'PgGeometryObject' ? {
    x: number;
    y: number;
} | null | undefined : string | null | undefined : TColumn['dataType'] extends 'date' | 'string' | 'bigint' ? TColumn['enumValues'] extends [string, ...string[]] ? TColumn['enumValues'][number] | null | undefined : string | null | undefined : TColumn['dataType'] extends 'number' ? number | null | undefined : TColumn['dataType'] extends 'buffer' ? number[] | null | undefined : TColumn['dataType'] extends 'array' ? TColumn['columnType'] extends 'PgVector' ? number[] | null | undefined : TColumn['columnType'] extends 'PgGeometry' ? [number, number] | null | undefined : Array<GetColumnGqlDataType<TColumn extends {
    baseColumn: Column;
} ? TColumn['baseColumn'] : never> extends infer InnerColType ? InnerColType extends null | undefined ? never : InnerColType : never> | null | undefined : never;
type GetRemappedTableDataType<TTable extends Table, TColumns extends TTable['_']['columns'] = TTable['_']['columns']> = {
    [K in keyof TColumns]: GetColumnGqlDataType<TColumns[K]>;
};
type GetRemappedTableInsertDataType<TTable extends Table> = {
    [K in keyof TTable['_']['columns']]: GetColumnGqlInsertDataType<TTable['_']['columns'][K]>;
};
type GetRemappedTableUpdateDataType<TTable extends Table> = {
    [K in keyof TTable['_']['columns']]: GetColumnGqlUpdateDataType<TTable['_']['columns'][K]>;
};
type FilterColumnOperatorsCore<TColumn extends Column, TColType = GetColumnGqlDataType<TColumn>> = Partial<{
    eq: TColType;
    ne: TColType;
    lt: TColType;
    lte: TColType;
    gt: TColType;
    gte: TColType;
    like: string;
    notLike: string;
    ilike: string;
    notIlike: string;
    inArray: Array<TColType>;
    notInArray: Array<TColType>;
    isNull: boolean;
    isNotNull: boolean;
}>;
type FiltersCore<TTable extends Table> = Partial<{
    [Column in keyof TTable['_']['columns']]: FilterColumnOperatorsCore<TTable['_']['columns'][Column]>;
}>;
type Filters<TTable extends Table, TFilterType = FiltersCore<TTable>> = TFilterType & {
    OR?: TFilterType[];
};
type OrderByArgs<TTable extends Table> = {
    [Key in keyof TTable['_']['columns']]?: {
        direction: 'asc' | 'desc';
        priority: number;
    };
};

type Relations<TTable extends string = string, TConfig extends Record<string, Relation> = Record<string, Relation>> = {
    table: {
        _: {
            name: TTable;
        };
    };
    config: (helpers: unknown) => TConfig;
};

type AnyDrizzleDB<TSchema extends Record<string, any>> = PgAsyncDatabase<any, TSchema> | BaseSQLiteDatabase<any, any, TSchema> | MySqlDatabase<any, any, TSchema>;
type ExtractTables<TSchema extends Record<string, Table | unknown>> = {
    [K in keyof TSchema as TSchema[K] extends Table ? K : never]: TSchema[K] extends Table ? TSchema[K] : never;
};
type ExtractRelations<TSchema extends Record<string, Table | unknown>> = {
    [K in keyof TSchema as TSchema[K] extends Relations ? K : never]: TSchema[K] extends Relations ? TSchema[K] : never;
};
type ExtractTableRelations<TTable extends Table, TSchemaRelations extends Record<string, Relations>> = {
    [K in keyof TSchemaRelations as TSchemaRelations[K]['table']['_']['name'] extends TTable['_']['name'] ? K : never]: TSchemaRelations[K]['table']['_']['name'] extends TTable['_']['name'] ? TSchemaRelations[K] extends Relations<any, infer RelationConfig> ? RelationConfig : never : never;
};
type ExtractTableByName<TTableSchema extends Record<string, Table>, TName extends string> = {
    [K in keyof TTableSchema as TTableSchema[K]['_']['name'] extends TName ? K : never]: TTableSchema[K]['_']['name'] extends TName ? TTableSchema[K] : never;
};
type MutationReturnlessResult = {
    isSuccess: boolean;
};
type QueryArgs<TTable extends Table, isSingle extends boolean> = Partial<(isSingle extends true ? {
    offset: number;
} : {
    offset: number;
    limit: number;
}) & {
    where: Filters<TTable>;
    orderBy: OrderByArgs<TTable>;
}>;
type InsertArgs<TTable extends Table, isSingle extends boolean> = isSingle extends true ? {
    values: GetRemappedTableInsertDataType<TTable>;
} : {
    values: Array<GetRemappedTableInsertDataType<TTable>>;
};
type UpdateArgs<TTable extends Table> = Partial<{
    set: GetRemappedTableUpdateDataType<TTable>;
    where?: Filters<TTable>;
}>;
type DeleteArgs<TTable extends Table> = {
    where?: Filters<TTable>;
};
type SelectResolver<TTable extends Table, TTables extends Record<string, Table>, TRelations extends Record<string, Relation>> = (source: any, args: Partial<QueryArgs<TTable, false>>, context: any, info: GraphQLResolveInfo) => Promise<keyof TRelations extends infer RelKey ? RelKey extends string ? Array<GetRemappedTableDataType<TTable> & {
    [K in RelKey]: TRelations[K] extends One<string> ? GetRemappedTableDataType<ExtractTableByName<TTables, TRelations[K]['referencedTableName']> extends infer T ? T[keyof T] : never> | null : TRelations[K] extends Many<string> ? Array<GetRemappedTableDataType<ExtractTableByName<TTables, TRelations[K]['referencedTableName']> extends infer T ? T[keyof T] : never>> : never;
}> : Array<GetRemappedTableDataType<TTable>> : Array<GetRemappedTableDataType<TTable>>>;
type SelectSingleResolver<TTable extends Table, TTables extends Record<string, Table>, TRelations extends Record<string, Relation>> = (source: any, args: Partial<QueryArgs<TTable, true>>, context: any, info: GraphQLResolveInfo) => Promise<(keyof TRelations extends infer RelKey ? RelKey extends string ? GetRemappedTableDataType<TTable> & {
    [K in RelKey]: TRelations[K] extends One<string> ? GetRemappedTableDataType<ExtractTableByName<TTables, TRelations[K]['referencedTableName']> extends infer T ? T[keyof T] : never> | null : TRelations[K] extends Many<string> ? Array<GetRemappedTableDataType<ExtractTableByName<TTables, TRelations[K]['referencedTableName']> extends infer T ? T[keyof T] : never>> : never;
} : GetRemappedTableDataType<TTable> : GetRemappedTableDataType<TTable>) | null>;
type InsertResolver<TTable extends Table, IsReturnless extends boolean> = (source: any, args: Partial<InsertArgs<TTable, false>>, context: any, info: GraphQLResolveInfo) => Promise<IsReturnless extends false ? Array<GetRemappedTableDataType<TTable>> : MutationReturnlessResult>;
type InsertArrResolver<TTable extends Table, IsReturnless extends boolean> = (source: any, args: Partial<InsertArgs<TTable, true>>, context: any, info: GraphQLResolveInfo) => Promise<IsReturnless extends false ? GetRemappedTableDataType<TTable> | undefined : MutationReturnlessResult>;
type UpdateResolver<TTable extends Table, IsReturnless extends boolean> = (source: any, args: UpdateArgs<TTable>, context: any, info: GraphQLResolveInfo) => Promise<IsReturnless extends false ? GetRemappedTableDataType<TTable> | undefined : MutationReturnlessResult>;
type DeleteResolver<TTable extends Table, IsReturnless extends boolean> = (source: any, args: DeleteArgs<TTable>, context: any, info: GraphQLResolveInfo) => Promise<IsReturnless extends false ? GetRemappedTableDataType<TTable> | undefined : MutationReturnlessResult>;
type QueriesCore<TSchemaTables extends Record<string, Table>, TSchemaRelations extends Record<string, Relations>, TInputs extends Record<string, GraphQLInputObjectType>, TOutputs extends Record<string, GraphQLObjectType>> = {
    [TName in keyof TSchemaTables as TName extends string ? `${Uncapitalize<TName>}` : never]: TName extends string ? {
        type: GraphQLNonNull<GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}SelectItem`]>>>;
        args: {
            offset: {
                type: GraphQLScalarType<number, number>;
            };
            limit: {
                type: GraphQLScalarType<number, number>;
            };
            orderBy: {
                type: TInputs[`${Capitalize<TName>}OrderBy`] extends GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}OrderBy`] : never;
            };
            where: {
                type: TInputs[`${Capitalize<TName>}Filters`] extends GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`] : never;
            };
        };
        resolve: SelectResolver<TSchemaTables[TName], TSchemaTables, ExtractTableRelations<TSchemaTables[TName], TSchemaRelations> extends infer R ? R[keyof R] : never>;
    } : never;
} & {
    [TName in keyof TSchemaTables as TName extends string ? `${Uncapitalize<TName>}Single` : never]: TName extends string ? {
        type: TOutputs[`${Capitalize<TName>}SelectItem`];
        args: {
            offset: {
                type: GraphQLScalarType<number, number>;
            };
            orderBy: {
                type: TInputs[`${Capitalize<TName>}OrderBy`] extends GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}OrderBy`] : never;
            };
            where: {
                type: TInputs[`${Capitalize<TName>}Filters`] extends GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`] : never;
            };
        };
        resolve: SelectSingleResolver<TSchemaTables[TName], TSchemaTables, ExtractTableRelations<TSchemaTables[TName], TSchemaRelations> extends infer R ? R[keyof R] : never>;
    } : never;
};
type MutationsCore<TSchemaTables extends Record<string, Table>, TInputs extends Record<string, GraphQLInputObjectType>, TOutputs extends Record<string, GraphQLObjectType>, IsReturnless extends boolean> = {
    [TName in keyof TSchemaTables as TName extends string ? `insertInto${Capitalize<TName>}` : never]: TName extends string ? {
        type: IsReturnless extends true ? TOutputs['MutationReturn'] extends GraphQLObjectType ? TOutputs['MutationReturn'] : never : GraphQLNonNull<GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}Item`]>>>;
        args: {
            values: {
                type: GraphQLNonNull<GraphQLList<GraphQLNonNull<TInputs[`${Capitalize<TName>}InsertInput`]>>>;
            };
        };
        resolve: InsertArrResolver<TSchemaTables[TName], IsReturnless>;
    } : never;
} & {
    [TName in keyof TSchemaTables as TName extends string ? `insertInto${Capitalize<TName>}Single` : never]: TName extends string ? {
        type: IsReturnless extends true ? TOutputs['MutationReturn'] extends GraphQLObjectType ? TOutputs['MutationReturn'] : never : TOutputs[`${Capitalize<TName>}Item`];
        args: {
            values: {
                type: GraphQLNonNull<TInputs[`${Capitalize<TName>}InsertInput`]>;
            };
        };
        resolve: InsertResolver<TSchemaTables[TName], IsReturnless>;
    } : never;
} & {
    [TName in keyof TSchemaTables as TName extends string ? `update${Capitalize<TName>}` : never]: TName extends string ? {
        type: IsReturnless extends true ? TOutputs['MutationReturn'] extends GraphQLObjectType ? TOutputs['MutationReturn'] : never : GraphQLNonNull<GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}Item`]>>>;
        args: {
            set: {
                type: GraphQLNonNull<TInputs[`${Capitalize<TName>}UpdateInput`]>;
            };
            where: {
                type: TInputs[`${Capitalize<TName>}Filters`] extends GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`] : never;
            };
        };
        resolve: UpdateResolver<TSchemaTables[TName], IsReturnless>;
    } : never;
} & {
    [TName in keyof TSchemaTables as TName extends string ? `deleteFrom${Capitalize<TName>}` : never]: TName extends string ? {
        type: IsReturnless extends true ? TOutputs['MutationReturn'] extends GraphQLObjectType ? TOutputs['MutationReturn'] : never : GraphQLNonNull<GraphQLList<GraphQLNonNull<TOutputs[`${Capitalize<TName>}Item`]>>>;
        args: {
            where: {
                type: TInputs[`${Capitalize<TName>}Filters`] extends GraphQLInputObjectType ? TInputs[`${Capitalize<TName>}Filters`] : never;
            };
        };
        resolve: DeleteResolver<TSchemaTables[TName], IsReturnless>;
    } : never;
};
type GeneratedInputs<TSchema extends Record<string, Table>> = {
    [TName in keyof TSchema as TName extends string ? `${Capitalize<TName>}InsertInput` : never]: GraphQLInputObjectType;
} & {
    [TName in keyof TSchema as TName extends string ? `${Capitalize<TName>}UpdateInput` : never]: GraphQLInputObjectType;
} & {
    [TName in keyof TSchema as TName extends string ? `${Capitalize<TName>}OrderBy` : never]: GraphQLInputObjectType;
} & {
    [TName in keyof TSchema as TName extends string ? `${Capitalize<TName>}Filters` : never]: GraphQLInputObjectType;
};
type GeneratedOutputs<TSchema extends Record<string, Table>, IsReturnless extends boolean> = {
    [TName in keyof TSchema as TName extends string ? `${Capitalize<TName>}SelectItem` : never]: GraphQLObjectType;
} & (IsReturnless extends true ? {
    MutationReturn: GraphQLObjectType;
} : {
    [TName in keyof TSchema as TName extends string ? `${Capitalize<TName>}Item` : never]: GraphQLObjectType;
});
type GeneratedEntities<TDatabase extends AnyDrizzleDB<TSchema>, TSchema extends Record<string, unknown> = TDatabase extends AnyDrizzleDB<infer ISchema> ? ISchema : never, TSchemaTables extends ExtractTables<TSchema> = ExtractTables<TSchema>, TSchemaRelations extends ExtractRelations<TSchema> = ExtractRelations<TSchema>, TInputs extends GeneratedInputs<TSchemaTables> = GeneratedInputs<TSchemaTables>, TOutputs extends GeneratedOutputs<TSchemaTables, TDatabase extends MySqlDatabase<any, any, any, any> ? true : false> = GeneratedOutputs<TSchemaTables, TDatabase extends MySqlDatabase<any, any, any, any> ? true : false>> = {
    queries: QueriesCore<TSchemaTables, TSchemaRelations, TInputs, TOutputs>;
    mutations: MutationsCore<TSchemaTables, TInputs, TOutputs, TDatabase extends MySqlDatabase<any, any, any, any> ? true : false>;
    inputs: TInputs;
    types: TOutputs;
};
type GeneratedData<TDatabase extends AnyDrizzleDB<any>> = {
    schema: GraphQLSchema;
    entities: GeneratedEntities<TDatabase>;
};
type BuildSchemaConfig = {
    /**
     * Determines whether generated mutations will be passed to returned schema.
     *
     * Set value to `false` to omit mutations from returned schema.
     *
     * Flag is treated as if set to `true` by default.
     */
    mutations?: boolean;
    /**
     * Limits depth of generated relation fields on queries.
     *
     * Expects non-negative integer or undefined.
     *
     * Set value to `undefined` to not limit relation depth.
     *
     * Set value to `0` to omit relations altogether.
     *
     * Value is treated as if set to `undefined` by default.
     */
    relationsDepthLimit?: number;
    /**
     * Customizes query name prefixes for generated GraphQL operations.
     *
     * @default { list: '', single: 'Single' }
     */
    prefixes?: {
        /** Prefix for insert mutations (e.g., 'users' -> 'insertIntoUsers') */
        insert?: string;
        /** Prefix for delete mutations (e.g., 'users' -> 'deleteFromUsers') */
        delete?: string;
        /** Prefix for update mutations (e.g., 'users' -> 'updateUsers') */
        update?: string;
    };
    /**
     * Customizes query name suffixes for generated GraphQL operations.
     *
     * @default { list: '', single: 'Single' }
     */
    suffixes?: {
        /** Suffix for list queries (e.g., 'users' -> 'users' + suffix) */
        list?: string;
        /** Suffix for single queries (e.g., 'users' -> 'users' + suffix) */
        single?: string;
    };
    /**
     * When true, insert mutations will use onConflictDoNothing() to silently
     * ignore duplicate key violations. Defaults to false (conflicts throw errors).
     */
    conflictDoNothing?: boolean;
};

declare const buildSchema: <TDbClient extends AnyDrizzleDB<any>>(db: TDbClient, config?: BuildSchemaConfig) => GeneratedData<TDbClient>;

export { type AnyDrizzleDB, type BuildSchemaConfig, type DeleteResolver, type ExtractRelations, type ExtractTableByName, type ExtractTableRelations, type ExtractTables, type GeneratedData, type GeneratedEntities, type GeneratedInputs, type GeneratedOutputs, type InsertArrResolver, type InsertResolver, type MutationReturnlessResult, type MutationsCore, type QueriesCore, type SelectResolver, type SelectSingleResolver, type UpdateResolver, buildSchema };
