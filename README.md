# HyperCron

A comprehensive cron job management system with persistent storage and automatic execution.

## Features

- **Flexible Scheduling**: Support for cron expressions, timestamps, and Date objects
- **Persistent Storage**: SQLite-based storage with automatic job recovery
- **Job Lifecycle Management**: Active, paused, cancelled, and completed states
- **Automatic Execution**: Jobs run automatically at scheduled times
- **Retry Mechanism**: Exponential backoff retry with configurable attempts
- **Error Handling**: Custom error handlers and robust error management
- **Auto-Cleanup**: Automatic cleanup of old completed and cancelled jobs
- **Performance Optimization**: Chunked loading and efficient queries
- **Monitoring & Statistics**: Comprehensive job tracking and metrics
- **TypeScript Support**: Full type safety throughout

## Installation

```bash
npm i hypercron
```

**Note**: This library uses `cron-parser` for parsing cron expressions, which is included as a dependency.

## Quick Start

```typescript
import { schedule, cancel, cronService } from 'hypercron';

// Schedule a job that runs every minute
await schedule('* * * * *', 'my-job', async () => {
  console.log('Job executed!');
});

// Start the service
await cronService.start();

// Later, cancel the job
await cancel('my-job');
```

## Usage

### Basic Scheduling

```typescript
import { schedule, cronService } from 'hypercron';

// Schedule with cron expression
await schedule('0 0 * * *', 'daily-backup', async () => {
  await performBackup();
});

// Schedule with specific time
await schedule(Date.now() + 60000, 'one-time-task', async () => {
  console.log('One-time task executed!');
});

// Start the service
await cronService.start();
```

### Job Management

```typescript
import { cronService } from 'hypercron';

// Pause a job
await cronService.pause('daily-backup');

// Resume a job
await cronService.resume('daily-backup');

// Cancel a job
await cronService.cancel('daily-backup');

// Get job status
const job = await cronService.get('daily-backup');
console.log(job?.status); // 'active' | 'paused' | 'cancelled' | 'completed'
```

### Monitoring and Statistics

```typescript
import { cronService } from 'hypercron';

// Get comprehensive statistics
const stats = await cronService.getJobStats();
console.log(stats);
// {
//   total: 10,
//   active: 5,
//   paused: 2,
//   cancelled: 1,
//   completed: 2,
//   totalRuns: 150
// }

// Get specific metrics
const activeCount = await cronService.getActiveJobsCount();
const runCount = await cronService.getJobRunCount('daily-backup');
const totalRuns = await cronService.getTotalRunsCount();
```

### Auto-Cleanup

HyperCron includes automatic cleanup functionality to manage database size by removing old completed and cancelled jobs.

#### Default Auto-Cleanup

Auto-cleanup is enabled by default with the following settings:

- **Interval**: 24 hours
- **Completed Jobs Retention**: 7 days
- **Cancelled Jobs Retention**: 30 days

```typescript
import { cronService } from 'hypercron';

// Auto-cleanup runs automatically when the service is started
await cronService.start();

// Check auto-cleanup status
const status = cronService.getAutoCleanupStatus();
console.log(status);
// {
//   enabled: true,
//   interval: 86400000,
//   completedJobsRetentionDays: 7,
//   cancelledJobsRetentionDays: 30,
//   isRunning: true
// }
```

#### Custom Auto-Cleanup Configuration

```typescript
import { CronService, SqliteDriver } from 'hypercron';

const driver = new SqliteDriver({
  db: 'custom-cron.db',
  autoCleanup: {
    enabled: true,
    interval: 12 * 60 * 60 * 1000, // 12 hours
    completedJobsRetentionDays: 3, // Keep completed jobs for 3 days
    cancelledJobsRetentionDays: 7, // Keep cancelled jobs for 7 days
  },
});

const customService = new CronService(driver);
await customService.start();
```

#### Manual Cleanup

```typescript
import { cronService } from 'hypercron';

// Manually trigger cleanup with current settings
const result = await cronService.triggerAutoCleanup();
console.log(result);
// { completed: 5, cancelled: 2 }

// Manual cleanup with custom retention periods
const customResult = await cronService.cleanupAllOldJobs(1, 5);
console.log(customResult);
// { completed: 10, cancelled: 3 }
```

#### Disable Auto-Cleanup

```typescript
import { CronService, SqliteDriver } from 'hypercron';

const driver = new SqliteDriver({
  db: 'no-cleanup.db',
  autoCleanup: {
    enabled: false,
  },
});

const service = new CronService(driver);
await service.start();
```

### Retry and Error Handling

HyperCron includes configurable retry logic with exponential backoff for failed job executions.

#### Default Retry Configuration

By default, jobs will retry up to 3 times with exponential backoff:

- **Base Delay**: 1 second
- **Max Delay**: 30 seconds
- **Max Attempts**: 3

```typescript
import { cronService } from 'hypercron';

// Jobs automatically retry on failure
await cronService.schedule('* * * * *', 'retry-job', async () => {
  // This job will retry up to 3 times if it fails
  await riskyOperation();
});

// Check retry configuration
const retryConfig = cronService.getRetryConfig();
console.log(retryConfig);
// {
//   maxAttempts: 3,
//   baseDelay: 1000,
//   maxDelay: 30000,
//   hasErrorHandler: false
// }
```

#### Custom Retry Configuration

```typescript
import { CronService, SqliteDriver } from 'hypercron';

const driver = new SqliteDriver({
  db: 'custom-retry.db',
  retry: {
    maxAttempts: 5,
    baseDelay: 500, // 500ms base delay
    maxDelay: 10000, // 10 second max delay
  },
});

const customService = new CronService(driver);
await customService.start();
```

#### Custom Error Handling

```typescript
import { CronService, SqliteDriver } from 'hypercron';

const driver = new SqliteDriver({
  db: 'error-handler.db',
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
  },
  onError: (jobId: string, error: Error) => {
    // Custom error handling
    console.error(`Job ${jobId} failed:`, error.message);
    // Send to monitoring service, log to file, etc.
  },
});

const service = new CronService(driver);
await service.start();
```

#### Disable Retries

```typescript
import { CronService, SqliteDriver } from 'hypercron';

const driver = new SqliteDriver({
  db: 'no-retry.db',
  retry: {
    maxAttempts: 1, // No retries
  },
});

const service = new CronService(driver);
await service.start();
```

````

### Custom Configuration

```typescript
import { CronService, SqliteDriver } from 'hypercron';

// Create custom driver with specific configuration
const driver = new SqliteDriver({
  db: 'custom-cron.db',
  chunkSize: 500,
  refreshInterval: 12 * 60 * 60 * 1000, // 12 hours
  lookAheadWindow: 13 * 60 * 60 * 1000, // 13 hours
});

// Create service with custom driver
const customService = new CronService(driver);

// Initialize and start
await customService.start();
````

## API Reference

### CronService

The main service class for managing cron jobs.

#### Constructor

```typescript
new CronService(driver: Driver)
```

#### Methods

- `schedule(scheduleInput, identifier, handler)` - Schedule a new job
- `cancel(identifier)` - Cancel a job
- `pause(identifier)` - Pause a job
- `resume(identifier)` - Resume a job
- `get(identifier)` - Get job details
- `getJobStatus(identifier)` - Get job status
- `getJobRunCount(identifier)` - Get job run count
- `getActiveJobsCount()` - Get count of active jobs
- `getCompletedJobsCount()` - Get count of completed jobs
- `getTotalRunsCount()` - Get total run count
- `getJobsInWindow()` - Get jobs in execution window
- `getJobStats()` - Get comprehensive statistics
- `cleanupOldJobs(olderThanDays?)` - Remove old cancelled jobs
- `cleanupCompletedJobs(olderThanDays?)` - Remove old completed jobs
- `cleanupAllOldJobs(completedOlderThanDays?, cancelledOlderThanDays?)` - Remove both old completed and cancelled jobs
- `triggerAutoCleanup()` - Manually trigger auto-cleanup with current settings
- `getAutoCleanupStatus()` - Get auto-cleanup configuration and status
- `getRetryConfig()` - Get retry configuration and error handler status
- `start()` - Start the service
- `stop()` - Stop the service
- `setDriver(driver)` - Change the underlying driver

### SqliteDriver

SQLite-based driver for persistent job storage.

#### Constructor

```typescript
new SqliteDriver(config: CronServiceConfig)
```

#### Configuration Options

- `db` (string) - Database file path
- `chunkSize` (number, optional) - Maximum jobs per chunk (default: 1000)
- `refreshInterval` (number, optional) - Refresh interval in ms (default: 24 hours)
- `lookAheadWindow` (number, optional) - Look-ahead window in ms (default: 25 hours)
- `autoCleanup` (object, optional) - Auto-cleanup configuration
  - `enabled` (boolean, optional) - Enable auto-cleanup (default: true)
  - `interval` (number, optional) - Cleanup interval in ms (default: 24 hours)
  - `completedJobsRetentionDays` (number, optional) - Days to keep completed jobs (default: 7)
  - `cancelledJobsRetentionDays` (number, optional) - Days to keep cancelled jobs (default: 30)
- `retry` (object, optional) - Retry configuration
  - `maxAttempts` (number, optional) - Maximum retry attempts (default: 3)
  - `baseDelay` (number, optional) - Base delay in ms for exponential backoff (default: 1000)
  - `maxDelay` (number, optional) - Maximum delay in ms (default: 30000)
- `onError` (function, optional) - Custom error handler function

#### Methods

All methods from the Driver interface, plus:

- `init()` - Initialize the driver
- `destroy()` - Clean up resources

### Types

#### CronJob

```typescript
interface CronJob {
  id: string;
  cron_expression: string | null;
  specific_time: number | null;
  identifier: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  next_run: number;
  last_run: number | null;
  run_count: number;
  created_at: number;
  updated_at: number;
}
```

#### CronHandler

```typescript
type CronHandler = () => Promise<void> | void;
```

#### ScheduleInput

```typescript
type ScheduleInput = string | number | Date;
```

## Cron Expression Format

HyperCron uses `cron-parser` for parsing cron expressions, which supports standard cron format with additional features:

```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, where 0 and 7 are Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

### Standard Examples

- `* * * * *` - Every minute
- `0 * * * *` - Every hour
- `0 0 * * *` - Every day at midnight
- `0 0 * * 0` - Every Sunday at midnight
- `0 12 * * 1-5` - Every weekday at noon

### Advanced Examples

- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of every month
- `0 0 1 1 *` - January 1st every year
- `0 9-17 * * 1-5` - Every hour between 9 AM and 5 PM on weekdays
- `0 0 1,15 * *` - 1st and 15th of every month

## Error Handling

Jobs should handle their own errors internally. If a job throws an error, it will be logged but won't prevent other jobs from running.

```typescript
await schedule('* * * * *', 'error-handling-job', async () => {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('Job failed:', error);
    // Handle error appropriately
  }
});
```

## Dependencies

HyperCron uses the following key dependencies:

- **cron-parser**: For parsing and validating cron expressions
- **node:sqlite**: For persistent job storage (built into Node.js)
- **node:crypto**: For generating unique job IDs (built into Node.js)

## Performance Considerations

- **Chunk Size**: Adjust `chunkSize` based on your job volume
- **Refresh Interval**: Longer intervals reduce database load but may delay job discovery
- **Look-ahead Window**: Should be longer than refresh interval for optimal performance
- **Database Indexes**: Automatically created for optimal query performance

## License

MIT
