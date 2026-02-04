/**
 * Main Demo Script
 * Demonstrates the complete data infrastructure simulation
 */

const RealTimeProcessor = require('./pipelines/real-time-processor');
const ScalingSimulator = require('./infrastructure/scaling-simulator');
const BatchProcessor = require('./pipelines/batch-processor');
const { ABTestingSimulator } = require('./analytics/ab-testing');

class DataInfrastructureDemo {
    constructor() {
        this.processor = new RealTimeProcessor();
        this.scaler = new ScalingSimulator();
        this.batchProcessor = new BatchProcessor();
        this.abTesting = new ABTestingSimulator();
        this.isRunning = false;
    }

    // Run complete demo
    async runDemo() {
        console.log('\n' + '='.repeat(70));
        console.log('TEMU NIGERIA LAUNCH - DATA INFRASTRUCTURE SIMULATION');
        console.log('='.repeat(70));
        console.log('\nThis simulation demonstrates what Temu\'s data infrastructure');
        console.log('preparation might have looked like before launching in Nigeria.\n');

        // Initialize components
        console.log('Initializing infrastructure components...');
        this.batchProcessor.initializeJobs();
        this.abTesting.initializeLaunchExperiments();
        console.log('All components initialized\n');

        // Start real-time processing
        console.log('Starting real-time data processing...');
        this.processor.start(100); // 100 events/second

        // Start monitoring loop
        this.startMonitoring();

        // Simulate A/B testing traffic
        setTimeout(() => {
            console.log('\nStarting A/B testing traffic simulation...');
            this.abTesting.simulateTraffic(60000); // 1 minute
        }, 5000);

        // Run batch jobs after 30 seconds
        setTimeout(async () => {
            console.log('\nRunning scheduled batch jobs...');
            await this.batchProcessor.runScheduledJobs();
        }, 30000);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            this.stopDemo();
        });
    }

    // Monitor and display metrics
    startMonitoring() {
        const monitorInterval = setInterval(() => {
            if (!this.isRunning && this.processor.isRunning) {
                this.isRunning = true;
            }

            if (!this.processor.isRunning) {
                clearInterval(monitorInterval);
                return;
            }

            const metrics = this.processor.getMetrics();
            const scalingChanges = this.scaler.scale(metrics.eventsPerSecond);
            const state = this.scaler.getState();

            // Display metrics every 15 seconds
            console.log('\n' + '-'.repeat(70));
            console.log('REAL-TIME METRICS');
            console.log('-'.repeat(70));
            console.log(`Events Processed: ${metrics.totalEvents.toLocaleString()}`);
            console.log(`Events/sec: ${metrics.eventsPerSecond.toFixed(2)}`);
            console.log(`Latency P95: ${metrics.latency.p95}ms`);
            console.log(`Error Rate: ${metrics.errorRate.toFixed(3)}%`);
            console.log(`\nInfrastructure:`);
            console.log(`  API Servers: ${state.instances.apiServers}`);
            console.log(`  DB Replicas: ${state.instances.databaseReplicas}`);
            console.log(`  Kafka Brokers: ${state.instances.kafkaBrokers}`);
            console.log(`  Processing Workers: ${state.instances.processingWorkers}`);
            console.log(`  Cache Nodes: ${state.instances.cacheNodes}`);
            console.log(`\nResource Usage:`);
            console.log(`  CPU: ${state.load.cpu.toFixed(1)}%`);
            console.log(`  Memory: ${state.load.memory.toFixed(1)}%`);
            console.log(`  Requests/sec: ${state.load.requestsPerSecond.toFixed(0)}`);
            console.log(`\nEstimated Cost: $${state.totalCost.hourly.toFixed(2)}/hour`);

            if (Object.keys(scalingChanges).length > 0) {
                console.log(`\nAuto-scaling triggered:`);
                Object.keys(scalingChanges).forEach(component => {
                    const change = scalingChanges[component];
                    console.log(`  ${component}: ${change.from} → ${change.to}`);
                });
            }

            // Display A/B test results
            const experiments = this.abTesting.platform.listExperiments();
            if (experiments.length > 0) {
                console.log(`\nA/B Tests Running: ${experiments.length}`);
            }

        }, 15000);
    }

    // Stop demo
    stopDemo() {
        console.log('\n\nShutting down simulation...');
        this.processor.stop();
        this.isRunning = false;

        // Print final summary
        this.printFinalSummary();

        process.exit(0);
    }

    // Print final summary
    printFinalSummary() {
        const metrics = this.processor.getMetrics();
        const state = this.scaler.getState();
        const jobs = this.batchProcessor.getAllJobsStatus();
        const experiments = this.abTesting.platform.listExperiments();

        console.log('\n' + '='.repeat(70));
        console.log('SIMULATION SUMMARY');
        console.log('='.repeat(70));

        console.log('\nReal-Time Processing:');
        console.log(`   Total Events: ${metrics.totalEvents.toLocaleString()}`);
        console.log(`   Avg Events/sec: ${metrics.eventsPerSecond.toFixed(2)}`);
        console.log(`   Latency P95: ${metrics.latency.p95}ms`);
        console.log(`   Error Rate: ${metrics.errorRate.toFixed(3)}%`);

        console.log('\nInfrastructure:');
        console.log(`   API Servers: ${state.instances.apiServers}`);
        console.log(`   Database Replicas: ${state.instances.databaseReplicas}`);
        console.log(`   Kafka Brokers: ${state.instances.kafkaBrokers}`);
        console.log(`   Processing Workers: ${state.instances.processingWorkers}`);
        console.log(`   Cache Nodes: ${state.instances.cacheNodes}`);
        console.log(`   Scaling Events: ${state.scaler?.scalingHistory?.length || 0}`);

        console.log('\nCost Estimate:');
        console.log(`   Hourly: $${state.totalCost.hourly.toFixed(2)}`);
        console.log(`   Daily: $${state.totalCost.daily.toFixed(2)}`);
        console.log(`   Monthly: $${state.totalCost.monthly.toFixed(2)}`);

        console.log('\nBatch Jobs:');
        jobs.forEach(job => {
            const status = job.status === 'completed' ? '[OK]' : 
                         job.status === 'running' ? '[RUNNING]' : 
                         job.status === 'failed' ? '[FAILED]' : '[PENDING]';
            console.log(`   ${status} ${job.name}`);
        });

        console.log('\nA/B Tests:');
        experiments.forEach(exp => {
            console.log(`   ${exp.name} (${exp.status})`);
        });

        console.log('\n' + '='.repeat(70) + '\n');
    }
}

// Run demo if executed directly
if (require.main === module) {
    const demo = new DataInfrastructureDemo();
    demo.runDemo();
}

module.exports = DataInfrastructureDemo;
