import { schedule, cronService, updateJobData, getJobData } from '../src';

async function persistentDataExample() {
  console.log('🚀 Starting Persistent Data Example\n');

  // Schedule a job with initial data
  await schedule(
    '*/10 * * * * *',
    'data-job',
    async (ctx) => {
      console.log(
        `📅 Job executed at ${new Date(ctx.timestamp).toISOString()}`
      );
      console.log(`🆔 Job ID: ${ctx.identifier}`);
      console.log(`🔄 Run count: ${ctx.runCount}`);
      console.log(`📊 Current data:`, ctx.data);

      // Update the data for the next run
      const newData = {
        ...ctx.data,
        lastRun: new Date().toISOString(),
        runCount: ctx.runCount,
        randomValue: Math.random(),
        updatedAt: Date.now(),
      };

      // Update the job data for persistence
      await updateJobData(ctx.identifier, newData);
      console.log(`💾 Updated data for next run\n`);
    },
    {
      initialValue: 'Hello from persistent data!',
      createdAt: new Date().toISOString(),
      counter: 0,
    }
  );

  // Schedule another job that tracks user preferences
  await schedule('*/15 * * * * *', 'user-preferences', async (ctx) => {
    console.log(`👤 Processing user preferences for job: ${ctx.identifier}`);

    const preferences = ctx.data || {
      theme: 'dark',
      notifications: true,
      language: 'en',
      lastUpdated: null,
    };

    // Simulate some preference processing
    if (ctx.runCount % 3 === 0) {
      preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark';
      preferences.lastUpdated = new Date().toISOString();
      await updateJobData(ctx.identifier, preferences);
      console.log(`🎨 Theme switched to: ${preferences.theme}`);
    }

    console.log(`📱 Current preferences:`, preferences);
    console.log(`⏰ Next run at: ${new Date(ctx.timestamp).toISOString()}\n`);
  });

  // Schedule a job that accumulates data over time
  await schedule('*/20 * * * * *', 'accumulator', async (ctx) => {
    console.log(`📈 Accumulator job running (${ctx.identifier})`);

    const accumulator = ctx.data || {
      values: [],
      sum: 0,
      average: 0,
      maxValue: 0,
      minValue: Infinity,
    };

    // Generate a new value
    const newValue = Math.floor(Math.random() * 100);
    accumulator.values.push(newValue);
    accumulator.sum += newValue;
    accumulator.average = accumulator.sum / accumulator.values.length;
    accumulator.maxValue = Math.max(accumulator.maxValue, newValue);
    accumulator.minValue = Math.min(accumulator.minValue, newValue);

    // Keep only last 10 values to prevent memory issues
    if (accumulator.values.length > 10) {
      accumulator.values = accumulator.values.slice(-10);
    }

    console.log(`🎲 New value: ${newValue}`);
    console.log(
      `📊 Stats: sum=${accumulator.sum}, avg=${accumulator.average.toFixed(
        2
      )}, max=${accumulator.maxValue}, min=${accumulator.minValue}`
    );
    console.log(`📝 Values: [${accumulator.values.join(', ')}]\n`);

    await updateJobData(ctx.identifier, accumulator);
  });

  // Start the service
  await cronService.start();
  console.log('✅ Cron service started with persistent data jobs\n');

  // Demonstrate data retrieval
  setTimeout(async () => {
    console.log('🔍 Retrieving job data...\n');

    const dataJobData = await getJobData('data-job');
    console.log('📊 Data job data:', dataJobData);

    const preferencesData = await getJobData('user-preferences');
    console.log('👤 User preferences data:', preferencesData);

    const accumulatorData = await getJobData('accumulator');
    console.log('📈 Accumulator data:', accumulatorData);

    console.log('\n🛑 Stopping service in 5 seconds...');

    setTimeout(async () => {
      await cronService.stop();
      console.log('✅ Service stopped');
      process.exit(0);
    }, 5000);
  }, 30000); // Wait 30 seconds before checking data
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await cronService.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await cronService.stop();
  process.exit(0);
});

// Run the example
persistentDataExample().catch(console.error);
