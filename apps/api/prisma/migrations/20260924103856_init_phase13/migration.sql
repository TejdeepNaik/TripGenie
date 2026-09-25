-- CreateTable
CREATE TABLE "ProviderEventLog" (
    "id" UUID NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderEventLog_providerEventId_key" ON "ProviderEventLog"("providerEventId");

-- CreateIndex
CREATE INDEX "ProviderEventLog_providerEventId_idx" ON "ProviderEventLog"("providerEventId");

-- CreateIndex
CREATE INDEX "ProviderEventLog_eventType_idx" ON "ProviderEventLog"("eventType");

-- CreateIndex
CREATE INDEX "ProviderEventLog_status_idx" ON "ProviderEventLog"("status");
