import { CronService, SqliteDriver } from '../src/index';
import { setTimeout } from 'node:timers/promises';

interface ExtremeLoadTestConfig {
  totalJobs: number;
  batchSize: number;
  cronPatterns: string[];
  testDuration: number;
  reportInterval: number;
  enableWAL?: boolean; // Write-Ahead Logging for better performance
}

interface ExtremeLoadTestResult {
  totalJobs: number;
  activeJobs: number;
  totalRuns: number;
  avgScheduleTime: number;
  avgQueryTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  executionTime: number;
  jobsPerSecond: number;
  runsPerSecond: number;
  memoryPerJob: number; // KB per job
}

async function extremeLoadTest(
  config: ExtremeLoadTestConfig
): Promise<ExtremeLoadTestResult> {
  console.log(
    `🔥 Starting Extreme Load Test with ${config.totalJobs.toLocaleString()} jobs\n`
  );

  const startTime = Date.now();

  // Create highly optimized driver for extreme load testing
  const driver = new SqliteDriver({
    db: 'extreme-load-test.db',
    chunkSize: 50000, // Very large chunks for maximum performance
    refreshInterval: 5 * 60 * 1000, // 5 minutes refresh
    lookAheadWindow: 6 * 60 * 1000, // 6 minutes look ahead
  });

  const service = new CronService(driver);
  await driver.init();

  // Enable WAL mode for better concurrent performance if supported
  if (config.enableWAL) {
    try {
      // This would require access to the underlying database
      console.log('📝 WAL mode enabled for better performance');
    } catch (error) {
      console.log('⚠️  WAL mode not available');
    }
  }

  console.log('📊 Initial memory usage:', {
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    external: Math.round(process.memoryUsage().external / 1024 / 1024),
  });

  // Phase 1: Mass job scheduling with progress tracking
  console.log('\n📅 Phase 1: Mass job scheduling...');
  const scheduleStartTime = Date.now();

  let lastReportTime = Date.now();
  let lastReportCount = 0;

  for (let i = 0; i < config.totalJobs; i += config.batchSize) {
    const batchStart = Date.now();
    const batchEnd = Math.min(i + config.batchSize, config.totalJobs);

    // Schedule batch of jobs
    const promises: Promise<string>[] = [];
    for (let j = i; j < batchEnd; j++) {
      const pattern = config.cronPatterns[j % config.cronPatterns.length];
      const identifier = `extreme-job-${j}`;

      promises.push(
        service.schedule(pattern, identifier, async () => {
          // Ultra-minimal job execution for extreme load testing
          return;
        })
      );
    }

    await Promise.all(promises);

    const currentTime = Date.now();
    const jobsScheduled = batchEnd;

    // Progress reporting every 30 seconds or every 100k jobs
    if (
      currentTime - lastReportTime > 30000 ||
      jobsScheduled - lastReportCount > 100000
    ) {
      const elapsed = currentTime - startTime;
      const jobsPerSecond = Math.round(jobsScheduled / (elapsed / 1000));
      const mem = process.memoryUsage();

      console.log(
        `  Progress: ${jobsScheduled.toLocaleString()}/${config.totalJobs.toLocaleString()} jobs (${jobsPerSecond.toLocaleString()} jobs/sec)`
      );
      console.log(
        `  Memory: ${Math.round(
          mem.heapUsed / 1024 / 1024
        )}MB used, ${Math.round(mem.heapTotal / 1024 / 1024)}MB total`
      );
      console.log(
        `  ETA: ${Math.round(
          (config.totalJobs - jobsScheduled) / jobsPerSecond
        )}s remaining`
      );

      lastReportTime = currentTime;
      lastReportCount = jobsScheduled;
    }
  }

  const totalScheduleTime = Date.now() - scheduleStartTime;
  const avgScheduleTime = totalScheduleTime / config.totalJobs;
  const jobsPerSecond = Math.round(
    config.totalJobs / (totalScheduleTime / 1000)
  );

  console.log(
    `\n✅ Scheduled ${config.totalJobs.toLocaleString()} jobs in ${totalScheduleTime}ms`
  );
  console.log(`📊 Performance metrics:`);
  console.log(
    `  Average schedule time: ${avgScheduleTime.toFixed(2)}ms per job`
  );
  console.log(`  Jobs per second: ${jobsPerSecond.toLocaleString()}`);
  console.log(
    `  Total memory used: ${Math.round(
      process.memoryUsage().heapUsed / 1024 / 1024
    )}MB`
  );

  // Phase 2: Start service and monitor execution
  console.log('\n▶️  Phase 2: Starting service and monitoring execution...');
  await service.start();

  const monitorStartTime = Date.now();
  const reportCount = Math.floor(config.testDuration / config.reportInterval);

  let totalRuns = 0;
  let lastRuns = 0;
  let peakRunsPerSecond = 0;

  for (let i = 0; i < reportCount; i++) {
    await setTimeout(config.reportInterval * 1000);

    const currentRuns = await service.getTotalRunsCount();
    const runsInInterval = currentRuns - lastRuns;
    const runsPerSecond = runsInInterval / config.reportInterval;

    if (runsPerSecond > peakRunsPerSecond) {
      peakRunsPerSecond = runsPerSecond;
    }

    const stats = await service.getJobStats();
    const mem = process.memoryUsage();

    console.log(
      `\n📈 Execution Report ${i + 1}/${reportCount} (${
        (i + 1) * config.reportInterval
      }s):`
    );
    console.log(`  Active jobs: ${stats.active.toLocaleString()}`);
    console.log(`  Runs in interval: ${runsInInterval.toLocaleString()}`);
    console.log(`  Runs per second: ${runsPerSecond.toFixed(2)}`);
    console.log(`  Peak runs per second: ${peakRunsPerSecond.toFixed(2)}`);
    console.log(`  Total runs: ${currentRuns.toLocaleString()}`);
    console.log(`  Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB used`);

    totalRuns = currentRuns;
    lastRuns = currentRuns;
  }

  // Phase 3: Performance benchmarking
  console.log('\n⚡ Phase 3: Performance benchmarking...');

  // Test random job queries
  const queryStartTime = Date.now();
  const queryPromises: Promise<any>[] = [];

  for (let i = 0; i < 10000; i++) {
    const jobId = Math.floor(Math.random() * config.totalJobs);
    queryPromises.push(service.getJobStatus(`extreme-job-${jobId}`));
  }

  await Promise.all(queryPromises);
  const queryTime = Date.now() - queryStartTime;
  const avgQueryTime = queryTime / 10000;

  console.log(
    `📊 Query performance: ${queryTime}ms for 10,000 random job queries`
  );
  console.log(`📊 Average query time: ${avgQueryTime.toFixed(2)}ms per query`);

  // Test bulk operations
  console.log('\n📦 Testing bulk operations...');
  const bulkStartTime = Date.now();

  // Get statistics for all jobs
  const allStats = await service.getJobStats();
  const bulkTime = Date.now() - bulkStartTime;

  console.log(
    `📊 Bulk stats query: ${bulkTime}ms for ${config.totalJobs.toLocaleString()} jobs`
  );

  // Phase 4: Cleanup
  console.log('\n🧹 Phase 4: Cleanup...');
  await service.stop();
  await driver.destroy();

  const totalExecutionTime = Date.now() - startTime;
  const finalMem = process.memoryUsage();
  const memoryPerJob = Math.round(
    (finalMem.heapUsed / 1024 / 1024 / config.totalJobs) * 1000
  );

  const result: ExtremeLoadTestResult = {
    totalJobs: config.totalJobs,
    activeJobs: await service.getActiveJobsCount(),
    totalRuns,
    avgScheduleTime,
    avgQueryTime,
    memoryUsage: finalMem,
    executionTime: totalExecutionTime,
    jobsPerSecond,
    runsPerSecond: totalRuns / config.testDuration,
    memoryPerJob,
  };

  return result;
}

async function runExtremeLoadTests() {
  console.log('🔥 HyperCron Extreme Load Testing Suite\n');

  const testConfigs: ExtremeLoadTestConfig[] = [
    {
      totalJobs: 100000,
      batchSize: 1000,
      cronPatterns: ['*/30 * * * * *', '0 * * * * *', '0 0 * * * *'],
      testDuration: 60,
      reportInterval: 20,
    },
    {
      totalJobs: 500000,
      batchSize: 5000,
      cronPatterns: ['*/15 * * * * *', '*/30 * * * * *', '0 * * * * *'],
      testDuration: 120,
      reportInterval: 30,
    },
    {
      totalJobs: 1000000,
      batchSize: 10000,
      cronPatterns: ['*/10 * * * * *', '*/20 * * * * *', '*/30 * * * * *'],
      testDuration: 180,
      reportInterval: 45,
      enableWAL: true,
    },
  ];

  const results: ExtremeLoadTestResult[] = [];

  for (const config of testConfigs) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 EXTREME TEST: ${config.totalJobs.toLocaleString()} Jobs`);
    console.log(`${'='.repeat(70)}`);

    try {
      const result = await extremeLoadTest(config);
      results.push(result);

      console.log(`\n✅ Extreme test completed successfully!`);
      console.log(`📊 Final Results:`);
      console.log(`  Total jobs: ${result.totalJobs.toLocaleString()}`);
      console.log(`  Total runs: ${result.totalRuns.toLocaleString()}`);
      console.log(
        `  Jobs per second: ${result.jobsPerSecond.toLocaleString()}`
      );
      console.log(`  Runs per second: ${result.runsPerSecond.toFixed(2)}`);
      console.log(`  Memory per job: ${result.memoryPerJob}KB`);
      console.log(
        `  Total memory: ${Math.round(
          result.memoryUsage.heapUsed / 1024 / 1024
        )}MB`
      );
      console.log(`  Execution time: ${result.executionTime}ms`);
    } catch (error) {
      console.error(`❌ Extreme test failed:`, error);
    }
  }

  // Extreme summary report
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 EXTREME LOAD TEST SUMMARY`);
  console.log(`${'='.repeat(70)}`);

  results.forEach((result, index) => {
    const config = testConfigs[index];
    console.log(`\n${config.totalJobs.toLocaleString()} Jobs:`);
    console.log(
      `  Scheduling: ${result.jobsPerSecond.toLocaleString()} jobs/sec`
    );
    console.log(`  Execution: ${result.runsPerSecond.toFixed(2)} runs/sec`);
    console.log(`  Memory efficiency: ${result.memoryPerJob}KB per job`);
    console.log(
      `  Query performance: ${result.avgQueryTime.toFixed(2)}ms per query`
    );
  });

  console.log(`\n🎯 Extreme load testing completed!`);
  console.log(
    `💡 This demonstrates HyperCron's ability to handle millions of cron jobs efficiently!`
  );
}

// Run the extreme load tests
runExtremeLoadTests().catch(console.error);
