-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE', 'PARTNER', 'PRINCIPAL', 'PRACTICE_LEAD', 'SENIOR_CONSULTANT', 'JUNIOR_CONSULTANT', 'CONTRACTOR', 'CLIENT_USER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('PRODUCTIVITY_PATTERN', 'TIME_OPTIMIZATION', 'PROJECT_SUGGESTION', 'BILLING_ANOMALY', 'DUPLICATE_DETECTION', 'WORKLOAD_BALANCE', 'BURNOUT_WARNING', 'EFFICIENCY_TREND');

-- CreateEnum
CREATE TYPE "PatternType" AS ENUM ('DAILY_ROUTINE', 'WEEKLY_PATTERN', 'PROJECT_HABIT', 'TASK_FREQUENCY', 'SEASONAL_TREND');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('USER', 'PROJECT', 'TASK', 'TEAM', 'CLIENT', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('PROJECT_COMPLETION', 'BUDGET_VARIANCE', 'RESOURCE_UTILIZATION', 'TASK_DURATION', 'TEAM_PRODUCTIVITY', 'WORKLOAD_BALANCE', 'BILLING_FORECAST');

-- CreateEnum
CREATE TYPE "PortfolioStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('TIME_ANALYSIS', 'PROJECT_ANALYTICS', 'RESOURCE_UTILIZATION', 'FINANCIAL_SUMMARY', 'PRODUCTIVITY_REPORT', 'CUSTOM_DASHBOARD');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL_DIGEST', 'APPROVAL_REMINDER', 'ESCALATION_ALERT', 'TIMESHEET_STATUS_UPDATE', 'SLACK_NOTIFICATION', 'URGENT_APPROVAL', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "XeroSyncOperation" AS ENUM ('SYNC_TIMESHEET', 'BATCH_SYNC', 'HEALTH_CHECK', 'CONNECTION_TEST', 'MANUAL_SYNC', 'MANUAL_SYNC_DRY_RUN', 'VALIDATION_OVERRIDE_CREATED', 'VALIDATION_OVERRIDE_APPROVED', 'VALIDATION_OVERRIDE_REJECTED', 'VALIDATION_OVERRIDE_REVOKED', 'VALIDATION_OVERRIDE_EXTENDED');

-- CreateEnum
CREATE TYPE "XeroSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "XeroSyncTrigger" AS ENUM ('approval', 'manual', 'scheduled', 'retry');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "department" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "defaultBillRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "website" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "programId" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "budget" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "defaultBillRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "estimatedHours" DOUBLE PRECISION,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT,
    "billRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "billRate" DOUBLE PRECISION,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "aiCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "totalBillable" DOUBLE PRECISION NOT NULL,
    "totalBillableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "lastSyncedToXero" TIMESTAMP(3),
    "xeroInvoiceId" TEXT,
    "xeroSyncStatus" TEXT DEFAULT 'NOT_SYNCED',

    CONSTRAINT "timesheet_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_submission_entries" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,

    CONSTRAINT "timesheet_submission_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "actionable" BOOLEAN NOT NULL DEFAULT true,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableSuggestions" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoCategory" BOOLEAN NOT NULL DEFAULT true,
    "enableTimeEstimation" BOOLEAN NOT NULL DEFAULT true,
    "enableInsights" BOOLEAN NOT NULL DEFAULT true,
    "enableSmartReminders" BOOLEAN NOT NULL DEFAULT true,
    "enableVoiceEntry" BOOLEAN NOT NULL DEFAULT false,
    "preferredCategories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_patterns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternType" "PatternType" NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "dayOfWeek" INTEGER,
    "timeOfDay" TEXT,
    "duration" DOUBLE PRECISION,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_predictions" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "predictionType" "PredictionType" NOT NULL,
    "predictionValue" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "horizon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "actualValue" JSONB,
    "accuracy" DOUBLE PRECISION,

    CONSTRAINT "ai_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" "PortfolioStatus" NOT NULL DEFAULT 'ACTIVE',
    "budget" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "portfolioId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "budget" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioUrl" TEXT,
    "transcription" TEXT,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "timeEntryId" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "defaultDuration" DOUBLE PRECISION,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "parameters" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "executedBy" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailDigestTime" TEXT NOT NULL DEFAULT '09:00',
    "slackNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackWebhookUrl" TEXT,
    "approvalRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalationNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timesheetStatusNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_connections" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "refreshToken" TEXT NOT NULL DEFAULT '',
    "idToken" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "scopes" TEXT NOT NULL DEFAULT '',
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_sync_logs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "userId" TEXT,
    "operation" "XeroSyncOperation" NOT NULL,
    "status" "XeroSyncStatus" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "error" TEXT,
    "jobId" TEXT,
    "trigger" "XeroSyncTrigger" NOT NULL DEFAULT 'manual',
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xero_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_quarantine_records" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "originalData" TEXT NOT NULL,
    "transformedData" TEXT,
    "correctedData" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errors" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "quarantinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quarantinedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "resolutionNotes" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_quarantine_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_validation_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "validationResult" TEXT NOT NULL,
    "checksum" TEXT,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedBy" TEXT NOT NULL DEFAULT 'system',
    "passed" BOOLEAN NOT NULL,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "xero_validation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_error_escalations" (
    "id" TEXT NOT NULL,
    "quarantineRecordId" TEXT,
    "syncLogId" TEXT,
    "errorSeverity" TEXT NOT NULL,
    "errorCategory" TEXT NOT NULL,
    "escalatedTo" TEXT NOT NULL,
    "escalatedBy" TEXT NOT NULL DEFAULT 'system',
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "escalationNotes" TEXT,
    "resolutionNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "xero_error_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_validation_overrides" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "overriddenRules" TEXT[],
    "justification" TEXT NOT NULL,
    "overrideType" TEXT NOT NULL DEFAULT 'TEMPORARY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalComments" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revocationReason" TEXT,
    "extendedAt" TIMESTAMP(3),
    "extendedById" TEXT,
    "extensionReason" TEXT,
    "metadata" TEXT,

    CONSTRAINT "xero_validation_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_userId_projectId_key" ON "project_assignments"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_submissions_userId_weekStartDate_key" ON "timesheet_submissions"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_submission_entries_submissionId_timeEntryId_key" ON "timesheet_submission_entries"("submissionId", "timeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_preferences_userId_key" ON "ai_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_queue_status_scheduledFor_idx" ON "notification_queue"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "notifications_scheduledFor_idx" ON "notifications"("scheduledFor");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "xero_sync_logs_submissionId_idx" ON "xero_sync_logs"("submissionId");

-- CreateIndex
CREATE INDEX "xero_sync_logs_operation_status_idx" ON "xero_sync_logs"("operation", "status");

-- CreateIndex
CREATE INDEX "xero_sync_logs_createdAt_idx" ON "xero_sync_logs"("createdAt");

-- CreateIndex
CREATE INDEX "xero_quarantine_records_entityType_entityId_idx" ON "xero_quarantine_records"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "xero_quarantine_records_status_priority_idx" ON "xero_quarantine_records"("status", "priority");

-- CreateIndex
CREATE INDEX "xero_quarantine_records_quarantinedAt_idx" ON "xero_quarantine_records"("quarantinedAt");

-- CreateIndex
CREATE INDEX "xero_quarantine_records_reviewedBy_idx" ON "xero_quarantine_records"("reviewedBy");

-- CreateIndex
CREATE INDEX "xero_validation_logs_entityType_entityId_idx" ON "xero_validation_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "xero_validation_logs_validatedAt_idx" ON "xero_validation_logs"("validatedAt");

-- CreateIndex
CREATE INDEX "xero_validation_logs_passed_idx" ON "xero_validation_logs"("passed");

-- CreateIndex
CREATE INDEX "xero_error_escalations_escalatedTo_status_idx" ON "xero_error_escalations"("escalatedTo", "status");

-- CreateIndex
CREATE INDEX "xero_error_escalations_escalatedAt_idx" ON "xero_error_escalations"("escalatedAt");

-- CreateIndex
CREATE INDEX "xero_validation_overrides_entityType_entityId_idx" ON "xero_validation_overrides"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "xero_validation_overrides_status_idx" ON "xero_validation_overrides"("status");

-- CreateIndex
CREATE INDEX "xero_validation_overrides_createdById_idx" ON "xero_validation_overrides"("createdById");

-- CreateIndex
CREATE INDEX "xero_validation_overrides_overrideType_idx" ON "xero_validation_overrides"("overrideType");

-- CreateIndex
CREATE INDEX "xero_validation_overrides_expiresAt_idx" ON "xero_validation_overrides"("expiresAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_submissions" ADD CONSTRAINT "timesheet_submissions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_submissions" ADD CONSTRAINT "timesheet_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_submission_entries" ADD CONSTRAINT "timesheet_submission_entries_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "timesheet_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_submission_entries" ADD CONSTRAINT "timesheet_submission_entries_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_patterns" ADD CONSTRAINT "time_patterns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_patterns" ADD CONSTRAINT "time_patterns_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_patterns" ADD CONSTRAINT "time_patterns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_entries" ADD CONSTRAINT "voice_entries_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_entries" ADD CONSTRAINT "voice_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_templates" ADD CONSTRAINT "time_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_templates" ADD CONSTRAINT "time_templates_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_templates" ADD CONSTRAINT "time_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_validation_overrides" ADD CONSTRAINT "xero_validation_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_validation_overrides" ADD CONSTRAINT "xero_validation_overrides_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_validation_overrides" ADD CONSTRAINT "xero_validation_overrides_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_validation_overrides" ADD CONSTRAINT "xero_validation_overrides_extendedById_fkey" FOREIGN KEY ("extendedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
