-- AlterEnum
ALTER TYPE "ServerType" ADD VALUE 'AUTO_CURSEFORGE';

-- AlterTable
ALTER TABLE "servers" ADD COLUMN "cfPageUrl" TEXT;
ALTER TABLE "servers" ADD COLUMN "cfApiKey" TEXT;
