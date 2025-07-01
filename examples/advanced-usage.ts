import { CronService, SqliteDriver } from '../src/index';
import { setTimeout } from 'node:timers/promises';

async function advancedUsageExample() {
  console.log('🚀 Starting HyperCron Advanced Usage Example\n');

  // Create a custom driver with specific configuration
  console.log('⚙️  Creating custom driver with specific configuration...');
  const customDriver = new SqliteDriver({
    db: 'advanced-example.db',
    chunkSize: 100, // Smaller chunk size for more frequent updates
    refreshInterval: 10 * 1000, // Refresh every 10 seconds
    lookAheadWindow: 15 * 1000, // Look ahead 15 seconds
  });

  // Create a custom service
  const customService = new CronService(customDriver);

  // Initialize the driver
  console.log('🔧 Initializing custom driver...');
  await customDriver.init();

  // Schedule jobs with complex patterns
  console.log('📅 Scheduling jobs with complex patterns...');

  // Job that runs every weekday at 9 AM
  await customService.schedule('0 9 * * 1-5', 'weekday-morning', async () => {
    console.log('🌅 Weekday morning job executed');
  });

  // Job that runs every 15 minutes during business hours
  await customService.schedule(
    '0 */15 9-17 * * 1-5',
    'business-quarterly',
    async () => {
      console.log('💼 Business quarterly job executed');
    }
  );

  // Job that runs on the 1st and 15th of every month
  await customService.schedule('0 0 1,15 * *', 'bi-monthly', async () => {
    console.log('📅 Bi-monthly job executed');
  });

  // Job that runs every 2 seconds for demonstration
  await customService.schedule('*/2 * * * * *', 'demo-job', async () => {
    console.log('🎯 Demo job executed');
  });

  // Job with error handling
  await customService.schedule('*/5 * * * * *', 'error-prone-job', async () => {
    try {
      // Simulate some work that might fail
      const random = Math.random();
      if (random < 0.3) {
        throw new Error('Simulated error');
      }
      console.log('✅ Error-prone job completed successfully');
    } catch (error) {
      console.error('❌ Error-prone job failed:', error.message);
      // Re-throw to let the system handle it
      throw error;
    }
  });

  // Start the custom service
  console.log('▶️  Starting custom service...');
  await customService.start();

  // Monitor for 20 seconds
  console.log('📊 Monitoring custom service for 20 seconds...\n');

  for (let i = 0; i < 4; i++) {
    await setTimeout(5000);

    console.log(`\n📈 Custom Service Report (${(i + 1) * 5}s):`);

    const stats = await customService.getJobStats();
    console.log('📊 Statistics:', {
      total: stats.total,
      active: stats.active,
      totalRuns: stats.totalRuns,
    });

    const jobsInWindow = await customService.getJobsInWindow();
    console.log('🔍 Jobs in execution window:', jobsInWindow);
  }

  // Demonstrate driver switching
  console.log('\n🔄 Demonstrating driver switching...');

  // Create another driver with different config
  const secondDriver = new SqliteDriver({
    db: 'second-example.db',
    chunkSize: 50,
    refreshInterval: 5 * 1000,
    lookAheadWindow: 10 * 1000,
  });

  // Switch to the new driver
  await customService.setDriver(secondDriver);

  // Schedule a job on the new driver
  await customService.schedule('*/3 * * * * *', 'new-driver-job', async () => {
    console.log('🆕 New driver job executed');
  });

  // Monitor for 10 more seconds
  console.log('📊 Monitoring with new driver for 10 seconds...\n');
  await setTimeout(10000);

  // Get final statistics
  const finalStats = await customService.getJobStats();
  console.log('📊 Final Statistics:', finalStats);

  // Stop the service
  console.log('⏹️  Stopping custom service...');
  await customService.stop();

  // Clean up
  console.log('🧹 Cleaning up...');
  await customDriver.destroy();
  await secondDriver.destroy();

  console.log('\n✅ Advanced usage example completed!');
}

// Run the example
advancedUsageExample().catch(console.error);
