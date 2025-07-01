import { schedule, cronService } from '../src/index';
import { setTimeout } from 'node:timers/promises';

async function monitoringExample() {
  console.log('📊 Starting HyperCron Monitoring Example\n');

  // Schedule multiple jobs with different patterns
  console.log('📅 Scheduling multiple jobs...');

  await schedule('*/3 * * * * *', 'every-3-seconds', async () => {
    console.log('⏰ 3s job executed');
  });

  await schedule('*/7 * * * * *', 'every-7-seconds', async () => {
    console.log('⏰ 7s job executed');
  });

  await schedule('0 * * * * *', 'every-minute', async () => {
    console.log('🕐 Minute job executed');
  });

  // Schedule a one-time job
  await schedule(Date.now() + 10000, 'one-time-monitor', async () => {
    console.log('🎯 One-time job executed');
  });

  // Start the cron service
  console.log('▶️  Starting the cron service...');
  await cronService.start();

  // Monitor jobs for 30 seconds
  console.log('📊 Monitoring jobs for 30 seconds...\n');

  for (let i = 0; i < 6; i++) {
    await setTimeout(5000);

    console.log(`\n📈 Progress Report (${(i + 1) * 5}s):`);

    // Get comprehensive statistics
    const stats = await cronService.getJobStats();
    console.log('📊 Overall Statistics:', {
      total: stats.total,
      active: stats.active,
      paused: stats.paused,
      cancelled: stats.cancelled,
      completed: stats.completed,
      totalRuns: stats.totalRuns,
    });

    // Get specific counts
    const activeCount = await cronService.getActiveJobsCount();
    const completedCount = await cronService.getCompletedJobsCount();
    const totalRuns = await cronService.getTotalRunsCount();
    const jobsInWindow = await cronService.getJobsInWindow();

    console.log('📈 Specific Counts:', {
      activeJobs: activeCount,
      completedJobs: completedCount,
      totalRuns,
      jobsInWindow,
    });

    // Get individual job details
    const job3s = await cronService.getJobStatus('every-3-seconds');
    const job7s = await cronService.getJobStatus('every-7-seconds');
    const jobMinute = await cronService.getJobStatus('every-minute');
    const jobOneTime = await cronService.getJobStatus('one-time-monitor');

    console.log('🔍 Individual Job Details:');
    console.log('  3s job:', {
      status: job3s?.status,
      runCount: job3s?.run_count,
      lastRun: job3s?.last_run
        ? new Date(job3s.last_run).toISOString()
        : 'Never',
    });
    console.log('  7s job:', {
      status: job7s?.status,
      runCount: job7s?.run_count,
      lastRun: job7s?.last_run
        ? new Date(job7s.last_run).toISOString()
        : 'Never',
    });
    console.log('  Minute job:', {
      status: jobMinute?.status,
      runCount: jobMinute?.run_count,
      lastRun: jobMinute?.last_run
        ? new Date(jobMinute.last_run).toISOString()
        : 'Never',
    });
    console.log('  One-time job:', {
      status: jobOneTime?.status,
      runCount: jobOneTime?.run_count,
      lastRun: jobOneTime?.last_run
        ? new Date(jobOneTime.last_run).toISOString()
        : 'Never',
    });
  }

  // Clean up old jobs (this won't affect our current jobs since they're not cancelled)
  console.log('\n🧹 Cleaning up old cancelled jobs...');
  const cleanedCount = await cronService.cleanupOldJobs(1); // Clean jobs older than 1 day
  console.log('📊 Cleaned up jobs:', cleanedCount);

  // Stop the service
  console.log('⏹️  Stopping the cron service...');
  await cronService.stop();

  console.log('\n✅ Monitoring example completed!');
}

// Run the example
monitoringExample().catch(console.error);
