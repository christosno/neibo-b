import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  profilePicture: varchar("profile_picture", { length: 255 })
    .notNull()
    .default(""),
  bio: text("bio").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const walks = pgTable("walks", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  coverImageUrl: varchar("cover_image_url", { length: 255 })
    .notNull()
    .default(""),
  duration_estimate: integer("duration_estimate"),
  distance_estimate: integer("distance_estimate"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const spots = pgTable("spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  walkId: uuid("walk_id")
    .references(() => walks.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  latitude: decimal("latitude").notNull(),
  longitude: decimal("longitude").notNull(),
  reach_radius: integer("reach_radius").notNull().default(50),
  positionOrder: integer("position_order").notNull().default(0),
  imageUrls: text("image_urls").array(),
  audioUrl: varchar("audio_url", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const walkTags = pgTable("walk_tags", {
  walkId: uuid("walk_id")
    .references(() => walks.id, { onDelete: "cascade" })
    .notNull(),
  tagId: uuid("tag_id")
    .references(() => tags.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const walkReviews = pgTable("walk_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  walkId: uuid("walk_id")
    .references(() => walks.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  stars: integer("stars").notNull().default(0),
  textReview: text("text_review"),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const walkComments = pgTable("walk_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  walkId: uuid("walk_id")
    .references(() => walks.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

export const walkSubscriptions = pgTable("walk_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walkId: uuid("walk_id")
    .references(() => walks.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow().notNull(),
  startDate: timestamp("start_date"),
});

export const userWalkProgress = pgTable("user_walk_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  walkId: uuid("walk_id")
    .references(() => walks.id, { onDelete: "cascade" })
    .notNull(),
  currentSpotId: uuid("current_spot_id").references(() => spots.id),
  visitedSpots: uuid("visited_spots").array(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at"),
  createdAt: timestamp("created_at").notNull().defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  walks: many(walks),
  walkSubscriptions: many(walkSubscriptions),
  userWalkProgress: many(userWalkProgress),
  walkReviews: many(walkReviews),
  walkComments: many(walkComments),
}));

export const walkRelations = relations(walks, ({ many, one }) => ({
  author: one(users, { fields: [walks.authorId], references: [users.id] }),
  spots: many(spots),
  walkReviews: many(walkReviews),
  walkComments: many(walkComments),
  walkTags: many(walkTags),
  walkSubscriptions: many(walkSubscriptions),
  userWalkProgress: many(userWalkProgress),
}));

export const spotRelations = relations(spots, ({ many, one }) => ({
  walk: one(walks, { fields: [spots.walkId], references: [walks.id] }),
  userWalkProgress: many(userWalkProgress),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  walkTags: many(walkTags),
}));

export const walkTagRelations = relations(walkTags, ({ one }) => ({
  walk: one(walks, { fields: [walkTags.walkId], references: [walks.id] }),
  tag: one(tags, { fields: [walkTags.tagId], references: [tags.id] }),
}));

export const walkReviewRelations = relations(walkReviews, ({ one }) => ({
  walk: one(walks, { fields: [walkReviews.walkId], references: [walks.id] }),
  user: one(users, { fields: [walkReviews.userId], references: [users.id] }),
}));

export const walkCommentRelations = relations(walkComments, ({ one }) => ({
  walk: one(walks, { fields: [walkComments.walkId], references: [walks.id] }),
  user: one(users, { fields: [walkComments.userId], references: [users.id] }),
}));

export const walkSubscriptionRelations = relations(
  walkSubscriptions,
  ({ one }) => ({
    walk: one(walks, {
      fields: [walkSubscriptions.walkId],
      references: [walks.id],
    }),
    user: one(users, {
      fields: [walkSubscriptions.userId],
      references: [users.id],
    }),
  })
);

export const userWalkProgressRelations = relations(
  userWalkProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [userWalkProgress.userId],
      references: [users.id],
    }),
    walk: one(walks, {
      fields: [userWalkProgress.walkId],
      references: [walks.id],
    }),
    currentSpot: one(spots, {
      fields: [userWalkProgress.currentSpotId],
      references: [spots.id],
    }),
  })
);

// Types / Schemas
export type User = typeof users.$inferSelect;
export type Walk = typeof walks.$inferSelect;
export type Spot = typeof spots.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type WalkReview = typeof walkReviews.$inferSelect;
export type WalkComment = typeof walkComments.$inferSelect;
export type WalkSubscription = typeof walkSubscriptions.$inferSelect;
export type UserWalkProgress = typeof userWalkProgress.$inferSelect;

export const userInsertSchema = createInsertSchema(users);
export const walkInsertSchema = createInsertSchema(walks);
export const spotInsertSchema = createInsertSchema(spots);
export const tagInsertSchema = createInsertSchema(tags);
export const walkReviewInsertSchema = createInsertSchema(walkReviews);
export const walkCommentInsertSchema = createInsertSchema(walkComments);
export const walkSubscriptionInsertSchema =
  createInsertSchema(walkSubscriptions);
export const userWalkProgressInsertSchema =
  createInsertSchema(userWalkProgress);

export const userSelectSchema = createSelectSchema(users);
export const walkSelectSchema = createSelectSchema(walks);
export const spotSelectSchema = createSelectSchema(spots);
export const tagSelectSchema = createSelectSchema(tags);
export const walkReviewSelectSchema = createSelectSchema(walkReviews);
export const walkCommentSelectSchema = createSelectSchema(walkComments);
export const walkSubscriptionSelectSchema =
  createSelectSchema(walkSubscriptions);
export const userWalkProgressSelectSchema =
  createSelectSchema(userWalkProgress);
