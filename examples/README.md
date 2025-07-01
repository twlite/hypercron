# HyperCron Examples

This directory contains TypeScript examples demonstrating various features of HyperCron.

## Examples

### 1. Basic Usage (`basic-usage.ts`)

Demonstrates the fundamental features of HyperCron:

- Scheduling jobs with cron expressions
- Scheduling one-time jobs
- Starting and stopping the service
- Basic job cancellation
- Getting job statistics

**Run with:**

```bash
npx tsx examples/basic-usage.ts
```

### 2. Job Lifecycle (`job-lifecycle.ts`)

Shows how to manage job states:

- Pausing and resuming jobs
- Monitoring job status changes
- Tracking job execution counts
- Job cancellation

**Run with:**

```bash
npx tsx examples/job-lifecycle.ts
```

### 3. Monitoring (`monitoring.ts`)

Demonstrates comprehensive monitoring capabilities:

- Real-time job statistics
- Individual job tracking
- Performance metrics
- Job cleanup operations

**Run with:**

```bash
npx tsx examples/monitoring.ts
```

### 4. Advanced Usage (`advanced-usage.ts`)

Shows advanced features and custom configuration:

- Custom driver configuration
- Complex cron patterns
- Error handling in jobs
- Driver switching
- Business-hour scheduling

**Run with:**

```bash
npx tsx examples/advanced-usage.ts
```

### 5. Load Testing (`load-test.ts`)

Demonstrates HyperCron's scalability with thousands of jobs:

- Batch job scheduling
- Performance monitoring
- Memory usage tracking
- Query performance testing
- Scalability metrics

**Run with:**

```bash
npx tsx examples/load-test.ts
```

### 6. Extreme Load Testing (`extreme-load-test.ts`)

Tests HyperCron's ability to handle millions of cron jobs:

- Mass job scheduling (100k - 1M jobs)
- Extreme performance optimization
- Memory efficiency testing
- Bulk operation performance
- Production-scale testing

**Run with:**

```bash
npx tsx examples/extreme-load-test.ts
```

**⚠️ Warning:** The extreme load test requires significant system resources and may take a long time to complete. Make sure you have sufficient RAM and disk space.

### 7. Cleanup Example (`cleanup-example.ts`)

Demonstrates the cleanup functionality for managing job history:

- Cleaning up completed jobs
- Cleaning up cancelled jobs
- Combined cleanup operations
- Job statistics before and after cleanup
- Automatic database maintenance

**Run with:**

```bash
npx tsx examples/cleanup-example.ts
```

### 8. Auto-Cleanup Example (`auto-cleanup-example.ts`)

Demonstrates the automatic cleanup functionality with different configurations:

- Default auto-cleanup settings (enabled by default)
- Custom auto-cleanup intervals and retention periods
- Disabled auto-cleanup with manual triggers
- Real-time auto-cleanup monitoring
- Auto-cleanup status and configuration

**Run with:**

```bash
npx tsx examples/auto-cleanup-example.ts
```

### 9. Retry Example (`retry-example.ts`)

Demonstrates the retry functionality with exponential backoff and error handling:

- Default retry configuration (3 attempts with exponential backoff)
- Custom retry settings with different attempt counts and delays
- Custom error handlers for failed job executions
- No retry configuration for immediate failure
- Exponential backoff timing demonstration

**Run with:**

```bash
npx tsx examples/retry-example.ts
```

## Prerequisites

Make sure you have the required dependencies installed:

```bash
pnpm install
```

## Running Examples

All examples use TypeScript and import from the local source code. You can run them using:

```bash
# Using tsx (recommended)
npx tsx examples/basic-usage.ts

# Or using ts-node
npx ts-node examples/basic-usage.ts

# Or compile and run
npx tsc examples/basic-usage.ts
node examples/basic-usage.js
```

## What to Expect

Each example will:

1. Schedule various types of jobs
2. Start the cron service
3. Monitor job execution
4. Display statistics and status information
5. Clean up and stop the service

The examples use different timing patterns to demonstrate various use cases. Some jobs run every few seconds for demonstration purposes, while others use more realistic scheduling patterns.

## Database Files

Examples create SQLite database files in the project root:

- `cron.db` - Default database for basic examples
- `advanced-example.db` - Database for advanced usage example
- `second-example.db` - Secondary database for driver switching demo
- `load-test.db` - Database for load testing (can be large)
- `extreme-load-test.db` - Database for extreme load testing (very large)
- `cleanup-example.db` - Database for cleanup functionality demo
- `auto-cleanup-*.db` - Databases for auto-cleanup examples
- `retry-*.db` - Databases for retry functionality examples

These files will be created automatically when you run the examples. Load test databases can be quite large, so make sure you have sufficient disk space.
