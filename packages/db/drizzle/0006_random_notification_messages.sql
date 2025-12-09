-- Add support for multiple random notification messages
ALTER TABLE "level_config" ADD COLUMN "promotion_embed_descriptions" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "level_config" ADD COLUMN "demotion_embed_descriptions" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "level_config" ADD COLUMN "role_loss_embed_descriptions" jsonb DEFAULT '[]'::jsonb;
