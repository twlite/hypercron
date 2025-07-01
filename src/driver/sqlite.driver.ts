import type { Driver } from './driver';
import type { DatabaseSync } from 'node:sqlite';
import type {
  CronJob,
  CronHandler,
  ScheduleInput,
  CronServiceConfig,
} from '../types';
import * as crypto from 'node:crypto';
import { CronExpressionParser } from 'cron-parser';

/**
 * SQLite-based driver for cron job storage and execution.
 * Provides persistent storage with automatic job scheduling and execution.
 */
export class SqliteDriver implements Driver {
  private db!: DatabaseSync;
  private handlers = new Map<string, CronHandler>();
  private activeJobs = new Map<string, NodeJS.Timeout>();
  private chunkSize: number;
  private refreshInterval: number;
  private lookAheadWindow: number;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  public isInitialized = false;

  // Auto-cleanup properties
  private autoCleanupEnabled: boolean;
  private autoCleanupInterval: number;
  private completedJobsRetentionDays: number;
  private cancelledJobsRetentionDays: number;
  private autoCleanupTimer: NodeJS.Timeout | null = null;

  // Retry configuration
  private maxRetryAttempts: number;
  private retryBaseDelay: number;
  private retryMaxDelay: number;
  private onErrorHandler?: (jobId: string, error: Error) => void;

  /**
   * Create a new SQLite driver instance.
   * @param config - Configuration options for the driver
   */
  public constructor(private config: CronServiceConfig) {
    this.chunkSize = config.chunkSize || 1000;
    this.refreshInterval = config.refreshInterval || 24 * 60 * 60 * 1000;
    this.lookAheadWindow = config.lookAheadWindow || 25 * 60 * 60 * 1000;

    // Initialize auto-cleanup settings
    this.autoCleanupEnabled = config.autoCleanup?.enabled ?? true;
    this.autoCleanupInterval =
      config.autoCleanup?.interval ?? 24 * 60 * 60 * 1000;
    this.completedJobsRetentionDays =
      config.autoCleanup?.completedJobsRetentionDays ?? 7;
    this.cancelledJobsRetentionDays =
      config.autoCleanup?.cancelledJobsRetentionDays ?? 30;

    // Initialize retry settings
    this.maxRetryAttempts = config.retry?.maxAttempts ?? 3;
    this.retryBaseDelay = config.retry?.baseDelay ?? 1000;
    this.retryMaxDelay = config.retry?.maxDelay ?? 30000;
    this.onErrorHandler = config.onError;
  }

  /**
   * Initialize the driver and prepare the database.
   * This method must be called before using any other driver methods.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    const { DatabaseSync } = await import('node:sqlite');

    this.db = new DatabaseSync(this.config.db, { open: true });

    this.initializeDatabase();
    this.isInitialized = true;
  }

  /**
   * Clean up resources and close database connections.
   * This method should be called when the driver is no longer needed.
   */
  public async destroy(): Promise<void> {
    await this.stop();

    // Ensure auto-cleanup is stopped
    this.stopAutoCleanup();

    if (this.db) {
      this.db.close();
      this.db = undefined as any;
    }

    this.handlers.clear();
    this.activeJobs.clear();
    this.isInitialized = false;
  }

  private async ensureDatabase() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  private initializeDatabase(): void {
    this.db.exec(/* sql */ `PRAGMA journal_mode = WAL;`);

    this.db.exec(/* sql */ `
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id TEXT PRIMARY KEY,
        cron_expression TEXT,
        specific_time INTEGER,
        identifier TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
        next_run INTEGER NOT NULL,
        last_run INTEGER,
        run_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        CONSTRAINT check_schedule_type CHECK (
          (cron_expression IS NOT NULL AND specific_time IS NULL) OR
          (cron_expression IS NULL AND specific_time IS NOT NULL)
        )
      )
    `);

    this.db.exec(/* sql */ `
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_status_next_run 
      ON cron_jobs(status, next_run)
    `);

    this.db.exec(/* sql */ `
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_identifier 
      ON cron_jobs(identifier)
    `);

    this.db.exec(/* sql */ `
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_run_count 
      ON cron_jobs(run_count)
    `);
  }

  private parseScheduleInput(input: ScheduleInput): {
    cronExpression: string | null;
    specificTime: number | null;
    nextRun: number;
  } {
    if (typeof input === 'string') {
      try {
        const interval = CronExpressionParser.parse(input);
        const nextRun = interval.next().getTime();
        return {
          cronExpression: input,
          specificTime: null,
          nextRun,
        };
      } catch (error) {
        throw new Error(`Invalid cron expression: ${input}`);
      }
    } else {
      const timestamp = input instanceof Date ? input.getTime() : input;
      if (timestamp <= Date.now()) {
        throw new Error('Specific time must be in the future');
      }
      return {
        cronExpression: null,
        specificTime: timestamp,
        nextRun: timestamp,
      };
    }
  }

  private calculateNextRun(cronExpression: string): number {
    try {
      const interval = CronExpressionParser.parse(cronExpression);
      return interval.next().getTime();
    } catch (error) {
      throw new Error(
        `Error calculating next run for cron expression: ${cronExpression}`
      );
    }
  }

  /**
   * Schedule a new cron job for execution.
   * Supports both cron expressions (using cron-parser) and specific timestamps.
   *
   * @param scheduleInput - Cron expression, timestamp, or Date object
   * @param identifier - Unique identifier for the job
   * @param handler - Function to execute when the job runs
   * @returns Promise resolving to the job ID
   *
   * @example
   * ```typescript
   * // Schedule a job that runs every minute
   * await driver.schedule('* * * * *', 'my-job', async () => {
   *   console.log('Job executed!');
   * });
   *
   * // Schedule a job that runs every hour
   * await driver.schedule('0 * * * *', 'hourly-job', async () => {
   *   console.log('Hourly job executed!');
   * });
   *
   * // Schedule a one-time job
   * await driver.schedule(Date.now() + 60000, 'one-time-job', async () => {
   *   console.log('One-time job executed!');
   * });
   * ```
   */
  public async schedule(
    scheduleInput: ScheduleInput,
    identifier: string,
    handler: CronHandler
  ): Promise<string> {
    await this.ensureDatabase();

    const id = crypto.randomUUID();
    const now = Date.now();
    const { cronExpression, specificTime, nextRun } =
      this.parseScheduleInput(scheduleInput);

    this.handlers.set(identifier, handler);

    const stmt = this.db.prepare(/* sql */ `
      INSERT OR REPLACE INTO cron_jobs 
      (id, cron_expression, specific_time, identifier, status, next_run, last_run, run_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      cronExpression,
      specificTime,
      identifier,
      'active',
      nextRun,
      null,
      0,
      now,
      now
    );

    if (nextRun <= Date.now() + this.lookAheadWindow) {
      this.scheduleJobExecution(identifier, nextRun);
    }

    if (!this.isRunning) {
      await this.start();
    }

    return id;
  }

  public async cancel(identifier: string): Promise<boolean> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      UPDATE cron_jobs 
      SET status = 'cancelled', updated_at = ? 
      WHERE identifier = ?
    `);
    const result = stmt.run(Date.now(), identifier);

    this.clearJobExecution(identifier);
    this.handlers.delete(identifier);

    return result.changes > 0;
  }

  public async pause(identifier: string): Promise<boolean> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      UPDATE cron_jobs 
      SET status = 'paused', updated_at = ? 
      WHERE identifier = ?
    `);
    const result = stmt.run(Date.now(), identifier);

    this.clearJobExecution(identifier);
    return result.changes > 0;
  }

  public async resume(identifier: string): Promise<boolean> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      UPDATE cron_jobs 
      SET status = 'active', updated_at = ? 
      WHERE identifier = ?
    `);
    const result = stmt.run(Date.now(), identifier);

    if (result.changes > 0) {
      await this.loadAndScheduleChunk();
      return true;
    }
    return false;
  }

  public async get(identifier: string): Promise<CronJob | null> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      SELECT * FROM cron_jobs WHERE identifier = ?
    `);
    const result = stmt.get(identifier);
    return result ? (result as unknown as CronJob) : null;
  }

  public async getJobStatus(identifier: string): Promise<CronJob | null> {
    return this.get(identifier);
  }

  public async getJobRunCount(identifier: string): Promise<number> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      SELECT run_count FROM cron_jobs WHERE identifier = ?
    `);
    const result = stmt.get(identifier) as { run_count: number } | null;
    return result?.run_count || 0;
  }

  public async getActiveJobsCount(): Promise<number> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      SELECT COUNT(*) as count FROM cron_jobs WHERE status = 'active'
    `);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  public async getCompletedJobsCount(): Promise<number> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      SELECT COUNT(*) as count FROM cron_jobs WHERE status = 'completed'
    `);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  public async getTotalRunsCount(): Promise<number> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      SELECT SUM(run_count) as total FROM cron_jobs
    `);
    const result = stmt.get() as { total: number | bigint };
    return Number(result.total) || 0;
  }

  public async getJobsInWindow(): Promise<number> {
    await this.ensureDatabase();

    const windowEnd = Date.now() + this.lookAheadWindow;
    const stmt = this.db.prepare(/* sql */ `
      SELECT COUNT(*) as count 
      FROM cron_jobs 
      WHERE status = 'active' AND next_run <= ?
    `);
    const result = stmt.get(windowEnd) as { count: number };
    return result.count;
  }

  public async getJobStats(): Promise<{
    total: number;
    active: number;
    paused: number;
    cancelled: number;
    completed: number;
    totalRuns: number;
  }> {
    await this.ensureDatabase();

    const stmt = this.db.prepare(/* sql */ `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(run_count) as runs
      FROM cron_jobs 
      GROUP BY status
    `);

    const results = stmt.all() as Array<{
      status: string;
      count: number;
      runs: number | bigint;
    }>;

    const stats = {
      total: 0,
      active: 0,
      paused: 0,
      cancelled: 0,
      completed: 0,
      totalRuns: 0,
    };

    for (const result of results) {
      stats.total += result.count;
      stats.totalRuns += Number(result.runs) || 0;

      switch (result.status) {
        case 'active':
          stats.active = result.count;
          break;
        case 'paused':
          stats.paused = result.count;
          break;
        case 'cancelled':
          stats.cancelled = result.count;
          break;
        case 'completed':
          stats.completed = result.count;
          break;
      }
    }

    return stats;
  }

  /**
   * Clean up old cancelled jobs that are older than the specified number of days.
   * @param olderThanDays - Number of days after which cancelled jobs should be removed (default: 30)
   * @returns Number of jobs that were removed
   */
  public async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    await this.ensureDatabase();

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare(/* sql */ `
      DELETE FROM cron_jobs 
      WHERE status = 'cancelled' AND updated_at < ?
    `);
    const result = stmt.run(cutoff);
    return Number(result.changes);
  }

  /**
   * Clean up completed jobs that are older than the specified number of days.
   * @param olderThanDays - Number of days after which completed jobs should be removed (default: 7)
   * @returns Number of jobs that were removed
   */
  public async cleanupCompletedJobs(
    olderThanDays: number = 7
  ): Promise<number> {
    await this.ensureDatabase();

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare(/* sql */ `
      DELETE FROM cron_jobs 
      WHERE status = 'completed' AND updated_at < ?
    `);
    const result = stmt.run(cutoff);
    return Number(result.changes);
  }

  /**
   * Clean up both completed and cancelled jobs that are older than the specified number of days.
   * @param completedOlderThanDays - Number of days after which completed jobs should be removed (default: 7)
   * @param cancelledOlderThanDays - Number of days after which cancelled jobs should be removed (default: 30)
   * @returns Object containing the number of completed and cancelled jobs that were removed
   */
  public async cleanupAllOldJobs(
    completedOlderThanDays: number = 7,
    cancelledOlderThanDays: number = 30
  ): Promise<{ completed: number; cancelled: number }> {
    await this.ensureDatabase();

    const completedCutoff =
      Date.now() - completedOlderThanDays * 24 * 60 * 60 * 1000;
    const cancelledCutoff =
      Date.now() - cancelledOlderThanDays * 24 * 60 * 60 * 1000;

    const completedStmt = this.db.prepare(/* sql */ `
      DELETE FROM cron_jobs 
      WHERE status = 'completed' AND updated_at < ?
    `);
    const completedResult = completedStmt.run(completedCutoff);

    const cancelledStmt = this.db.prepare(/* sql */ `
      DELETE FROM cron_jobs 
      WHERE status = 'cancelled' AND updated_at < ?
    `);
    const cancelledResult = cancelledStmt.run(cancelledCutoff);

    return {
      completed: Number(completedResult.changes),
      cancelled: Number(cancelledResult.changes),
    };
  }

  /**
   * Perform automatic cleanup based on configured retention settings.
   * This method is called periodically when auto-cleanup is enabled.
   * @returns Object containing the number of completed and cancelled jobs that were removed
   */
  private async performAutoCleanup(): Promise<{
    completed: number;
    cancelled: number;
  }> {
    try {
      const result = await this.cleanupAllOldJobs(
        this.completedJobsRetentionDays,
        this.cancelledJobsRetentionDays
      );

      // Auto-cleanup completed silently

      return result;
    } catch (error) {
      // Auto-cleanup error handled silently
      return { completed: 0, cancelled: 0 };
    }
  }

  /**
   * Start the automatic cleanup timer if enabled.
   */
  private startAutoCleanup(): void {
    if (!this.autoCleanupEnabled || this.autoCleanupTimer) {
      return;
    }

    this.autoCleanupTimer = setInterval(async () => {
      await this.performAutoCleanup();
    }, this.autoCleanupInterval);
  }

  /**
   * Stop the automatic cleanup timer.
   */
  private stopAutoCleanup(): void {
    if (this.autoCleanupTimer) {
      clearInterval(this.autoCleanupTimer);
      this.autoCleanupTimer = null;
    }
  }

  /**
   * Manually trigger auto-cleanup with current settings.
   * @returns Object containing the number of completed and cancelled jobs that were removed
   */
  public async triggerAutoCleanup(): Promise<{
    completed: number;
    cancelled: number;
  }> {
    return this.performAutoCleanup();
  }

  /**
   * Get auto-cleanup configuration and status.
   * @returns Object containing auto-cleanup settings and current status
   */
  public getAutoCleanupStatus(): {
    enabled: boolean;
    interval: number;
    completedJobsRetentionDays: number;
    cancelledJobsRetentionDays: number;
    isRunning: boolean;
  } {
    return {
      enabled: this.autoCleanupEnabled,
      interval: this.autoCleanupInterval,
      completedJobsRetentionDays: this.completedJobsRetentionDays,
      cancelledJobsRetentionDays: this.cancelledJobsRetentionDays,
      isRunning: this.autoCleanupTimer !== null,
    };
  }

  /**
   * Get retry configuration and error handling status.
   * @returns Object containing retry settings and error handler status
   */
  public getRetryConfig(): {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    hasErrorHandler: boolean;
  } {
    return {
      maxAttempts: this.maxRetryAttempts,
      baseDelay: this.retryBaseDelay,
      maxDelay: this.retryMaxDelay,
      hasErrorHandler: this.onErrorHandler !== undefined,
    };
  }

  private scheduleJobExecution(identifier: string, nextRun: number): void {
    const delay = Math.max(0, nextRun - Date.now());

    const timeout = setTimeout(async () => {
      await this.executeJob(identifier);
    }, delay);

    this.activeJobs.set(identifier, timeout);
  }

  private clearJobExecution(identifier: string): void {
    const timeout = this.activeJobs.get(identifier);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(identifier);
    }
  }

  private async executeJob(identifier: string): Promise<void> {
    const handler = this.handlers.get(identifier);
    if (!handler) {
      return;
    }

    let lastError: Error | null = null;

    // Try to execute the job with retries
    for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt++) {
      try {
        await handler();
        lastError = null;
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is the last attempt, don't retry
        if (attempt === this.maxRetryAttempts) {
          break;
        }

        // Calculate delay for exponential backoff
        const delay = Math.min(
          this.retryBaseDelay * Math.pow(2, attempt - 1),
          this.retryMaxDelay
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // If all attempts failed, handle the error
    if (lastError) {
      if (this.onErrorHandler) {
        this.onErrorHandler(identifier, lastError);
      } else {
        // Default error handling: log to stdout
        process.stdout.write(
          `Job execution failed after ${this.maxRetryAttempts} attempts: ${identifier} - ${lastError.message}\n`
        );
      }
    }

    // Update job status regardless of success/failure
    const stmt = this.db.prepare(/* sql */ `
      SELECT cron_expression, specific_time, run_count FROM cron_jobs 
      WHERE identifier = ? AND status = 'active'
    `);
    const job = stmt.get(identifier) as
      | {
          cron_expression: string | null;
          specific_time: number | null;
          run_count: number;
        }
      | undefined;

    if (job) {
      const now = Date.now();
      let nextRun: number | null = null;
      let newStatus = 'active';

      if (job.cron_expression) {
        nextRun = this.calculateNextRun(job.cron_expression);
      } else if (job.specific_time) {
        newStatus = 'completed';
        nextRun = job.specific_time;
      }

      const updateStmt = this.db.prepare(/* sql */ `
        UPDATE cron_jobs 
        SET last_run = ?, next_run = ?, run_count = ?, status = ?, updated_at = ?
        WHERE identifier = ?
      `);
      updateStmt.run(
        now,
        nextRun,
        job.run_count + 1,
        newStatus,
        now,
        identifier
      );

      if (
        job.cron_expression &&
        nextRun &&
        nextRun <= Date.now() + this.lookAheadWindow
      ) {
        this.scheduleJobExecution(identifier, nextRun);
      } else {
        this.activeJobs.delete(identifier);
      }
    }
  }

  private async loadAndScheduleChunk(): Promise<void> {
    const now = Date.now();
    const windowEnd = now + this.lookAheadWindow;

    for (const [identifier, timeout] of this.activeJobs) {
      clearTimeout(timeout);
    }
    this.activeJobs.clear();

    const stmt = this.db.prepare(/* sql */ `
      SELECT identifier, next_run 
      FROM cron_jobs 
      WHERE status = 'active' 
        AND next_run <= ? 
        AND next_run > ?
      ORDER BY next_run
      LIMIT ?
    `);

    const jobs = stmt.all(windowEnd, now, this.chunkSize) as Array<{
      identifier: string;
      next_run: number;
    }>;

    for (const job of jobs) {
      if (this.handlers.has(job.identifier)) {
        this.scheduleJobExecution(job.identifier, job.next_run);
      }
    }
  }

  /**
   * Start the cron service and begin processing jobs.
   * This method initializes the database if needed and begins automatic job execution.
   * Jobs will be loaded and scheduled based on the configured look-ahead window.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    await this.ensureDatabase();
    this.isRunning = true;

    await this.loadAndScheduleChunk();

    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(async () => {
        await this.loadAndScheduleChunk();
      }, this.refreshInterval);
    }

    // Start auto-cleanup if enabled
    this.startAutoCleanup();
  }

  /**
   * Stop the cron service and cease processing jobs.
   * This method gracefully shuts down the service by clearing all timers
   * and closing the database connection.
   */
  public async stop(): Promise<void> {
    this.isRunning = false;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Stop auto-cleanup
    this.stopAutoCleanup();

    for (const [identifier, timeout] of this.activeJobs) {
      clearTimeout(timeout);
    }
    this.activeJobs.clear();

    if (this.db?.isOpen) {
      this.db.close();
    }
  }
}
