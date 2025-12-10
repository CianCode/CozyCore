CREATE TABLE "saved_embed_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"channel_id" text,
	"discord_message_id" text,
	"content" text,
	"embeds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "promotion_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "demotion_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "role_loss_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_channel_id" text;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_embed_title" text DEFAULT '⭐ Helper of the Thread' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_embed_description" text DEFAULT '{helper} was marked as the most helpful in this thread! 🙌

Thanks for taking the time to share your knowledge and solve {asker}''s problem. The community grows stronger with members like you!

**Reward:** +{xp} XP' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_channel_id" text;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_embed_title" text DEFAULT '⚡ Lightning Fast!' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_embed_description" text DEFAULT 'Wow! {helper} solved this issue in under {hours} hours! 🚀

Quick, accurate, and incredibly helpful. This is what great support looks like!

**Bonus Reward:** +{xp} XP' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_channel_id" text;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_xp_multiplier" real DEFAULT 1.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_bonus_xp_per_message" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_helper_bonus_multiplier" real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_embed_title" text DEFAULT '💗 Thank You for Boosting!' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_embed_description" text DEFAULT '{user} just boosted the server! 🎉

Your support helps keep the server running smoothly and unlocks awesome perks for everyone. You''re amazing!

**Your Perks:**
- {multiplier}× XP multiplier on all messages
- +{bonusXp} bonus XP per message
- Double helper recognition bonus

Thank you for believing in our community! 🌸' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "booster_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_channel_id" text;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_hour" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_first_xp" integer DEFAULT 250 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_second_xp" integer DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_third_xp" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_embed_title" text DEFAULT '🌟 Monthly MVP: Top Helpers!' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_embed_description" text DEFAULT 'Let''s celebrate this month''s most helpful community members! 👏

🥇 **1st Place:** {user1} - {count1} threads solved
🥈 **2nd Place:** {user2} - {count2} threads solved
🥉 **3rd Place:** {user3} - {count3} threads solved

**Rewards:**
- 1st: +{xp1} XP
- 2nd: +{xp2} XP
- 3rd: +{xp3} XP

Thank you for making this such a supportive place to learn and grow! 💚

*Want to be featured next month? Help out in our forum channels!*' NOT NULL;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_embed_descriptions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "last_monthly_top_helper_run" timestamp;--> statement-breakpoint
ALTER TABLE "level_config" ADD COLUMN "force_monthly_top_helper_run" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "member_xp" ADD COLUMN "monthly_helper_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_xp" ADD COLUMN "last_helper_count_reset" timestamp;--> statement-breakpoint
ALTER TABLE "saved_embed_messages" ADD CONSTRAINT "saved_embed_messages_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;