import { buildRelations, createRelationsHelper } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

export const Users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  bigint: bigint('big_int', { mode: 'bigint', unsigned: true }),
  birthdayString: date('birthday_string', { mode: 'string' }),
  birthdayDate: date('birthday_date', { mode: 'date' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  role: mysqlEnum('role', ['admin', 'user']),
  roleText: text('role1', { enum: ['admin', 'user'] }),
  roleText2: text('role2', { enum: ['admin', 'user'] }).default('user'),
  profession: varchar('profession', { length: 20 }),
  initials: char('initials', { length: 2 }),
  isConfirmed: boolean('is_confirmed'),
});

export const Customers = mysqlTable('customers', {
  id: int('id').autoincrement().primaryKey(),
  address: text('address').notNull(),
  isConfirmed: boolean('is_confirmed'),
  registrationDate: timestamp('registration_date').notNull().defaultNow(),
  userId: int('user_id')
    .references(() => Users.id)
    .notNull(),
});

export const Posts = mysqlTable('posts', {
  id: int('id').autoincrement().primaryKey(),
  content: text('content'),
  authorId: int('author_id'),
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
