-- Design D (plan 01): a story can be posted without picking a category; it is stored as GENERAL.
ALTER TYPE "StoryCategory" ADD VALUE IF NOT EXISTS 'GENERAL';
