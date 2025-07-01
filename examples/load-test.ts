import { CronService, SqliteDriver } from '../src/index';
import { setTimeout } from 'node:timers/promises';

interface LoadTestConfig {
  totalJobs: number;
  batchSize: number;
  cronPatterns: string[];
  testDuration: number; // in seconds
  reportInterval: number; // in seconds
}

interface LoadTestResult {
  totalJobs: number;
  activeJobs: number;
  totalRuns: number;
  avgScheduleTime: number;
  avgQueryTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  executionTime: number;
}

async function loadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(
    `🚀 Starting Load Test with ${config.totalJobs.toLocaleString()} jobs\n`
  );

  const startTime = Date.now();

  // Create optimized driver for load testing
  const driver = new SqliteDriver({
    db: 'load-test.db',
    chunkSize: 10000, // Larger chunks for better performance
    refreshInterval: 60 * 1000, // 1 minute refresh
    lookAheadWindow: 70 * 1000, // 70 seconds look ahead
  });

  const service = new CronService(driver);
  await driver.init();

  console.log('📊 Initial memory usage:', process.memoryUsage());

  // Phase 1: Schedule jobs in batches
  console.log('\n📅 Phase 1: Scheduling jobs...');
  const scheduleStartTime = Date.now();

  for (let i = 0; i < config.totalJobs; i += config.batchSize) {
    const batchStart = Date.now();
    const batchEnd = Math.min(i + config.batchSize, config.totalJobs);

    // Schedule batch of jobs
    const promises: Promise<string>[] = [];
    for (let j = i; j < batchEnd; j++) {
      const pattern = config.cronPatterns[j % config.cronPatterns.length];
      const identifier = `load-test-job-${j}`;

      promises.push(
        service.schedule(pattern, identifier, async () => {
          // Minimal job execution for load testing
          return;
        })
      );
    }

    await Promise.all(promises);

    const batchTime = Date.now() - batchStart;
    const jobsInBatch = batchEnd - i;
    const jobsPerSecond = Math.round((jobsInBatch / batchTime) * 1000);

    console.log(
      `  Batch ${
        Math.floor(i / config.batchSize) + 1
      }: ${jobsInBatch.toLocaleString()} jobs in ${batchTime}ms (${jobsPerSecond.toLocaleString()} jobs/sec)`
    );

    // Report memory usage every 10 batches
    if ((i / config.batchSize) % 10 === 0) {
      const mem = process.memoryUsage();
      console.log(
        `  Memory: ${Math.round(
          mem.heapUsed / 1024 / 1024
        )}MB used, ${Math.round(mem.heapTotal / 1024 / 1024)}MB total`
      );
    }
  }

  const totalScheduleTime = Date.now() - scheduleStartTime;
  const avgScheduleTime = totalScheduleTime / config.totalJobs;

  console.log(
    `\n✅ Scheduled ${config.totalJobs.toLocaleString()} jobs in ${totalScheduleTime}ms`
  );
  console.log(
    `📊 Average schedule time: ${avgScheduleTime.toFixed(2)}ms per job`
  );

  // Phase 2: Start service and monitor
  console.log('\n▶️  Phase 2: Starting service and monitoring...');
  await service.start();

  const monitorStartTime = Date.now();
  const reportCount = Math.floor(config.testDuration / config.reportInterval);

  let totalRuns = 0;
  let lastRuns = 0;

  for (let i = 0; i < reportCount; i++) {
    await setTimeout(config.reportInterval * 1000);

    const currentRuns = await service.getTotalRunsCount();
    const runsInInterval = currentRuns - lastRuns;
    const runsPerSecond = runsInInterval / config.reportInterval;

    const stats = await service.getJobStats();
    const mem = process.memoryUsage();

    console.log(
      `\n📈 Report ${i + 1}/${reportCount} (${
        (i + 1) * config.reportInterval
      }s):`
    );
    console.log(`  Active jobs: ${stats.active.toLocaleString()}`);
    console.log(`  Runs in interval: ${runsInInterval.toLocaleString()}`);
    console.log(`  Runs per second: ${runsPerSecond.toFixed(2)}`);
    console.log(`  Total runs: ${currentRuns.toLocaleString()}`);
    console.log(`  Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB used`);

    totalRuns = currentRuns;
    lastRuns = currentRuns;
  }

  // Phase 3: Performance testing
  console.log('\n⚡ Phase 3: Performance testing...');

  // Test query performance
  const queryStartTime = Date.now();
  const queryPromises: Promise<any>[] = [];

  for (let i = 0; i < 1000; i++) {
    const jobId = Math.floor(Math.random() * config.totalJobs);
    queryPromises.push(service.getJobStatus(`load-test-job-${jobId}`));
  }

  await Promise.all(queryPromises);
  const queryTime = Date.now() - queryStartTime;
  const avgQueryTime = queryTime / 1000;

  console.log(
    `📊 Query performance: ${queryTime}ms for 1000 random job queries`
  );
  console.log(`📊 Average query time: ${avgQueryTime.toFixed(2)}ms per query`);

  // Phase 4: Cleanup
  console.log('\n🧹 Phase 4: Cleanup...');
  await service.stop();
  await driver.destroy();

  const totalExecutionTime = Date.now() - startTime;
  const finalMem = process.memoryUsage();

  const result: LoadTestResult = {
    totalJobs: config.totalJobs,
    activeJobs: await service.getActiveJobsCount(),
    totalRuns,
    avgScheduleTime,
    avgQueryTime,
    memoryUsage: finalMem,
    executionTime: totalExecutionTime,
  };

  return result;
}

async function runLoadTests() {
  console.log('🔥 HyperCron Load Testing Suite\n');

  const testConfigs: LoadTestConfig[] = [
    {
      totalJobs: 1000,
      batchSize: 100,
      cronPatterns: ['*/30 * * * * *', '0 * * * * *', '0 0 * * * *'],
      testDuration: 30,
      reportInterval: 10,
    },
    {
      totalJobs: 10000,
      batchSize: 500,
      cronPatterns: ['*/15 * * * * *', '*/30 * * * * *', '0 * * * * *'],
      testDuration: 60,
      reportInterval: 15,
    },
    {
      totalJobs: 100000,
      batchSize: 1000,
      cronPatterns: ['*/10 * * * * *', '*/20 * * * * *', '*/30 * * * * *'],
      testDuration: 120,
      reportInterval: 30,
    },
  ];

  const results: LoadTestResult[] = [];

  for (const config of testConfigs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${config.totalJobs.toLocaleString()} Jobs`);
    console.log(`${'='.repeat(60)}`);

    try {
      const result = await loadTest(config);
      results.push(result);

      console.log(`\n✅ Test completed successfully!`);
      console.log(`📊 Final Results:`);
      console.log(`  Total jobs: ${result.totalJobs.toLocaleString()}`);
      console.log(`  Total runs: ${result.totalRuns.toLocaleString()}`);
      console.log(`  Execution time: ${result.executionTime}ms`);
      console.log(
        `  Memory used: ${Math.round(
          result.memoryUsage.heapUsed / 1024 / 1024
        )}MB`
      );
      console.log(
        `  Avg schedule time: ${result.avgScheduleTime.toFixed(2)}ms`
      );
      console.log(`  Avg query time: ${result.avgQueryTime.toFixed(2)}ms`);
    } catch (error) {
      console.error(`❌ Test failed:`, error);
    }
  }

  // Summary report
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 LOAD TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);

  results.forEach((result, index) => {
    const config = testConfigs[index];
    console.log(`\n${config.totalJobs.toLocaleString()} Jobs:`);
    console.log(
      `  Jobs per second: ${Math.round(
        config.totalJobs / (result.executionTime / 1000)
      )}`
    );
    console.log(
      `  Runs per second: ${(result.totalRuns / config.testDuration).toFixed(
        2
      )}`
    );
    console.log(
      `  Memory efficiency: ${Math.round(
        (result.memoryUsage.heapUsed / 1024 / 1024 / config.totalJobs) * 1000
      )}KB per job`
    );
  });

  console.log(`\n🎯 Load testing completed!`);
}

// Run the load tests
runLoadTests().catch(console.error);
