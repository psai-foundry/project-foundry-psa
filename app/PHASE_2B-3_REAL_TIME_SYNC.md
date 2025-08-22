
# Phase 2B-3: Real-time Sync Pipeline

## Overview
This phase implements a real-time synchronization pipeline that automatically syncs approved timesheets to Xero using an event-driven architecture with background job processing.

## Features

### 🚀 Real-time Event System
- **Automatic Triggering**: Syncs are triggered immediately when timesheets are approved
- **Event-driven Architecture**: Uses EventEmitter to decouple approval actions from sync operations
- **Audit Trail**: Complete logging of all sync operations and events

### ⚡ Background Job Queue
- **Redis-based Queue**: Uses Bull queue for reliable job processing
- **Priority System**: High priority for approval-triggered syncs
- **Retry Logic**: Automatic retry with exponential backoff
- **Job Persistence**: Failed jobs are kept for analysis and retry

### 📊 Monitoring & Management
- **Real-time Dashboard**: Live monitoring of queue status and sync statistics
- **Health Monitoring**: Connection status and performance metrics
- **Manual Controls**: Queue pause/resume, retry failed jobs, manual sync triggers
- **24-hour Statistics**: Success rates, error tracking, performance data

### 🔄 Sync Operations
- **Individual Sync**: Single timesheet submission sync
- **Batch Sync**: Date range and user-filtered bulk operations
- **Data Validation**: Pre-sync validation with error reporting
- **Duplicate Handling**: Smart detection and handling of existing entries

## Architecture

### Core Components

1. **Event System** (`/lib/events/timesheet-events.ts`)
   - Manages timesheet approval/rejection events
   - Triggers background sync jobs
   - Handles audit logging

2. **Queue System** (`/lib/queue/xero-sync-queue.ts`)
   - Redis-backed job queue using Bull
   - Multiple job types: sync-timesheet, batch-sync, health-check
   - Configurable retry and priority settings

3. **Sync Service** (`/lib/xero-sync-service.ts`)
   - Enhanced service for individual submission sync
   - Data validation and transformation
   - Error handling and logging

4. **API Endpoints**
   - `/api/xero/sync/manual` - Manual sync triggers
   - `/api/xero/sync/batch` - Batch sync operations
   - `/api/xero/sync/queue/status` - Queue monitoring and management

5. **Dashboard** (`/components/xero-realtime-sync-dashboard.tsx`)
   - Real-time monitoring interface
   - Queue management controls
   - Sync statistics and logs

### Data Flow

```
Timesheet Approval → Event Trigger → Queue Job → Xero Sync → Logging → Dashboard Update
```

## Database Schema

### XeroSyncLog
Tracks all sync operations with detailed information:

```sql
- id: Unique identifier
- submissionId: Related timesheet submission
- operation: Type of sync operation
- status: Current status (PENDING/RUNNING/SUCCESS/FAILED)
- details: JSON with sync results
- error: Error message if failed
- jobId: Queue job identifier
- trigger: What triggered the sync (approval/manual/scheduled)
- metadata: Additional context data
- duration: Processing time in milliseconds
- retryCount: Number of retry attempts
```

## Setup Requirements

### 1. Redis Server
```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. Environment Variables
Add to your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Existing Xero configuration from Phase 2B-1
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
XERO_ENVIRONMENT=sandbox
```

### 3. Database Migration
```bash
# Generate Prisma client with new schema
npx prisma generate

# Create migration for new models
npx prisma migrate dev --name add_xero_sync_log
```

## Usage

### Automatic Sync
Once configured, timesheets will automatically sync to Xero when approved:

1. User submits timesheet
2. Manager/Admin approves timesheet  
3. Approval triggers real-time sync event
4. Background job processes the sync
5. Results are logged and visible in dashboard

### Manual Sync
Use the dashboard or API endpoints to manually trigger syncs:

```javascript
// Manual sync specific submissions
POST /api/xero/sync/manual
{
  "submissionIds": ["sub_1", "sub_2"],
  "priority": "high"
}

// Batch sync date range
POST /api/xero/sync/batch
{
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31",
  "userIds": ["user_1", "user_2"], // optional
  "force": true // optional, updates existing
}
```

### Queue Management
Admin users can manage the queue through the dashboard:

- **Pause/Resume**: Control job processing
- **Retry Failed**: Reprocess failed jobs
- **Clear Failed**: Remove failed jobs from queue
- **Monitor Status**: View real-time statistics

## Benefits

### 🔄 Operational Efficiency
- **Eliminates Manual Work**: No more manual timesheet exports/imports
- **Real-time Processing**: Approved timesheets sync immediately  
- **Reduced Errors**: Automated data transformation and validation
- **Batch Operations**: Handle historical data efficiently

### 💰 Cash Flow Impact
- **Faster Billing**: Approved time appears in Xero immediately
- **Improved Accuracy**: Validated data reduces billing errors
- **Better Reporting**: Real-time financial data for decision making
- **Audit Compliance**: Complete transaction trail

### 📈 Scalability
- **Background Processing**: Doesn't block user interface
- **Queue System**: Handles high volumes and peak loads
- **Retry Logic**: Resilient to temporary failures
- **Monitoring**: Proactive issue detection and resolution

## Monitoring & Troubleshooting

### Dashboard Metrics
- Queue status (waiting, active, completed, failed)
- 24-hour success rates and statistics
- Recent sync activity and errors
- Connection status to Xero

### Common Issues

1. **Redis Connection**: Ensure Redis server is running
2. **Xero Authentication**: Check token expiration and permissions
3. **Data Validation**: Review validation errors in sync logs
4. **Rate Limits**: Monitor Xero API rate limit compliance

### Logging
All sync operations are logged to:
- Database: `XeroSyncLog` table for persistent storage
- Console: Server logs for real-time monitoring  
- Dashboard: UI display of recent activity

## Testing

### Development Setup
```bash
# Start Redis locally
redis-server

# Start application with queue worker
npm run dev
```

### Test Scenarios
1. Approve a timesheet and verify automatic sync
2. Trigger manual sync for specific submissions
3. Test batch sync with date range
4. Verify queue management functions
5. Simulate failures and test retry logic

## Production Considerations

### Redis Configuration
- Use Redis Cluster for high availability
- Configure appropriate memory limits
- Set up monitoring and alerting
- Regular backups of queue data

### Performance Tuning
- Adjust queue concurrency settings
- Monitor memory usage and optimize
- Set appropriate retry limits
- Configure queue cleanup schedules

### Monitoring
- Set up application performance monitoring
- Configure alerts for queue failures
- Monitor Xero API usage and limits
- Track sync success rates and response times

## Security

### Access Control
- Admin-only queue management functions
- API endpoint authentication required
- Sensitive data encrypted in transit
- Audit logging of all operations

### Data Protection
- Queue jobs contain minimal sensitive data
- Failed job cleanup to prevent data retention
- Secure Redis connection configuration
- Regular security audits and updates

---

This completes Phase 2B-3: Real-time Sync Pipeline, providing a robust, scalable solution for automatic Xero synchronization with comprehensive monitoring and management capabilities.
