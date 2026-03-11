import { buildRelations, createRelationsHelper } from 'drizzle-orm';
import { blob, integer, numeric, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const Users = sqliteTable('users', {
	id: integer('id').primaryKey().notNull(),
	name: text('name').notNull(),
	email: text('email'),
	textJson: text('text_json', { mode: 'json' }),
	blobBigInt: blob('blob_bigint', { mode: 'bigint' }),
	numeric: numeric('numeric'),
	createdAt: integer('created_at', { mode: 'timestamp' }),
	createdAtMs: integer('created_at_ms', { mode: 'timestamp_ms' }),
	real: real('real'),
	text: text('text', { length: 255 }),
	role: text('role', { enum: ['admin', 'user'] }).default('user'),
	isConfirmed: integer('is_confirmed', {
		mode: 'boolean',
	}),
});

export const Customers = sqliteTable('customers', {
	id: integer('id').primaryKey(),
	address: text('address').notNull(),
	isConfirmed: integer('is_confirmed', { mode: 'boolean' }),
	registrationDate: integer('registration_date', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	userId: integer('user_id')
		.references(() => Users.id)
		.notNull(),
});

export const Posts = sqliteTable('posts', {
	id: integer('id').primaryKey(),
	content: text('content'),
	authorId: integer('author_id'),
});

const r = createRelationsHelper({ Users, Customers, Posts });

export const relations = buildRelations(
	{ Users, Customers, Posts },
	{
		Users: {
			posts: r.many.Posts({ from: r.Users.id, to: r.Posts.authorId }),
			customer: r.one.Customers({ from: r.Users.id, to: r.Customers.userId }),
		},
		Customers: {
			user: r.one.Users({ from: r.Customers.userId, to: r.Users.id }),
			posts: r.many.Posts({ from: r.Customers.userId, to: r.Posts.authorId }),
		},
		Posts: {
			author: r.one.Users({ from: r.Posts.authorId, to: r.Users.id }),
			customer: r.one.Customers({ from: r.Posts.authorId, to: r.Customers.userId }),
		},
	},
);
