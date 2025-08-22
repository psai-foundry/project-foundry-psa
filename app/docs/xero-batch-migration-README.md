
# Xero Batch Migration System - Phase 2B-5

## Overview

This document outlines the implementation of the Xero Batch Migration System (Phase 2B-5) for the Project Foundry PSA platform. This system provides comprehensive infrastructure for migrating historical approved timesheets to Xero with progress tracking, error handling, and recovery mechanisms.

## ⚠️ Important Safety Notice

**NO DATA IS AUTOMATICALLY MIGRATED** - This system provides the infrastructure and tools for batch migration but does not automatically sync any data. All migrations must be manually initiated and are controlled by admin users.

## Key Features

### 🔍 Migration Analysis
- **Migration Requirements Analysis**: Identifies pending migration data
- **Data Validation**: Pre-migration validation to catch issues
- **Estimation Tools**: Provides duration and resource estimates

### 🛠️ Batch Processing
- **Configurable Batch Sizes**: Process 1-100 records per batch
- **Rate Limiting**: Configurable delays between batches to respect API limits
- **Retry Mechanisms**: Automatic retry with configurable max attempts
- **Dry Run Mode**: Test migrations without sending data to Xero

### 📊 Progress Monitoring
- **Real-time Progress Tracking**: Live updates on migration status
- **Detailed Metrics**: Success rates, error counts, and timing information
- **Error Logging**: Comprehensive error tracking and reporting
- **Migration History**: Complete audit trail of all migrations

### 🎛️ Migration Control
- **Start/Pause/Resume/Cancel**: Full control over migration processes
- **Date Range Filtering**: Migrate specific time periods
- **Administrative Controls**: Admin-only access with proper authentication

## System Components

### Core Service: `XeroBatchMigrationService`
**Location**: `/lib/xero-batch-migration.ts`

**Key Methods**:
- `analyzeMigrationRequirements()`: Safe analysis of historical data
- `validateHistoricalData()`: Data validation without migration
- `startBatchMigration(config)`: Initiates migration with configuration
- `getBatchMigrationProgress(id)`: Returns migration progress
- `pauseBatchMigration(id)`: Pauses active migration
- `resumeBatchMigration(id)`: Resumes paused migration
- `cancelBatchMigration(id)`: Cancels active migration

### API Endpoints

#### Main Migration Management
- **POST** `/api/xero/batch-migration`: Start new batch migration
- **GET** `/api/xero/batch-migration`: List active migrations

#### Individual Migration Control  
- **GET** `/api/xero/batch-migration/[id]`: Get migration progress
- **PUT** `/api/xero/batch-migration/[id]`: Control migration (pause/resume/cancel)

#### Analysis and Validation
- **GET** `/api/xero/batch-migration/analyze`: Analyze migration requirements
- **GET** `/api/xero/batch-migration/validate`: Validate historical data

### User Interface: `XeroBatchMigrationDashboard`
**Location**: `/components/xero-batch-migration-dashboard.tsx`

**Tabs**:
1. **Overview**: Migration summary and requirements analysis
2. **Validate**: Pre-migration data validation
3. **Configure**: Migration settings and configuration
4. **Monitor**: Real-time migration monitoring and control

## Configuration Options

### Batch Configuration
```typescript
interface BatchMigrationConfig {
  batchSize: number;              // 1-100 records per batch (default: 50)
  delayBetweenBatches: number;    // Milliseconds between batches (default: 2000)
  maxRetries: number;             // Maximum retry attempts (default: 3)
  dryRun: boolean;                // Test mode - no actual migration (default: true)
  dateRange?: {                   // Optional date filtering
    startDate: Date;
    endDate: Date;
  };
  includeRejected?: boolean;      // Include rejected timesheets (default: false)
}
```

### Safety Features

#### Default Dry Run Mode
All migrations default to dry run mode for safety. Administrators must explicitly enable live migration.

#### Admin-Only Access
All batch migration functionality is restricted to users with ADMIN role.

#### Connection Validation
System validates Xero connection before allowing any migration operations.

#### Data Validation
Pre-migration validation identifies potential issues:
- Missing user email addresses
- Missing client information
- Missing bill rates for billable entries
- Invalid data structures

## Historical Data Scope

The system migrates:
- **Approved Timesheet Submissions**: All `status = 'APPROVED'` records
- **Associated Time Entries**: Detailed hour breakdowns and project/task assignments
- **Master Data Dependencies**: Ensures required clients and projects exist in Xero
- **Pre-Integration Data**: Timesheets approved before real-time sync was active

## Progress Tracking

### Migration Progress Interface
```typescript
interface BatchMigrationProgress {
  id: string;                     // Unique migration identifier
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  totalRecords: number;           // Total records to process
  processedRecords: number;       // Records processed so far
  successfulRecords: number;      // Successfully migrated records
  failedRecords: number;          // Failed records
  currentBatch: number;           // Current batch being processed
  totalBatches: number;           // Total number of batches
  startedAt: Date;                // Migration start time
  estimatedCompletionAt?: Date;   // Estimated completion time
  lastBatchAt?: Date;             // Last batch processing time
  errors: Array<{                 // Error details
    recordId: string;
    error: string;
    timestamp: Date;
    retryCount: number;
  }>;
}
```

## Error Handling

### Validation Errors
- **Error Severity**: Warning vs Error classification
- **Issue Tracking**: Record-level issue identification
- **Pre-flight Checks**: Validation before migration starts

### Runtime Errors
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Logging**: Detailed error tracking with timestamps
- **Partial Recovery**: Continue processing other records when individual records fail
- **Migration Cancellation**: Safe cancellation with cleanup

## Integration Points

### Database Schema
The system uses existing models:
- `TimesheetSubmission`: Source data for migration
- `XeroSyncLog`: Tracks migration history and prevents duplicates
- `XeroConnection`: Validates Xero connectivity

### Existing Services
- **XeroSyncService**: Handles individual timesheet synchronization
- **XeroApiWrapper**: Manages Xero API connectivity
- **Queue Infrastructure**: Leverages existing queue system for background processing

## Usage Workflow

### 1. Analysis Phase
1. Navigate to Settings → Batch Migration → Overview
2. Review migration summary and requirements
3. Check estimated duration and data volumes

### 2. Validation Phase
1. Switch to Validate tab
2. Run data validation to identify issues
3. Review and resolve any critical errors

### 3. Configuration Phase
1. Switch to Configure tab
2. Set batch size and processing delays
3. Configure date ranges if needed
4. **Enable dry run mode for initial testing**

### 4. Testing Phase
1. Start dry run migration
2. Monitor progress in Monitor tab
3. Review validation results and error logs

### 5. Live Migration Phase
1. Disable dry run mode in configuration
2. Start live migration
3. Monitor progress and handle any errors
4. Verify results in Xero

## Monitoring and Alerts

### Real-time Monitoring
- Live progress updates every 5 seconds
- Batch-by-batch status tracking
- Success rate calculations
- Error rate monitoring

### Visual Indicators
- Color-coded status badges
- Progress bars with percentage completion
- Error count displays
- Timing information

## Security Considerations

### Access Control
- Admin-only functionality
- Session-based authentication required
- Role-based permission checking

### Data Protection
- No automatic migration execution
- Dry run mode by default
- Comprehensive audit logging
- Safe cancellation mechanisms

## Next Steps

After implementing this batch migration system:

1. **Test with Dry Run**: Thoroughly test the system with dry run mode
2. **Configure Xero OAuth**: Complete Xero authentication setup
3. **Small Batch Testing**: Start with small batches for live testing
4. **Monitor Performance**: Track system performance and optimize as needed
5. **Scale Gradually**: Increase batch sizes based on system capacity

## Support and Troubleshooting

### Common Issues
- **Connection Errors**: Verify Xero OAuth configuration
- **Rate Limiting**: Increase delays between batches
- **Data Validation**: Resolve validation errors before migration
- **Memory Issues**: Reduce batch size for large datasets

### Monitoring Points
- API rate limit consumption
- Database performance during large migrations
- Memory usage during batch processing
- Error patterns and retry effectiveness

## Conclusion

The Xero Batch Migration System provides a comprehensive, safe, and controlled approach to migrating historical timesheet data. With built-in validation, progress tracking, and error handling, administrators have full control over the migration process while maintaining data integrity and system stability.

The system is designed to handle the complexity of large-scale data migration while providing clear feedback and control mechanisms for administrators to ensure successful migration of historical approved timesheets to Xero.
