import { buildRelations, createRelationsHelper } from 'drizzle-orm';
import {
	boolean,
	char,
	date,
	geometry,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
	vector,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'user']);

export const Users = pgTable('users', {
	a: integer('a').array(),
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email'),
	birthdayString: date('birthday_string', { mode: 'string' }),
	birthdayDate: date('birthday_date', { mode: 'date' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	role: roleEnum('role'),
	roleText: text('role1', { enum: ['admin', 'user'] }),
	roleText2: text('role2', { enum: ['admin', 'user'] }).default('user'),
	profession: varchar('profession', { length: 20 }),
	initials: char('initials', { length: 2 }),
	isConfirmed: boolean('is_confirmed'),
	vector: vector('vector_column', { dimensions: 5 }),
	geoXy: geometry('geometry_xy', {
		mode: 'xy',
	}),
	geoTuple: geometry('geometry_tuple', {
		mode: 'tuple',
	}),
});

export const Customers = pgTable('customers', {
	id: serial('id').primaryKey(),
	address: text('address').notNull(),
	isConfirmed: boolean('is_confirmed'),
	registrationDate: timestamp('registration_date').notNull().defaultNow(),
	userId: integer('user_id')
		.references(() => Users.id)
		.notNull(),
});

export const Posts = pgTable('posts', {
	id: serial('id').primaryKey(),
	content: text('content'),
	authorId: integer('author_id'),
});

export const Tags = pgTable('tags', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
});
// No tagsRelations export — this table intentionally has NO relations

const r = createRelationsHelper({ Users, Customers, Posts, Tags });

export const relations = buildRelations(
	{ Users, Customers, Posts, Tags },
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
