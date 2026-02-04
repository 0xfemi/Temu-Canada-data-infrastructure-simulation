/**
 * Load Generator for Stress Testing
 * Simulates traffic spikes and load patterns
 */

const RealTimeProcessor = require('../pipelines/real-time-processor');
const ScalingSimulator = require('./scaling-simulator');

class LoadGenerator {
    constructor() {
        this.processor = new RealTimeProcessor();
        this.scaler = new ScalingSimulator();
        this.currentLoadProfile = 'normal';
        this.isRunning = false;
    }

    // Different load profiles
    loadProfiles = {
        normal: { eventsPerSecond: 100, duration: Infinity },
        spike: { eventsPerSecond: 1000, duration: 30000 }, // 30 seconds
        sustained: { eventsPerSecond: 500, duration: 300000 }, // 5 minutes
        gradual: { eventsPerSecond: 50, duration: Infinity, increment: 10, interval: 10000 },
        chaos: { eventsPerSecond: 2000, duration: 10000 } // 10 seconds
    };

    // Start load test
    async startLoadTest(profile = 'normal') {
        if (this.isRunning) {
            console.log('WARNING: Load test already running');
            return;
        }

        this.isRunning = true;
        this.currentLoadProfile = profile;
        const config = this.loadProfiles[profile];

        console.log(`\nStarting load test: ${profile}`);
        console.log(`   Events/sec: ${config.eventsPerSecond}`);
        console.log(`   Duration: ${config.duration === Infinity ? 'Indefinite' : config.duration + 'ms'}\n`);

        // Start processor
        this.processor.start(config.eventsPerSecond);

        // Monitor and scale
        const monitorInterval = setInterval(() => {
            const metrics = this.processor.getMetrics();
            const scalingChanges = this.scaler.scale(metrics.eventsPerSecond);
            
            if (Object.keys(scalingChanges).length > 0) {
                console.log('\nAuto-scaling triggered:');
                Object.keys(scalingChanges).forEach(component => {
                    const change = scalingChanges[component];
                    console.log(`   ${component}: ${change.from} → ${change.to} (${change.change > 0 ? '+' : ''}${change.change})`);
                });
            }

            // Log metrics every 10 seconds
            this.logStatus(metrics);
        }, 10000);

        // Handle profile-specific behavior
        if (config.duration !== Infinity) {
            setTimeout(() => {
                this.stopLoadTest();
                clearInterval(monitorInterval);
            }, config.duration);
        }

        // Handle gradual increase
        if (config.increment) {
            let currentRate = config.eventsPerSecond;
            const incrementInterval = setInterval(() => {
                if (!this.isRunning) {
                    clearInterval(incrementInterval);
                    return;
                }
                currentRate += config.increment;
                console.log(`\nIncreasing load to ${currentRate} events/sec`);
                this.processor.stop();
                this.processor = new RealTimeProcessor();
                this.processor.start(currentRate);
            }, config.interval);
        }

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            this.stopLoadTest();
            clearInterval(monitorInterval);
            process.exit(0);
        });
    }

    // Stop load test
    stopLoadTest() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        this.processor.stop();
        console.log('\nLoad test stopped');

        // Print final report
        this.printFinalReport();
    }

    // Log current status
    logStatus(metrics) {
        const state = this.scaler.getState();
        console.log('\nCurrent Status:');
        console.log(`   Events/sec: ${metrics.eventsPerSecond.toFixed(2)}`);
        console.log(`   Total events: ${metrics.totalEvents.toLocaleString()}`);
        console.log(`   Latency P95: ${metrics.latency.p95}ms`);
        console.log(`   Error rate: ${metrics.errorRate.toFixed(3)}%`);
        console.log(`   CPU: ${state.load.cpu.toFixed(1)}%`);
        console.log(`   Memory: ${state.load.memory.toFixed(1)}%`);
        console.log(`   API Servers: ${state.instances.apiServers}`);
        console.log(`   DB Replicas: ${state.instances.databaseReplicas}`);
        console.log(`   Estimated cost: $${state.totalCost.hourly.toFixed(2)}/hour`);
    }

    // Print final report
    printFinalReport() {
        const metrics = this.processor.getMetrics();
        const state = this.scaler.getState();

        console.log('\n' + '='.repeat(60));
        console.log('LOAD TEST FINAL REPORT');
        console.log('='.repeat(60));
        console.log(`\nProfile: ${this.currentLoadProfile}`);
        console.log(`\nPerformance Metrics:`);
        console.log(`   Total events processed: ${metrics.totalEvents.toLocaleString()}`);
        console.log(`   Average events/sec: ${metrics.eventsPerSecond.toFixed(2)}`);
        console.log(`   Latency P50: ${metrics.latency.p50}ms`);
        console.log(`   Latency P95: ${metrics.latency.p95}ms`);
        console.log(`   Latency P99: ${metrics.latency.p99}ms`);
        console.log(`   Total errors: ${metrics.errors}`);
        console.log(`   Error rate: ${metrics.errorRate.toFixed(3)}%`);

        console.log(`\nInfrastructure Scaling:`);
        console.log(`   API Servers: ${state.instances.apiServers}`);
        console.log(`   Database Replicas: ${state.instances.databaseReplicas}`);
        console.log(`   Kafka Brokers: ${state.instances.kafkaBrokers}`);
        console.log(`   Processing Workers: ${state.instances.processingWorkers}`);
        console.log(`   Cache Nodes: ${state.instances.cacheNodes}`);

        console.log(`\nCost Analysis:`);
        console.log(`   Hourly: $${state.totalCost.hourly.toFixed(2)}`);
        console.log(`   Daily: $${state.totalCost.daily.toFixed(2)}`);
        console.log(`   Monthly: $${state.totalCost.monthly.toFixed(2)}`);

        console.log(`\nScaling Events: ${this.scaler.scalingHistory.length}`);
        if (this.scaler.scalingHistory.length > 0) {
            console.log(`\nRecent scaling events:`);
            this.scaler.scalingHistory.slice(-5).forEach(event => {
                console.log(`   ${new Date(event.timestamp).toLocaleTimeString()}: ${Object.keys(event.changes).length} components scaled`);
            });
        }

        console.log('\n' + '='.repeat(60) + '\n');
    }

    // Run multiple load profiles sequentially
    async runStressTest() {
        console.log('\nStarting comprehensive stress test...\n');

        const profiles = ['normal', 'spike', 'sustained', 'gradual', 'chaos'];
        
        for (const profile of profiles) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Running profile: ${profile.toUpperCase()}`);
            console.log('='.repeat(60));

            await new Promise((resolve) => {
                this.startLoadTest(profile);
                
                if (this.loadProfiles[profile].duration === Infinity) {
                    // For infinite profiles, wait 30 seconds
                    setTimeout(() => {
                        this.stopLoadTest();
                        resolve();
                    }, 30000);
                } else {
                    setTimeout(() => {
                        resolve();
                    }, this.loadProfiles[profile].duration + 5000);
                }
            });

            // Wait between tests
            console.log('\nWaiting 5 seconds before next test...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log('\nStress test completed!\n');
    }
}

// Run if executed directly
if (require.main === module) {
    const generator = new LoadGenerator();
    
    const args = process.argv.slice(2);
    const profile = args[0] || 'normal';

    if (profile === 'stress') {
        generator.runStressTest();
    } else if (generator.loadProfiles[profile]) {
        generator.startLoadTest(profile);
    } else {
        console.log('Usage: node load-generator.js [profile]');
        console.log('Profiles: normal, spike, sustained, gradual, chaos, stress');
        process.exit(1);
    }
}

module.exports = LoadGenerator;
