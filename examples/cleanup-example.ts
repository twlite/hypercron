import { CronService } from '../src';
import { SqliteDriver } from '../src/driver/sqlite.driver';

async function cleanupExample() {
  console.log('🚀 HyperCron Cleanup Example\n');

  const driver = new SqliteDriver({
    db: './cleanup-example.db',
    chunkSize: 100,
    refreshInterval: 1000,
    lookAheadWindow: 60000,
  });

  const cronService = new CronService(driver);

  try {
    await cronService.init();
    console.log('✅ Cron service initialized');

    // Schedule some jobs that will complete quickly
    const jobIds: string[] = [];

    // Schedule 5 one-time jobs that will complete immediately
    for (let i = 0; i < 5; i++) {
      const jobId = await cronService.schedule(
        Date.now() + 100, // Run in 100ms
        `one-time-job-${i}`,
        async () => {
          console.log(`✅ One-time job ${i} completed`);
        }
      );
      jobIds.push(jobId);
    }

    // Schedule 3 recurring jobs
    for (let i = 0; i < 3; i++) {
      const jobId = await cronService.schedule(
        '*/2 * * * * *', // Every 2 seconds
        `recurring-job-${i}`,
        async () => {
          console.log(`🔄 Recurring job ${i} executed`);
        }
      );
      jobIds.push(jobId);
    }

    console.log(`📋 Scheduled ${jobIds.length} jobs`);
    console.log('⏳ Waiting for jobs to complete...\n');

    // Start the service
    await cronService.start();

    // Wait for one-time jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Cancel some recurring jobs
    console.log('🛑 Cancelling recurring jobs...');
    for (let i = 0; i < 2; i++) {
      await cronService.cancel(`recurring-job-${i}`);
      console.log(`❌ Cancelled recurring-job-${i}`);
    }

    // Wait a bit more
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Stop the service
    await cronService.stop();

    // Get initial stats
    const initialStats = await cronService.getJobStats();
    console.log('\n📊 Initial job statistics:');
    console.log(`   Total jobs: ${initialStats.total}`);
    console.log(`   Active jobs: ${initialStats.active}`);
    console.log(`   Completed jobs: ${initialStats.completed}`);
    console.log(`   Cancelled jobs: ${initialStats.cancelled}`);
    console.log(`   Total runs: ${initialStats.totalRuns}`);

    // Demonstrate cleanup functionality
    console.log('\n🧹 Cleanup demonstration:');

    // Clean up completed jobs (older than 0 days = all completed jobs)
    const completedRemoved = await cronService.cleanupCompletedJobs(0);
    console.log(`   Removed ${completedRemoved} completed jobs`);

    // Clean up cancelled jobs (older than 0 days = all cancelled jobs)
    const cancelledRemoved = await cronService.cleanupOldJobs(0);
    console.log(`   Removed ${cancelledRemoved} cancelled jobs`);

    // Get stats after cleanup
    const afterCleanupStats = await cronService.getJobStats();
    console.log('\n📊 Job statistics after cleanup:');
    console.log(`   Total jobs: ${afterCleanupStats.total}`);
    console.log(`   Active jobs: ${afterCleanupStats.active}`);
    console.log(`   Completed jobs: ${afterCleanupStats.completed}`);
    console.log(`   Cancelled jobs: ${afterCleanupStats.cancelled}`);
    console.log(`   Total runs: ${afterCleanupStats.totalRuns}`);

    // Demonstrate combined cleanup
    console.log('\n🔄 Scheduling more jobs for combined cleanup demo...');

    // Schedule more jobs
    for (let i = 0; i < 3; i++) {
      await cronService.schedule(
        Date.now() + 100,
        `demo-job-${i}`,
        async () => {
          console.log(`✅ Demo job ${i} completed`);
        }
      );
    }

    // Start service again
    await cronService.start();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await cronService.stop();

    // Cancel one job
    await cronService.cancel('demo-job-0');

    // Use combined cleanup method
    console.log('\n🧹 Using combined cleanup method...');
    const cleanupResult = await cronService.cleanupAllOldJobs(0, 0);
    console.log(`   Removed ${cleanupResult.completed} completed jobs`);
    console.log(`   Removed ${cleanupResult.cancelled} cancelled jobs`);

    // Final stats
    const finalStats = await cronService.getJobStats();
    console.log('\n📊 Final job statistics:');
    console.log(`   Total jobs: ${finalStats.total}`);
    console.log(`   Active jobs: ${finalStats.active}`);
    console.log(`   Completed jobs: ${finalStats.completed}`);
    console.log(`   Cancelled jobs: ${finalStats.cancelled}`);
    console.log(`   Total runs: ${finalStats.totalRuns}`);

    console.log('\n✅ Cleanup example completed successfully!');
  } catch (error) {
    console.error('❌ Error in cleanup example:', error);
  } finally {
    await cronService.destroy();
    console.log('🧹 Service destroyed and database cleaned up');
  }
}

// Run the example
cleanupExample().catch(console.error);
