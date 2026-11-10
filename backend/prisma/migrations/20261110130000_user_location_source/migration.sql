-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('GPS', 'ADMIN', 'MANUAL');

-- AlterTable
ALTER TABLE "UserLocation" ADD COLUMN     "source" "LocationSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
