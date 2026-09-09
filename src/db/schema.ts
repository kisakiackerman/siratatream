import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

// Users table synced with Firebase Authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Saved locations / historical monuments for Google Maps explorer
export const savedLocations = pgTable('saved_locations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // 'mosque', 'historical_monument', 'holy_site', 'custom'
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  placeId: text('place_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Watch history persisted to Cloud SQL
export const watchHistory = pgTable('watch_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  videoId: text('video_id').notNull(),
  title: text('title').notNull(),
  channelTitle: text('channel_title'),
  progress: integer('progress').default(0), // playback position in seconds
  duration: integer('duration').default(0),
  lastWatched: timestamp('last_watched').defaultNow(),
});

// User Favorites / My List
export const userFavorites = pgTable('user_favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  videoId: text('video_id').notNull(),
  title: text('title').notNull(),
  channelTitle: text('channel_title'),
  thumbnailUrl: text('thumbnail_url'),
  category: text('category'),
  addedAt: timestamp('added_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  savedLocations: many(savedLocations),
  watchHistory: many(watchHistory),
  userFavorites: many(userFavorites),
}));

export const savedLocationsRelations = relations(savedLocations, ({ one }) => ({
  user: one(users, {
    fields: [savedLocations.userId],
    references: [users.id],
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
}));
