-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "followers" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserFollow" ADD COLUMN     "status" "FollowStatus" NOT NULL DEFAULT 'ACCEPTED';
