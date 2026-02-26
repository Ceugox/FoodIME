-- AlterTable: Add auth feature columns to User
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerificationExpiry" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- Make password nullable (was required before)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Change default status from ACTIVE to PENDING
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
