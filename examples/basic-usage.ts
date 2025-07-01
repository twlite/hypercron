import { schedule, cancel, cronService } from '../src/index';
import { setTimeout } from 'node:timers/promises';

async function basicUsageExample() {
  console.log('🚀 Starting HyperCron Basic Usage Example\n');

  // Schedule a job that runs every 10 seconds
  console.log('📅 Scheduling a job that runs every 10 seconds...');
  await schedule('*/10 * * * * *', 'every-10-seconds', async () => {
    console.log('⏰ Job executed at:', new Date().toISOString());
  });

  // Schedule a job that runs every minute
  console.log('📅 Scheduling a job that runs every minute...');
  await schedule('0 * * * * *', 'every-minute', async () => {
    console.log('🕐 Minute job executed at:', new Date().toISOString());
  });

  // Schedule a one-time job that runs in 5 seconds
  console.log('📅 Scheduling a one-time job in 5 seconds...');
  await schedule(Date.now() + 5000, 'one-time-job', async () => {
    console.log('🎯 One-time job executed at:', new Date().toISOString());
  });

  // Start the cron service
  console.log('▶️  Starting the cron service...');
  await cronService.start();

  // Wait for 30 seconds to see the jobs execute
  console.log('⏳ Waiting 30 seconds to see jobs execute...\n');
  await setTimeout(30000);

  // Get some statistics
  console.log('📊 Getting job statistics...');
  const stats = await cronService.getJobStats();
  console.log('Job Statistics:', stats);

  // Cancel one of the jobs
  console.log('\n❌ Cancelling the every-10-seconds job...');
  await cancel('every-10-seconds');

  // Wait a bit more to see the effect
  console.log('⏳ Waiting 10 more seconds...\n');
  await setTimeout(10000);

  // Stop the service
  console.log('⏹️  Stopping the cron service...');
  await cronService.stop();

  console.log('\n✅ Basic usage example completed!');
}

// Run the example
basicUsageExample().catch(console.error);
