ALTER TABLE "MetaConnection"
  ADD COLUMN "providerIdentityId" TEXT,
  ADD COLUMN "providerIdentityName" TEXT,
  ADD COLUMN "lastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorCode" TEXT;
