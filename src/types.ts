/**
 * Represents a cron job with comprehensive metadata and execution information.
 */
export interface CronJob {
  /** Unique identifier for the job */
  id: string;
  /** Cron expression for recurring jobs (null for one-time jobs) */
  cron_expression: string | null;
  /** Specific timestamp for one-time jobs (null for recurring jobs) */
  specific_time: number | null;
  /** Human-readable identifier for the job */
  identifier: string;
  /** Current status of the job */
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  /** Next scheduled execution time in milliseconds */
  next_run: number;
  /** Last execution time in milliseconds (null if never executed) */
  last_run: number | null;
  /** Number of times the job has been executed */
  run_count: number;
  /** Creation timestamp in milliseconds */
  created_at: number;
  /** Last update timestamp in milliseconds */
  updated_at: number;
}

/**
 * Configuration options for the cron service.
 */
export interface CronServiceConfig {
  /** Database file path or connection string */
  db: string;
  /** Maximum number of jobs to load in a single chunk (default: 1000) */
  chunkSize?: number;
  /** Interval in milliseconds to refresh job scheduling (default: 24 hours) */
  refreshInterval?: number;
  /** Look-ahead window in milliseconds for job scheduling (default: 25 hours) */
  lookAheadWindow?: number;
  /** Auto-cleanup configuration for automatic job cleanup */
  autoCleanup?: {
    /** Enable automatic cleanup (default: true) */
    enabled?: boolean;
    /** Interval in milliseconds for cleanup runs (default: 24 hours) */
    interval?: number;
    /** Remove completed jobs older than this many days (default: 7) */
    completedJobsRetentionDays?: number;
    /** Remove cancelled jobs older than this many days (default: 30) */
    cancelledJobsRetentionDays?: number;
  };
  /** Job retry configuration for failed executions */
  retry?: {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Base delay in milliseconds for exponential backoff (default: 1000) */
    baseDelay?: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelay?: number;
  };
  /** Error handling configuration */
  onError?: (jobId: string, error: Error) => void;
}

/**
 * Function type for job execution handlers.
 * Should be async and handle any errors internally.
 */
export type CronHandler = () => Promise<void> | void;

/**
 * Valid input types for job scheduling.
 * Can be a cron expression string, timestamp number, or Date object.
 */
export type ScheduleInput = string | number | Date;
