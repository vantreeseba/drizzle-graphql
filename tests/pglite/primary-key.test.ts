import { getTableConfig, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { getPrimaryKeyPropNames } from '@/util/builders/common';

// Mirrors the per-dialect helpers (pgPrimaryKeyPropNames / sqlitePrimaryKeyPropNames):
// composite primary keys are only visible through getTableConfig, so the dialect layer
// feeds their column names into the shared getPrimaryKeyPropNames().
const pgPk = (table: any): string[] => {
  const compositePkColumnNames = getTableConfig(table).primaryKeys.flatMap((pk: any) =>
    pk.columns.map((c: any) => c.name),
  );
  return getPrimaryKeyPropNames(table, compositePkColumnNames);
};

describe('getPrimaryKeyPropNames', () => {
  it('detects an inline single-column primary key', () => {
    const t = pgTable('inline_pk', { id: integer('id').primaryKey(), name: text('name') });
    expect(pgPk(t)).toEqual(['id']);
  });

  it('detects a table-level composite primary key by property name', () => {
    const t = pgTable(
      'composite_pk',
      { a: integer('a').notNull(), b: integer('b').notNull(), name: text('name') },
      (cols) => [primaryKey({ columns: [cols.a, cols.b] })],
    );
    // Property names, even though the inline `.primary` flag is false on composite members.
    expect(pgPk(t)).toEqual(['a', 'b']);
  });

  it('maps composite PK DB column names back to differing property names', () => {
    const t = pgTable(
      'snake_pk',
      { orgId: integer('org_id').notNull(), userId: integer('user_id').notNull() },
      (cols) => [primaryKey({ columns: [cols.orgId, cols.userId] })],
    );
    expect(pgPk(t)).toEqual(['orgId', 'userId']);
  });

  it('falls back to a column named `id` when no primary key is declared', () => {
    const t = pgTable('id_fallback', { id: integer('id'), name: text('name') });
    expect(getPrimaryKeyPropNames(t)).toEqual(['id']);
  });

  it('returns empty when no primary key and no `id` column exist', () => {
    const t = pgTable('no_pk', { name: text('name'), value: integer('value') });
    expect(getPrimaryKeyPropNames(t)).toEqual([]);
  });
});
