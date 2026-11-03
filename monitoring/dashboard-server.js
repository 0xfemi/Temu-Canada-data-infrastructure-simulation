/**
 * Monitoring Dashboard Server
 * Serves real-time metrics dashboard via WebSocket
 *
 * Every figure sent to the dashboard comes from the simulation modules:
 * the event stream (real-time-processor), auto-scaling and cost
 * (scaling-simulator), A/B experiments (ab-testing) and batch jobs
 * (batch-processor).
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RealTimeProcessor = require('../pipelines/real-time-processor');
const BatchProcessor = require('../pipelines/batch-processor');
const ScalingSimulator = require('../infrastructure/scaling-simulator');
const { ABTestingSimulator } = require('../analytics/ab-testing');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Initialize simulation components
const processor = new RealTimeProcessor();
const scaler = new ScalingSimulator();
const launchInstances = { ...scaler.currentInstances };
const batchProcessor = new BatchProcessor();
const abTesting = new ABTestingSimulator();

// Aggregates business analytics from the properties of processed events
class StreamAnalytics {
    constructor() {
        this.ordersCreated = 0;
        this.ordersCompleted = 0;
        this.revenue = 0;
        this.cities = {};
        this.paymentMethods = {};
        this.channels = {};
    }

    record({ event }) {
        const props = event.properties;
        const city = this.cities[props.city] || (this.cities[props.city] = { events: 0, orders: 0, revenue: 0 });
        city.events++;

        switch (event.type) {
            case 'order.created':
                this.ordersCreated++;
                break;
            case 'order.completed': {
                const amount = parseFloat(props.amount);
                this.ordersCompleted++;
                this.revenue += amount;
                city.orders++;
                city.revenue += amount;
                const method = this.paymentMethods[props.paymentMethod] || (this.paymentMethods[props.paymentMethod] = { orders: 0, revenue: 0 });
                method.orders++;
                method.revenue += amount;
                break;
            }
            case 'ad.impression':
            case 'ad.click': {
                const channel = this.channels[props.channel] || (this.channels[props.channel] = { impressions: 0, clicks: 0 });
                if (event.type === 'ad.impression') channel.impressions++;
                else channel.clicks++;
                break;
            }
        }

        // Each user event is a visit the launch experiments can allocate
        if (event.topic === 'user-events') {
            abTesting.simulateVisitor(event.userId);
        }
    }

    getMetrics() {
        const sortBy = (obj, key) => Object.entries(obj)
            .map(([name, values]) => ({ name, ...values }))
            .sort((a, b) => b[key] - a[key]);

        return {
            ordersCreated: this.ordersCreated,
            ordersCompleted: this.ordersCompleted,
            revenue: this.revenue,
            averageOrderValue: this.ordersCompleted > 0 ? this.revenue / this.ordersCompleted : 0,
            cities: sortBy(this.cities, 'events'),
            paymentMethods: sortBy(this.paymentMethods, 'orders'),
            channels: sortBy(this.channels, 'impressions').map(c => ({
                ...c,
                ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
            }))
        };
    }
}

const analytics = new StreamAnalytics();
processor.on('eventProcessed', payload => analytics.record(payload));

function getScalingMetrics() {
    const state = scaler.getState();
    return {
        instances: state.instances,
        launchInstances,
        load: state.load,
        thresholds: scaler.targetMetrics,
        cost: state.totalCost,
        recommendations: state.recommendations,
        scalingEvents: scaler.scalingHistory.length,
        history: scaler.scalingHistory.slice(-5).reverse()
    };
}

function getExperimentResults() {
    return abTesting.platform.listExperiments().map(exp => {
        const results = abTesting.platform.getResults(exp.id);
        return {
            id: exp.id,
            name: exp.name,
            variants: results.variants.map(v => ({
                name: v.name,
                traffic: v.traffic,
                conversions: v.conversions,
                conversionRate: v.conversionRate
            })),
            significance: results.statisticalSignificance
        };
    });
}

function getBatchJobs() {
    return batchProcessor.getAllJobsStatus().map(job => ({
        name: job.name,
        status: job.status,
        steps: job.steps.length,
        currentStep: job.currentStep,
        currentStepName: job.currentStep !== null ? job.steps[job.currentStep] : null,
        startTime: job.startTime,
        duration: job.lastRun ? job.lastRun.duration : null
    }));
}

function snapshot() {
    return {
        processor: processor.getMetrics(),
        business: analytics.getMetrics(),
        scaling: getScalingMetrics(),
        experiments: getExperimentResults(),
        batch: getBatchJobs(),
        timestamp: new Date().toISOString()
    };
}

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected to dashboard');

    // Send initial data
    socket.emit('metrics', snapshot());

    socket.on('disconnect', () => {
        console.log('Client disconnected from dashboard');
    });
});

// Each processor metrics tick runs one auto-scaling cycle, then broadcasts
processor.on('metrics', () => {
    scaler.scale(processor.getMetrics().eventsPerSecond);
    io.emit('metrics', snapshot());
});

// Start the simulation
abTesting.initializeLaunchExperiments();
batchProcessor.initializeJobs();
processor.start(100);
batchProcessor.runScheduledJobs();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\nMonitoring Dashboard Server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/monitoring/dashboard.html to view metrics\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down dashboard server...');
    processor.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
