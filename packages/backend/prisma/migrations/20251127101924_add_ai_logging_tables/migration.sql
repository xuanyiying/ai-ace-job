-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "scenario" TEXT,
    "requestContent" TEXT,
    "responseContent" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latency" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_retry_logs" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_retry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_degradation_logs" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fallbackModel" TEXT,
    "fallbackProvider" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_degradation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_call_logs_model_idx" ON "ai_call_logs"("model");

-- CreateIndex
CREATE INDEX "ai_call_logs_provider_idx" ON "ai_call_logs"("provider");

-- CreateIndex
CREATE INDEX "ai_call_logs_scenario_idx" ON "ai_call_logs"("scenario");

-- CreateIndex
CREATE INDEX "ai_call_logs_success_idx" ON "ai_call_logs"("success");

-- CreateIndex
CREATE INDEX "ai_call_logs_timestamp_idx" ON "ai_call_logs"("timestamp");

-- CreateIndex
CREATE INDEX "ai_call_logs_userId_idx" ON "ai_call_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_retry_logs_model_idx" ON "ai_retry_logs"("model");

-- CreateIndex
CREATE INDEX "ai_retry_logs_provider_idx" ON "ai_retry_logs"("provider");

-- CreateIndex
CREATE INDEX "ai_retry_logs_timestamp_idx" ON "ai_retry_logs"("timestamp");

-- CreateIndex
CREATE INDEX "ai_degradation_logs_model_idx" ON "ai_degradation_logs"("model");

-- CreateIndex
CREATE INDEX "ai_degradation_logs_provider_idx" ON "ai_degradation_logs"("provider");

-- CreateIndex
CREATE INDEX "ai_degradation_logs_timestamp_idx" ON "ai_degradation_logs"("timestamp");
