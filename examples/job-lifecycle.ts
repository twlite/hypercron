import { schedule, cronService } from '../src/index';
import { setTimeout } from 'node:timers/promises';

async function jobLifecycleExample() {
  console.log('🔄 Starting HyperCron Job Lifecycle Example\n');

  // Schedule a job that runs every 5 seconds
  console.log('📅 Scheduling a job that runs every 5 seconds...');
  await schedule('*/5 * * * * *', 'lifecycle-demo', async () => {
    console.log('🔄 Lifecycle job executed at:', new Date().toISOString());
  });

  // Start the cron service
  console.log('▶️  Starting the cron service...');
  await cronService.start();

  // Wait for 15 seconds to see the job execute
  console.log('⏳ Waiting 15 seconds to see job execute...\n');
  await setTimeout(15000);

  // Pause the job
  console.log('⏸️  Pausing the job...');
  await cronService.pause('lifecycle-demo');

  // Get job status
  const pausedJob = await cronService.getJobStatus('lifecycle-demo');
  console.log('📊 Job status after pause:', pausedJob?.status);

  // Wait for 10 seconds while paused
  console.log('⏳ Waiting 10 seconds while job is paused...\n');
  await setTimeout(10000);

  // Resume the job
  console.log('▶️  Resuming the job...');
  await cronService.resume('lifecycle-demo');

  // Get job status again
  const resumedJob = await cronService.getJobStatus('lifecycle-demo');
  console.log('📊 Job status after resume:', resumedJob?.status);

  // Wait for 15 more seconds to see it running again
  console.log('⏳ Waiting 15 seconds to see job running again...\n');
  await setTimeout(15000);

  // Get run count
  const runCount = await cronService.getJobRunCount('lifecycle-demo');
  console.log('📊 Total job executions:', runCount);

  // Cancel the job
  console.log('❌ Cancelling the job...');
  await cronService.cancel('lifecycle-demo');

  // Get final status
  const cancelledJob = await cronService.getJobStatus('lifecycle-demo');
  console.log('📊 Final job status:', cancelledJob?.status);

  // Stop the service
  console.log('⏹️  Stopping the cron service...');
  await cronService.stop();

  console.log('\n✅ Job lifecycle example completed!');
}

// Run the example
jobLifecycleExample().catch(console.error);
