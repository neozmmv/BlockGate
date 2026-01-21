/*
  Warnings:

  - The values [CURSEFORGE] on the enum `ServerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ServerType_new" AS ENUM ('VANILLA', 'FORGE', 'FABRIC', 'NEOFORGE', 'SPIGOT', 'PAPER', 'AUTO_CURSEFORGE');
ALTER TABLE "public"."servers" ALTER COLUMN "serverType" TYPE "public"."ServerType_new" USING ("serverType"::text::"public"."ServerType_new");
ALTER TYPE "public"."ServerType" RENAME TO "ServerType_old";
ALTER TYPE "public"."ServerType_new" RENAME TO "ServerType";
DROP TYPE "public"."ServerType_old";
COMMIT;
