import type { Driver } from './driver/driver';
import type { CronHandler, ScheduleInput } from './types';
import { SqliteDriver } from './driver/sqlite.driver';

/**
 * High-level service for managing cron jobs.
 * Provides a convenient interface for scheduling, managing, and monitoring cron jobs.
 */
export class CronService {
  /**
   * Create a new CronService instance.
   * @param driver - The driver to use for job storage and execution
   */
  public constructor(private driver: Driver) {}

  /**
   * Change the underlying driver for this service.
   * This will destroy the current driver and initialize the new one.
   * @param driver - The new driver to use
   */
  public async setDriver(driver: Driver) {
    if (this.driver) {
      await this.driver.destroy?.();
    }

    this.driver = driver;

    await this.driver.init?.();
  }

  private async ensureDriverInitialized() {
    if (!this.driver) {
      throw new RangeError('Driver is not set');
    }

    if (!this.driver.isInitialized) {
      await this.driver.init?.();
    }
  }

  /**
   * Schedule a new cron job for execution.
   * @param scheduleInput - Cron expression, timestamp, or Date object
   * @param identifier - Unique identifier for the job
   * @param handler - Function to execute when the job runs
   * @returns Promise resolving to the job ID
   */
  public async schedule(
    scheduleInput: ScheduleInput,
    identifier: string,
    handler: CronHandler
  ) {
    await this.ensureDriverInitialized();
    return this.driver.schedule(scheduleInput, identifier, handler);
  }

  /**
   * Cancel a scheduled job and remove it from execution.
   * @param identifier - Unique identifier of the job to cancel
   * @returns Promise resolving to true if job was cancelled, false if not found
   */
  public async cancel(identifier: string) {
    await this.ensureDriverInitialized();
    return this.driver.cancel(identifier);
  }

  /**
   * Pause a scheduled job without removing it.
   * The job can be resumed later using the resume method.
   * @param identifier - Unique identifier of the job to pause
   * @returns Promise resolving to true if job was paused, false if not found
   */
  public async pause(identifier: string) {
    await this.ensureDriverInitialized();
    return this.driver.pause(identifier);
  }

  /**
   * Resume a previously paused job.
   * @param identifier - Unique identifier of the job to resume
   * @returns Promise resolving to true if job was resumed, false if not found
   */
  public async resume(identifier: string) {
    await this.ensureDriverInitialized();
    return this.driver.resume(identifier);
  }

  /**
   * Get detailed information about a specific job.
   * @param identifier - Unique identifier of the job
   * @returns Promise resolving to job details or null if not found
   */
  public async get(identifier: string) {
    await this.ensureDriverInitialized();
    return this.driver.get(identifier);
  }

  /**
   * Get the current status of a job.
   * @param identifier - Unique identifier of the job
   * @returns Promise resolving to job status or null if not found
   */
  public async getJobStatus(identifier: string) {
    await this.ensureDriverInitialized();
    return this.driver.getJobStatus(identifier);
  }

  /**
   * Get the number of times a job has been executed.
   * @param identifier - Unique identifier of the job
   * @returns Promise resolving to the run count
   */
  public async getJobRunCount(identifier: string) {
    await this.ensureDriverInitialized();
    return this.driver.getJobRunCount(identifier);
  }

  /**
   * Get the total number of active jobs.
   * @returns Promise resolving to the count of active jobs
   */
  public async getActiveJobsCount() {
    await this.ensureDriverInitialized();
    return this.driver.getActiveJobsCount();
  }

  /**
   * Get the total number of completed jobs.
   * @returns Promise resolving to the count of completed jobs
   */
  public async getCompletedJobsCount() {
    await this.ensureDriverInitialized();
    return this.driver.getCompletedJobsCount();
  }

  /**
   * Get the total number of job executions across all jobs.
   * @returns Promise resolving to the total run count
   */
  public async getTotalRunsCount() {
    await this.ensureDriverInitialized();
    return this.driver.getTotalRunsCount();
  }

  /**
   * Get the number of jobs scheduled to run within the look-ahead window.
   * @returns Promise resolving to the count of jobs in the execution window
   */
  public async getJobsInWindow() {
    await this.ensureDriverInitialized();
    return this.driver.getJobsInWindow();
  }

  /**
   * Get comprehensive statistics about all jobs.
   * @returns Promise resolving to job statistics object
   */
  public async getJobStats() {
    await this.ensureDriverInitialized();
    return this.driver.getJobStats();
  }

  /**
   * Remove old cancelled jobs from the database.
   * @param olderThanDays - Remove jobs older than this many days (default: 30)
   * @returns Promise resolving to the number of jobs removed
   */
  public async cleanupOldJobs(olderThanDays?: number) {
    await this.ensureDriverInitialized();
    return this.driver.cleanupOldJobs(olderThanDays);
  }

  /**
   * Start the cron service and begin processing jobs.
   * This method should be called to begin automatic job execution.
   */
  public async start() {
    await this.ensureDriverInitialized();
    return this.driver.start();
  }

  /**
   * Stop the cron service and cease processing jobs.
   * This method should be called to gracefully shut down the service.
   */
  public async stop() {
    await this.ensureDriverInitialized();
    return this.driver.stop();
  }
}

/**
 * Default cron service instance using SQLite driver.
 * Configured with default settings for immediate use.
 */
export const cronService = new CronService(new SqliteDriver({ db: 'cron.db' }));

/**
 * Convenience function to schedule a new cron job.
 * @param pattern - Cron expression, timestamp, or Date object
 * @param identifier - Unique identifier for the job
 * @param handler - Function to execute when the job runs
 * @returns Promise resolving to the job ID
 */
export function schedule(
  pattern: ScheduleInput,
  identifier: string,
  handler: CronHandler
) {
  return cronService.schedule(pattern, identifier, handler);
}

/**
 * Convenience function to cancel a scheduled job.
 * @param identifier - Unique identifier of the job to cancel
 * @returns Promise resolving to true if job was cancelled, false if not found
 */
export function cancel(identifier: string) {
  return cronService.cancel(identifier);
}
