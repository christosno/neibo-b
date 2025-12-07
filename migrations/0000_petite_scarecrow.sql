CREATE TABLE "spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"latitude" numeric NOT NULL,
	"longitude" numeric NOT NULL,
	"reach_radius" integer DEFAULT 50 NOT NULL,
	"position_order" integer DEFAULT 0 NOT NULL,
	"image_urls" text[],
	"audio_url" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_walk_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"walk_id" uuid NOT NULL,
	"current_spot_id" uuid,
	"visited_spots" uuid[],
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"started_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"first_name" varchar(50),
	"last_name" varchar(50),
	"profile_picture" varchar(255) DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "walk_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walk_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"text_review" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walk_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"start_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "walk_tags" (
	"walk_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image_url" varchar(255) DEFAULT '' NOT NULL,
	"duration_estimate" numeric,
	"distance_estimate" numeric,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spots" ADD CONSTRAINT "spots_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_walk_progress" ADD CONSTRAINT "user_walk_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_walk_progress" ADD CONSTRAINT "user_walk_progress_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_walk_progress" ADD CONSTRAINT "user_walk_progress_current_spot_id_spots_id_fk" FOREIGN KEY ("current_spot_id") REFERENCES "public"."spots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_comments" ADD CONSTRAINT "walk_comments_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_comments" ADD CONSTRAINT "walk_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_reviews" ADD CONSTRAINT "walk_reviews_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_reviews" ADD CONSTRAINT "walk_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_subscriptions" ADD CONSTRAINT "walk_subscriptions_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_subscriptions" ADD CONSTRAINT "walk_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_tags" ADD CONSTRAINT "walk_tags_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_tags" ADD CONSTRAINT "walk_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walks" ADD CONSTRAINT "walks_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;