import type { CronJob, CronHandler, ScheduleInput } from '../types';

/**
 * Interface for cron job storage and execution drivers.
 * Provides methods for scheduling, managing, and monitoring cron jobs.
 */
export interface Driver {
  /**
   * Whether the driver is initialized.
   */
  readonly isInitialized: boolean;

  /**
   * Initialize the driver and prepare it for use.
   * This method should be called before using any other driver methods.
   */
  init?(): Promise<void>;

  /**
   * Clean up resources and close connections.
   * This method should be called when the driver is no longer needed.
   */
  destroy?(): Promise<void>;

  /**
   * Schedule a new cron job for execution.
   * @param scheduleInput - Cron expression, timestamp, or Date object
   * @param identifier - Unique identifier for the job
   * @param handler - Function to execute when the job runs
   * @returns Promise resolving to the job ID
   */
  schedule(
    scheduleInput: ScheduleInput,
    identifier: string,
    handler: CronHandler
  ): Promise<string>;

  /**
   * Cancel a scheduled job and remove it from execution.
   * @param identifier - Unique identifier of the job to cancel
   * @returns Promise resolving to true if job was cancelled, false if not found
   */
  cancel(identifier: string): Promise<boolean>;

  /**
   * Pause a scheduled job without removing it.
   * The job can be resumed later using the resume method.
   * @param identifier - Unique identifier of the job to pause
   * @returns Promise resolving to true if job was paused, false if not found
   */
  pause(identifier: string): Promise<boolean>;

  /**
   * Resume a previously paused job.
   * @param identifier - Unique identifier of the job to resume
   * @returns Promise resolving to true if job was resumed, false if not found
   */
  resume(identifier: string): Promise<boolean>;

  /**
   * Get detailed information about a specific job.
   * @param identifier - Unique identifier of the job
   * @returns Promise resolving to job details or null if not found
   */
  get(identifier: string): Promise<CronJob | null>;

  /**
   * Get the current status of a job.
   * @param identifier - Unique identifier of the job
   * @returns Promise resolving to job status or null if not found
   */
  getJobStatus(identifier: string): Promise<CronJob | null>;

  /**
   * Get the number of times a job has been executed.
   * @param identifier - Unique identifier of the job
   * @returns Promise resolving to the run count
   */
  getJobRunCount(identifier: string): Promise<number>;

  /**
   * Get the total number of active jobs.
   * @returns Promise resolving to the count of active jobs
   */
  getActiveJobsCount(): Promise<number>;

  /**
   * Get the total number of completed jobs.
   * @returns Promise resolving to the count of completed jobs
   */
  getCompletedJobsCount(): Promise<number>;

  /**
   * Get the total number of job executions across all jobs.
   * @returns Promise resolving to the total run count
   */
  getTotalRunsCount(): Promise<number>;

  /**
   * Get the number of jobs scheduled to run within the look-ahead window.
   * @returns Promise resolving to the count of jobs in the execution window
   */
  getJobsInWindow(): Promise<number>;

  /**
   * Get comprehensive statistics about all jobs.
   * @returns Promise resolving to job statistics object
   */
  getJobStats(): Promise<{
    total: number;
    active: number;
    paused: number;
    cancelled: number;
    completed: number;
    totalRuns: number;
  }>;

  /**
   * Remove old cancelled jobs from the database.
   * @param olderThanDays - Remove jobs older than this many days (default: 30)
   * @returns Promise resolving to the number of jobs removed
   */
  cleanupOldJobs(olderThanDays?: number): Promise<number>;

  /**
   * Start the cron service and begin processing jobs.
   * This method should be called to begin automatic job execution.
   */
  start(): Promise<void>;

  /**
   * Stop the cron service and cease processing jobs.
   * This method should be called to gracefully shut down the service.
   */
  stop(): Promise<void>;
}
