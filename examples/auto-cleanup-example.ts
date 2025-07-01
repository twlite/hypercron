import { CronService } from '../src';
import { SqliteDriver } from '../src/driver/sqlite.driver';

async function autoCleanupExample() {
  console.log('🚀 HyperCron Auto-Cleanup Example\n');

  // Example 1: Default auto-cleanup (enabled by default)
  console.log('📋 Example 1: Default Auto-Cleanup Configuration');
  const defaultDriver = new SqliteDriver({
    db: './auto-cleanup-default.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
  });

  const defaultService = new CronService(defaultDriver);

  try {
    await defaultService.init();
    console.log('✅ Default service initialized');

    // Check auto-cleanup status
    const defaultStatus = defaultService.getAutoCleanupStatus();
    console.log('📊 Auto-cleanup status:', defaultStatus);

    // Schedule some jobs that will complete
    for (let i = 0; i < 3; i++) {
      await defaultService.schedule(
        Date.now() + 100,
        `default-job-${i}`,
        async () => {
          console.log(`✅ Default job ${i} completed`);
        }
      );
    }

    await defaultService.start();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await defaultService.stop();

    console.log('✅ Default example completed\n');
  } catch (error) {
    console.error('❌ Error in default example:', error);
  } finally {
    await defaultService.destroy();
  }

  // Example 2: Custom auto-cleanup configuration
  console.log('📋 Example 2: Custom Auto-Cleanup Configuration');
  const customDriver = new SqliteDriver({
    db: './auto-cleanup-custom.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    autoCleanup: {
      enabled: true,
      interval: 5000, // 5 seconds for demo
      completedJobsRetentionDays: 0, // Remove all completed jobs immediately
      cancelledJobsRetentionDays: 0, // Remove all cancelled jobs immediately
    },
  });

  const customService = new CronService(customDriver);

  try {
    await customService.init();
    console.log('✅ Custom service initialized');

    // Check auto-cleanup status
    const customStatus = customService.getAutoCleanupStatus();
    console.log('📊 Custom auto-cleanup status:', customStatus);

    // Schedule jobs
    for (let i = 0; i < 5; i++) {
      await customService.schedule(
        Date.now() + 100,
        `custom-job-${i}`,
        async () => {
          console.log(`✅ Custom job ${i} completed`);
        }
      );
    }

    // Schedule a recurring job and cancel it
    await customService.schedule(
      '*/1 * * * * *', // Every second
      'recurring-custom-job',
      async () => {
        console.log('🔄 Recurring custom job executed');
      }
    );

    await customService.start();

    // Wait for jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Cancel the recurring job
    await customService.cancel('recurring-custom-job');
    console.log('❌ Cancelled recurring custom job');

    // Wait for auto-cleanup to run
    console.log('⏳ Waiting for auto-cleanup to run...');
    await new Promise((resolve) => setTimeout(resolve, 6000));

    // Check stats after auto-cleanup
    const stats = await customService.getJobStats();
    console.log('📊 Job statistics after auto-cleanup:', stats);

    await customService.stop();
    console.log('✅ Custom example completed\n');
  } catch (error) {
    console.error('❌ Error in custom example:', error);
  } finally {
    await customService.destroy();
  }

  // Example 3: Disabled auto-cleanup
  console.log('📋 Example 3: Disabled Auto-Cleanup');
  const disabledDriver = new SqliteDriver({
    db: './auto-cleanup-disabled.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    autoCleanup: {
      enabled: false,
    },
  });

  const disabledService = new CronService(disabledDriver);

  try {
    await disabledService.init();
    console.log('✅ Disabled service initialized');

    // Check auto-cleanup status
    const disabledStatus = disabledService.getAutoCleanupStatus();
    console.log('📊 Disabled auto-cleanup status:', disabledStatus);

    // Schedule jobs
    for (let i = 0; i < 3; i++) {
      await disabledService.schedule(
        Date.now() + 100,
        `disabled-job-${i}`,
        async () => {
          console.log(`✅ Disabled job ${i} completed`);
        }
      );
    }

    await disabledService.start();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await disabledService.stop();

    // Manual cleanup demonstration
    console.log('🧹 Performing manual cleanup...');
    const manualResult = await disabledService.triggerAutoCleanup();
    console.log('📊 Manual cleanup result:', manualResult);

    const finalStats = await disabledService.getJobStats();
    console.log('📊 Final job statistics:', finalStats);

    console.log('✅ Disabled example completed\n');
  } catch (error) {
    console.error('❌ Error in disabled example:', error);
  } finally {
    await disabledService.destroy();
  }

  // Example 4: Manual trigger demonstration
  console.log('📋 Example 4: Manual Auto-Cleanup Trigger');
  const manualDriver = new SqliteDriver({
    db: './auto-cleanup-manual.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
    autoCleanup: {
      enabled: true,
      interval: 30000, // 30 seconds
      completedJobsRetentionDays: 0,
      cancelledJobsRetentionDays: 0,
    },
  });

  const manualService = new CronService(manualDriver);

  try {
    await manualService.init();
    console.log('✅ Manual service initialized');

    // Schedule jobs
    for (let i = 0; i < 4; i++) {
      await manualService.schedule(
        Date.now() + 100,
        `manual-job-${i}`,
        async () => {
          console.log(`✅ Manual job ${i} completed`);
        }
      );
    }

    await manualService.start();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await manualService.stop();

    // Get initial stats
    const initialStats = await manualService.getJobStats();
    console.log('📊 Initial job statistics:', initialStats);

    // Manually trigger cleanup
    console.log('🧹 Manually triggering auto-cleanup...');
    const triggerResult = await manualService.triggerAutoCleanup();
    console.log('📊 Manual trigger result:', triggerResult);

    // Get stats after manual cleanup
    const afterStats = await manualService.getJobStats();
    console.log('📊 Job statistics after manual cleanup:', afterStats);

    console.log('✅ Manual example completed\n');
  } catch (error) {
    console.error('❌ Error in manual example:', error);
  } finally {
    await manualService.destroy();
  }

  console.log('🎉 All auto-cleanup examples completed successfully!');
}

// Run the example
autoCleanupExample().catch(console.error);
