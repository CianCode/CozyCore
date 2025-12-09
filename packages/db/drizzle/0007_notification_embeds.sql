-- Add helper recognition notification settings
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_channel_id" text;
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_embed_title" text NOT NULL DEFAULT '⭐ Helper of the Thread';
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_embed_description" text NOT NULL DEFAULT '{helper} was marked as the most helpful in this thread! 🙌

Thanks for taking the time to share your knowledge and solve {asker}''s problem. The community grows stronger with members like you!

**Reward:** +{xp} XP';
ALTER TABLE "level_config" ADD COLUMN "helper_recognition_embed_descriptions" jsonb DEFAULT '[]'::jsonb;

-- Add fast resolution notification settings
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_channel_id" text;
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_embed_title" text NOT NULL DEFAULT '⚡ Lightning Fast!';
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_embed_description" text NOT NULL DEFAULT 'Wow! {helper} solved this issue in under {hours} hours! 🚀

Quick, accurate, and incredibly helpful. This is what great support looks like!

**Bonus Reward:** +{xp} XP';
ALTER TABLE "level_config" ADD COLUMN "fast_resolution_embed_descriptions" jsonb DEFAULT '[]'::jsonb;

-- Add booster settings
ALTER TABLE "level_config" ADD COLUMN "booster_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "level_config" ADD COLUMN "booster_channel_id" text;
ALTER TABLE "level_config" ADD COLUMN "booster_xp_multiplier" real NOT NULL DEFAULT 1.5;
ALTER TABLE "level_config" ADD COLUMN "booster_bonus_xp_per_message" integer NOT NULL DEFAULT 5;
ALTER TABLE "level_config" ADD COLUMN "booster_helper_bonus_multiplier" real NOT NULL DEFAULT 2;
ALTER TABLE "level_config" ADD COLUMN "booster_embed_title" text NOT NULL DEFAULT '💗 Thank You for Boosting!';
ALTER TABLE "level_config" ADD COLUMN "booster_embed_description" text NOT NULL DEFAULT '{user} just boosted the server! 🎉

Your support helps keep the server running smoothly and unlocks awesome perks for everyone. You''re amazing!

**Your Perks:**
- {multiplier}× XP multiplier on all messages
- +{bonusXp} bonus XP per message
- Double helper recognition bonus

Thank you for believing in our community! 🌸';
ALTER TABLE "level_config" ADD COLUMN "booster_embed_descriptions" jsonb DEFAULT '[]'::jsonb;

-- Add monthly top helper settings
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_channel_id" text;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_day" integer NOT NULL DEFAULT 1;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_hour" integer NOT NULL DEFAULT 12;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_first_xp" integer NOT NULL DEFAULT 250;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_second_xp" integer NOT NULL DEFAULT 150;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_third_xp" integer NOT NULL DEFAULT 100;
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_embed_title" text NOT NULL DEFAULT '🌟 Monthly MVP: Top Helpers!';
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_embed_description" text NOT NULL DEFAULT 'Let''s celebrate this month''s most helpful community members! 👏

🥇 **1st Place:** {user1} - {count1} threads solved
🥈 **2nd Place:** {user2} - {count2} threads solved
🥉 **3rd Place:** {user3} - {count3} threads solved

**Rewards:**
- 1st: +{xp1} XP
- 2nd: +{xp2} XP
- 3rd: +{xp3} XP

Thank you for making this such a supportive place to learn and grow! 💚

*Want to be featured next month? Help out in our forum channels!*';
ALTER TABLE "level_config" ADD COLUMN "monthly_top_helper_embed_descriptions" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "level_config" ADD COLUMN "last_monthly_top_helper_run" timestamp;

-- Add monthly helper tracking to member_xp
ALTER TABLE "member_xp" ADD COLUMN "monthly_helper_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "member_xp" ADD COLUMN "last_helper_count_reset" timestamp;
