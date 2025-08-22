-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('STAFF', 'CONTRACTOR', 'AGENCY', 'PROJECT_SERVICES');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SponsorType" AS ENUM ('IT', 'BUSINESS');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('ACTUAL', 'FORECAST');

-- CreateEnum
CREATE TYPE "ReviewFrequency" AS ENUM ('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "GovernanceMeetingDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "MaturityLevel" AS ENUM ('STARTUP', 'GROWING', 'ESTABLISHED', 'MATURE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AllocationScenario" AS ENUM ('OPTIMISTIC', 'MOST_LIKELY', 'PESSIMISTIC');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeatureRequestStatus" AS ENUM ('UNDER_REVIEW', 'IN_BACKLOG', 'IN_DEVELOPMENT', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeaturePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EffortEstimate" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('COUNTER', 'GAUGE', 'HISTOGRAM', 'TIMER');

-- CreateEnum
CREATE TYPE "HealthCheckType" AS ENUM ('AVAILABILITY', 'PERFORMANCE', 'FUNCTIONAL', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PipelineType" AS ENUM ('SYNC', 'VALIDATION', 'PROCESSING', 'REPORTING', 'BULK_OPERATION');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'AUTOMATIC', 'EVENT_DRIVEN');

-- CreateEnum
CREATE TYPE "AlertCondition" AS ENUM ('GREATER_THAN', 'LESS_THAN', 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN_OR_EQUALS', 'CONTAINS', 'MATCHES_PATTERN');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNING';
ALTER TYPE "ProjectStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "actualEffort" DOUBLE PRECISION,
ADD COLUMN     "businessFunction" TEXT,
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "countryList" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "estimatedEffort" DOUBLE PRECISION,
ADD COLUMN     "itSponsorId" TEXT,
ADD COLUMN     "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "worldRegion" TEXT;

-- CreateTable
CREATE TABLE "resource_owners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "department" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "annualSalary" DOUBLE PRECISION,
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "bauAllocationPercentage" INTEGER NOT NULL DEFAULT 60,
    "projectAllocationPercentage" INTEGER NOT NULL DEFAULT 40,
    "resourceOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "type" "SponsorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_business_sponsors" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,

    CONSTRAINT "project_business_sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "allocationPercentage" DOUBLE PRECISION NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "role" TEXT NOT NULL,
    "billableRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_allocations" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "projectId" TEXT,
    "weekStartDate" DATE NOT NULL,
    "allocation" DOUBLE PRECISION NOT NULL,
    "type" "AllocationType" NOT NULL DEFAULT 'ACTUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_resource_allocations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "allocationDays" DOUBLE PRECISION NOT NULL,
    "scenario" "AllocationScenario" NOT NULL DEFAULT 'MOST_LIKELY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarterly_rocks" (
    "id" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarterly_rocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_management_calendar" (
    "id" TEXT NOT NULL,
    "dayZero" DATE NOT NULL,
    "forecastingPeriodMonths" INTEGER NOT NULL DEFAULT 3,
    "reviewFrequency" "ReviewFrequency" NOT NULL DEFAULT 'MONTHLY',
    "governanceMeetingDay" "GovernanceMeetingDay" NOT NULL DEFAULT 'FRIDAY',
    "governanceMeetingTime" TEXT NOT NULL DEFAULT '09:00:00',
    "submissionDeadlineDays" INTEGER NOT NULL DEFAULT 2,
    "nextGovernanceMeeting" DATE,
    "nextSubmissionDeadline" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_management_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Your Company',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1e40af',
    "secondaryColor" TEXT NOT NULL DEFAULT '#64748b',
    "accentColor" TEXT NOT NULL DEFAULT '#f97316',
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "workingHoursPerDay" INTEGER NOT NULL DEFAULT 8,
    "managementOverheadMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.4,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "fiscalYearStart" TEXT NOT NULL DEFAULT '01-01',
    "defaultRole" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "maturityLevel" "MaturityLevel" NOT NULL DEFAULT 'GROWING',
    "labelsConfig" JSONB NOT NULL DEFAULT '{"resources": "Resources", "projects": "Projects", "portfolios": "Portfolios", "capacity": "Capacity", "utilization": "Utilization", "allocation": "Allocation"}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "bugType" TEXT NOT NULL,
    "severity" "BugSeverity" NOT NULL,
    "status" "BugStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "stepsToReproduce" TEXT,
    "expectedBehavior" TEXT,
    "actualBehavior" TEXT,
    "browserInfo" TEXT,
    "additionalInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_comments" (
    "id" TEXT NOT NULL,
    "bugId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "priority" "FeaturePriority" NOT NULL,
    "status" "FeatureRequestStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "userType" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "proposedSolution" TEXT NOT NULL,
    "businessValue" TEXT NOT NULL,
    "userStories" TEXT,
    "acceptanceCriteria" TEXT,
    "effortEstimate" "EffortEstimate",
    "additionalNotes" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_comments" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_votes" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "tags" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'system',
    "executionId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "timeWindow" TEXT,
    "aggregationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health_checks" (
    "id" TEXT NOT NULL,
    "checkType" "HealthCheckType" NOT NULL,
    "component" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "details" JSONB,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedMax" DOUBLE PRECISION,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_metrics" (
    "id" TEXT NOT NULL,
    "pipelineType" "PipelineType" NOT NULL,
    "executionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalDuration" DOUBLE PRECISION,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsSuccessful" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "itemsSkipped" INTEGER NOT NULL DEFAULT 0,
    "memoryUsage" DOUBLE PRECISION,
    "cpuUsage" DOUBLE PRECISION,
    "dbQueries" INTEGER NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "triggeredBy" TEXT,
    "triggerType" "TriggerType" NOT NULL,
    "batchSize" INTEGER,
    "status" "PipelineStatus" NOT NULL DEFAULT 'RUNNING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "condition" "AlertCondition" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "timeWindow" INTEGER NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "suppressDuration" INTEGER NOT NULL DEFAULT 60,
    "notificationChannels" JSONB NOT NULL,
    "escalationRules" JSONB,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "affectedEntity" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "notificationsSent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_owners_email_key" ON "resource_owners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_business_sponsors_projectId_sponsorId_key" ON "project_business_sponsors"("projectId", "sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "project_resource_allocations_projectId_resourceId_weekStart_key" ON "project_resource_allocations"("projectId", "resourceId", "weekStartDate", "scenario");

-- CreateIndex
CREATE UNIQUE INDEX "feature_votes_featureId_userId_key" ON "feature_votes"("featureId", "userId");

-- CreateIndex
CREATE INDEX "performance_metrics_metricType_timestamp_idx" ON "performance_metrics"("metricType", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_entityType_entityId_idx" ON "performance_metrics"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "performance_metrics_name_timestamp_idx" ON "performance_metrics"("name", "timestamp");

-- CreateIndex
CREATE INDEX "performance_metrics_executionId_idx" ON "performance_metrics"("executionId");

-- CreateIndex
CREATE INDEX "performance_metrics_timeWindow_aggregationType_idx" ON "performance_metrics"("timeWindow", "aggregationType");

-- CreateIndex
CREATE INDEX "system_health_checks_component_timestamp_idx" ON "system_health_checks"("component", "timestamp");

-- CreateIndex
CREATE INDEX "system_health_checks_status_timestamp_idx" ON "system_health_checks"("status", "timestamp");

-- CreateIndex
CREATE INDEX "system_health_checks_slaBreached_idx" ON "system_health_checks"("slaBreached");

-- CreateIndex
CREATE INDEX "pipeline_metrics_pipelineType_startedAt_idx" ON "pipeline_metrics"("pipelineType", "startedAt");

-- CreateIndex
CREATE INDEX "pipeline_metrics_status_idx" ON "pipeline_metrics"("status");

-- CreateIndex
CREATE INDEX "pipeline_metrics_executionId_idx" ON "pipeline_metrics"("executionId");

-- CreateIndex
CREATE INDEX "pipeline_metrics_triggeredBy_idx" ON "pipeline_metrics"("triggeredBy");

-- CreateIndex
CREATE INDEX "alert_rules_isActive_idx" ON "alert_rules"("isActive");

-- CreateIndex
CREATE INDEX "alert_rules_metricType_idx" ON "alert_rules"("metricType");

-- CreateIndex
CREATE INDEX "alerts_ruleId_status_idx" ON "alerts"("ruleId", "status");

-- CreateIndex
CREATE INDEX "alerts_severity_status_idx" ON "alerts"("severity", "status");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_itSponsorId_fkey" FOREIGN KEY ("itSponsorId") REFERENCES "sponsors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_resourceOwnerId_fkey" FOREIGN KEY ("resourceOwnerId") REFERENCES "resource_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_business_sponsors" ADD CONSTRAINT "project_business_sponsors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_business_sponsors" ADD CONSTRAINT "project_business_sponsors_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_allocations" ADD CONSTRAINT "capacity_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resource_allocations" ADD CONSTRAINT "project_resource_allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resource_allocations" ADD CONSTRAINT "project_resource_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "bug_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_comments" ADD CONSTRAINT "feature_comments_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_comments" ADD CONSTRAINT "feature_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_votes" ADD CONSTRAINT "feature_votes_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_votes" ADD CONSTRAINT "feature_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
