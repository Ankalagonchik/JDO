import { pgTable, text, timestamp, integer, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  bio: text('bio').default(''),
  rating: integer('rating').default(0),
  debatesParticipated: integer('debates_participated').default(0),
  isAdmin: boolean('is_admin').default(false),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Topics table
export const topics = pgTable('topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  status: text('status', { enum: ['active', 'closed', 'scheduled'] }).default('active'),
  tags: jsonb('tags').$type<string[]>().default([]),
  participants: integer('participants').default(1),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Arguments table
export const arguments = pgTable('arguments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  type: text('type', { enum: ['pro', 'con'] }).notNull(),
  topicId: uuid('topic_id').references(() => topics.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Replies table
export const replies = pgTable('replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  argumentId: uuid('argument_id').references(() => arguments.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Votes table
export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  targetId: uuid('target_id').notNull(), // Can be topic, argument, or reply ID
  targetType: text('target_type', { enum: ['topic', 'argument', 'reply'] }).notNull(),
  voteType: text('vote_type', { enum: ['up', 'down'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comments table (for user profiles)
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  targetUserId: uuid('target_user_id').references(() => users.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  topics: many(topics),
  arguments: many(arguments),
  replies: many(replies),
  votes: many(votes),
  commentsWritten: many(comments, { relationName: 'author' }),
  commentsReceived: many(comments, { relationName: 'target' }),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  author: one(users, {
    fields: [topics.authorId],
    references: [users.id],
  }),
  arguments: many(arguments),
}));

export const argumentsRelations = relations(arguments, ({ one, many }) => ({
  topic: one(topics, {
    fields: [arguments.topicId],
    references: [topics.id],
  }),
  author: one(users, {
    fields: [arguments.authorId],
    references: [users.id],
  }),
  replies: many(replies),
}));

export const repliesRelations = relations(replies, ({ one }) => ({
  argument: one(arguments, {
    fields: [replies.argumentId],
    references: [arguments.id],
  }),
  author: one(users, {
    fields: [replies.authorId],
    references: [users.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  targetUser: one(users, {
    fields: [comments.targetUserId],
    references: [users.id],
    relationName: 'target',
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
    relationName: 'author',
  }),
}));