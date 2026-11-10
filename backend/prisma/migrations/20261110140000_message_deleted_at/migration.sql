-- Plan 09 (TR-039): a message deleted by its sender is hidden from the chat and kept for moderation.
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
