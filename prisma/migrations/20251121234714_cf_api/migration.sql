-- AlterEnum
ALTER TYPE "public"."ServerType" ADD VALUE 'CURSEFORGE';

-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "cf_api" TEXT;
