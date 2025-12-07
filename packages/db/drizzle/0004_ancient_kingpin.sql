CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"owner_id" text NOT NULL,
	"bot_joined_at" timestamp,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_config" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"min_xp_per_message" integer DEFAULT 4 NOT NULL,
	"max_xp_per_message" integer DEFAULT 10 NOT NULL,
	"cooldown_seconds" integer DEFAULT 60 NOT NULL,
	"max_xp_per_hour" integer,
	"max_xp_per_hour_enabled" boolean DEFAULT false NOT NULL,
	"max_xp_per_day" integer,
	"max_xp_per_day_enabled" boolean DEFAULT false NOT NULL,
	"min_message_length" integer DEFAULT 5 NOT NULL,
	"similarity_severity" text DEFAULT 'medium' NOT NULL,
	"whitelisted_channels" jsonb DEFAULT '[]'::jsonb,
	"forum_xp_enabled" boolean DEFAULT false NOT NULL,
	"xp_on_thread_close" integer DEFAULT 25 NOT NULL,
	"helper_bonus_xp" integer DEFAULT 15 NOT NULL,
	"auto_archive_hours" integer DEFAULT 24 NOT NULL,
	"fast_resolution_enabled" boolean DEFAULT false NOT NULL,
	"fast_resolution_threshold_hours" integer DEFAULT 2 NOT NULL,
	"fast_resolution_bonus_xp" integer DEFAULT 10 NOT NULL,
	"whitelisted_forums" jsonb DEFAULT '[]'::jsonb,
	"auto_remove_previous_role" boolean DEFAULT true NOT NULL,
	"congrats_channel_id" text,
	"demotion_channel_id" text,
	"log_channel_id" text,
	"promotion_embed_title" text DEFAULT '🎉 Level Up!' NOT NULL,
	"promotion_embed_description" text DEFAULT 'Félicitations à {user}, il a obtenu le rôle {role}!' NOT NULL,
	"demotion_embed_title" text DEFAULT '⚠️ Role Change' NOT NULL,
	"demotion_embed_description" text DEFAULT '{user} a été rétrogradé de {oldRole} à {newRole}!' NOT NULL,
	"role_loss_embed_title" text DEFAULT '📉 Role Removed' NOT NULL,
	"role_loss_embed_description" text DEFAULT '{user} a perdu son rôle {role}!' NOT NULL,
	"roles_embed_channel_id" text,
	"roles_embed_message_id" text,
	"roles_embed_title" text DEFAULT '🏆 Level Roles' NOT NULL,
	"roles_embed_description" text DEFAULT 'Earn XP by chatting to unlock these roles!' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"role_id" text NOT NULL,
	"xp_required" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_xp" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_role_id" text,
	"last_message_at" timestamp,
	"xp_earned_today" integer DEFAULT 0 NOT NULL,
	"xp_earned_this_hour" integer DEFAULT 0 NOT NULL,
	"last_hour_reset" timestamp,
	"last_day_reset" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_config" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"welcome_channel_id" text,
	"roles_on_join" jsonb DEFAULT '[]'::jsonb,
	"thread_auto_delete" text DEFAULT '1d',
	"typing_delay" integer DEFAULT 1500 NOT NULL,
	"show_typing_indicator" boolean DEFAULT true NOT NULL,
	"thread_name_template" text DEFAULT 'Welcome {username}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_threads" (
	"thread_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"delete_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "welcome_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"content" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"selectable_roles" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_config" ADD CONSTRAINT "level_config_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_roles" ADD CONSTRAINT "level_roles_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_xp" ADD CONSTRAINT "member_xp_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_config" ADD CONSTRAINT "onboarding_config_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_threads" ADD CONSTRAINT "onboarding_threads_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welcome_messages" ADD CONSTRAINT "welcome_messages_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;