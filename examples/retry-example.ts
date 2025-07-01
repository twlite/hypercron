import { CronService } from '../src';
import { SqliteDriver } from '../src/driver/sqlite.driver';

async function retryExample() {
  console.log('🚀 HyperCron Retry Example\n');

  // Example 1: Default retry configuration
  console.log('📋 Example 1: Default Retry Configuration');
  const defaultDriver = new SqliteDriver({
    db: './retry-default.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
  });

  const defaultService = new CronService(defaultDriver);

  try {
    await defaultService.init();
    console.log('✅ Default service initialized');

    // Check retry configuration
    const defaultRetryConfig = defaultService.getRetryConfig();
    console.log('📊 Default retry configuration:', defaultRetryConfig);

    // Schedule a job that will fail initially but succeed on retry
    let attemptCount = 0;
    await defaultService.schedule(
      Date.now() + 100,
      'retry-success-job',
      async () => {
        attemptCount++;
        console.log(`🔄 Attempt ${attemptCount} for retry-success-job`);

        if (attemptCount < 3) {
          throw new Error(`Simulated failure on attempt ${attemptCount}`);
        }

        console.log('✅ Job succeeded on final attempt');
      }
    );

    await defaultService.start();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await defaultService.stop();

    console.log('✅ Default retry example completed\n');
  } catch (error) {
    console.error('❌ Error in default retry example:', error);
  } finally {
    await defaultService.destroy();
  }

  // Example 2: Custom retry configuration
  console.log('📋 Example 2: Custom Retry Configuration');
  const customDriver = new SqliteDriver({
    db: './retry-custom.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    retry: {
      maxAttempts: 5,
      baseDelay: 500, // 500ms base delay
      maxDelay: 5000, // 5 second max delay
    },
  });

  const customService = new CronService(customDriver);

  try {
    await customService.init();
    console.log('✅ Custom service initialized');

    // Check retry configuration
    const customRetryConfig = customService.getRetryConfig();
    console.log('📊 Custom retry configuration:', customRetryConfig);

    // Schedule a job that will fail more times
    let customAttemptCount = 0;
    await customService.schedule(
      Date.now() + 100,
      'custom-retry-job',
      async () => {
        customAttemptCount++;
        console.log(`🔄 Attempt ${customAttemptCount} for custom-retry-job`);

        if (customAttemptCount < 4) {
          throw new Error(
            `Custom retry failure on attempt ${customAttemptCount}`
          );
        }

        console.log('✅ Custom retry job succeeded');
      }
    );

    await customService.start();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await customService.stop();

    console.log('✅ Custom retry example completed\n');
  } catch (error) {
    console.error('❌ Error in custom retry example:', error);
  } finally {
    await customService.destroy();
  }

  // Example 3: Custom error handler
  console.log('📋 Example 3: Custom Error Handler');
  const errorHandlerDriver = new SqliteDriver({
    db: './retry-error-handler.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    retry: {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 2000,
    },
    onError: (jobId: string, error: Error) => {
      console.log(
        `🚨 Custom error handler: Job ${jobId} failed with error: ${error.message}`
      );
      // In a real application, you might log to a file, send to monitoring service, etc.
    },
  });

  const errorHandlerService = new CronService(errorHandlerDriver);

  try {
    await errorHandlerService.init();
    console.log('✅ Error handler service initialized');

    // Check retry configuration
    const errorHandlerRetryConfig = errorHandlerService.getRetryConfig();
    console.log(
      '📊 Error handler retry configuration:',
      errorHandlerRetryConfig
    );

    // Schedule a job that will always fail
    await errorHandlerService.schedule(
      Date.now() + 100,
      'always-fail-job',
      async () => {
        console.log('💥 This job will always fail');
        throw new Error('This job is designed to fail');
      }
    );

    await errorHandlerService.start();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await errorHandlerService.stop();

    console.log('✅ Error handler example completed\n');
  } catch (error) {
    console.error('❌ Error in error handler example:', error);
  } finally {
    await errorHandlerService.destroy();
  }

  // Example 4: No retries
  console.log('📋 Example 4: No Retries');
  const noRetryDriver = new SqliteDriver({
    db: './retry-none.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    retry: {
      maxAttempts: 1, // No retries
      baseDelay: 1000,
      maxDelay: 2000,
    },
  });

  const noRetryService = new CronService(noRetryDriver);

  try {
    await noRetryService.init();
    console.log('✅ No retry service initialized');

    // Check retry configuration
    const noRetryConfig = noRetryService.getRetryConfig();
    console.log('📊 No retry configuration:', noRetryConfig);

    // Schedule a job that will fail
    await noRetryService.schedule(
      Date.now() + 100,
      'no-retry-job',
      async () => {
        console.log('💥 This job will fail without retries');
        throw new Error('No retry failure');
      }
    );

    await noRetryService.start();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await noRetryService.stop();

    console.log('✅ No retry example completed\n');
  } catch (error) {
    console.error('❌ Error in no retry example:', error);
  } finally {
    await noRetryService.destroy();
  }

  // Example 5: Exponential backoff demonstration
  console.log('📋 Example 5: Exponential Backoff Demonstration');
  const backoffDriver = new SqliteDriver({
    db: './retry-backoff.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    retry: {
      maxAttempts: 4,
      baseDelay: 100, // 100ms base delay
      maxDelay: 1000, // 1 second max delay
    },
  });

  const backoffService = new CronService(backoffDriver);

  try {
    await backoffService.init();
    console.log('✅ Backoff service initialized');

    // Schedule a job that demonstrates exponential backoff
    let backoffAttemptCount = 0;
    const startTime = Date.now();

    await backoffService.schedule(
      Date.now() + 100,
      'backoff-demo-job',
      async () => {
        backoffAttemptCount++;
        const elapsed = Date.now() - startTime;
        console.log(
          `🔄 Backoff attempt ${backoffAttemptCount} at ${elapsed}ms`
        );

        if (backoffAttemptCount < 4) {
          throw new Error(`Backoff failure on attempt ${backoffAttemptCount}`);
        }

        console.log('✅ Backoff demo job succeeded');
      }
    );

    await backoffService.start();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await backoffService.stop();

    console.log('✅ Backoff example completed\n');
  } catch (error) {
    console.error('❌ Error in backoff example:', error);
  } finally {
    await backoffService.destroy();
  }

  console.log('🎉 All retry examples completed successfully!');
}

// Run the example
retryExample().catch(console.error);
