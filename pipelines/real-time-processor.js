/**
 * Real-Time Data Processor Simulation
 * Simulates Apache Flink/Kafka Streams processing pipeline
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class RealTimeProcessor extends EventEmitter {
    constructor() {
        super();
        this.eventsProcessed = 0;
        this.startTime = Date.now();
        this.metrics = {
            userEvents: 0,
            transactionEvents: 0,
            marketingEvents: 0,
            infrastructureEvents: 0,
            errors: 0,
            latency: []
        };
        this.isRunning = false;
    }

    // Simulate event generation (in real system, these come from Kafka)
    generateEvent() {
        const eventTypes = [
            { type: 'user.click', topic: 'user-events', weight: 40 },
            { type: 'user.view', topic: 'user-events', weight: 30 },
            { type: 'user.search', topic: 'user-events', weight: 15 },
            { type: 'order.created', topic: 'transaction-events', weight: 5 },
            { type: 'order.completed', topic: 'transaction-events', weight: 3 },
            { type: 'ad.impression', topic: 'marketing-events', weight: 4 },
            { type: 'ad.click', topic: 'marketing-events', weight: 2 },
            { type: 'api.request', topic: 'infrastructure-events', weight: 1 }
        ];

        // Weighted random selection
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedEvent = eventTypes[0];

        for (const event of eventTypes) {
            cumulative += event.weight;
            if (random <= cumulative) {
                selectedEvent = event;
                break;
            }
        }

        return {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: selectedEvent.type,
            topic: selectedEvent.topic,
            timestamp: new Date().toISOString(),
            userId: `user_${Math.floor(Math.random() * 100000)}`,
            sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
            properties: this.generateEventProperties(selectedEvent.type)
        };
    }

    generateEventProperties(eventType) {
        const baseProps = {
            device: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
            os: ['iOS', 'Android', 'Windows', 'macOS'][Math.floor(Math.random() * 4)],
            country: 'CA', // Canada
            city: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa'][Math.floor(Math.random() * 5)]
        };

        switch (eventType) {
            case 'user.click':
                return {
                    ...baseProps,
                    element: ['product_card', 'add_to_cart', 'checkout', 'search_button'][Math.floor(Math.random() * 4)],
                    productId: `prod_${Math.floor(Math.random() * 1000)}`
                };
            case 'user.view':
                return {
                    ...baseProps,
                    page: ['home', 'product', 'category', 'search'][Math.floor(Math.random() * 4)],
                    duration: Math.floor(Math.random() * 300) // seconds
                };
            case 'user.search':
                return {
                    ...baseProps,
                    query: ['phone', 'laptop', 'shoes', 'dress', 'watch'][Math.floor(Math.random() * 5)],
                    resultsCount: Math.floor(Math.random() * 1000)
                };
            case 'order.created':
                return {
                    ...baseProps,
                    orderId: `order_${Math.random().toString(36).substr(2, 9)}`,
                    amount: (Math.random() * 240 + 10).toFixed(2), // CAD 10 - 250
                    currency: 'CAD',
                    itemCount: Math.floor(Math.random() * 10) + 1
                };
            case 'order.completed':
                return {
                    ...baseProps,
                    orderId: `order_${Math.random().toString(36).substr(2, 9)}`,
                    amount: (Math.random() * 240 + 10).toFixed(2), // CAD 10 - 250
                    currency: 'CAD',
                    paymentMethod: ['card', 'paypal', 'apple_pay'][Math.floor(Math.random() * 3)]
                };
            case 'ad.impression':
                return {
                    ...baseProps,
                    campaignId: `campaign_${Math.floor(Math.random() * 100)}`,
                    channel: ['instagram', 'tiktok', 'youtube', 'facebook'][Math.floor(Math.random() * 4)],
                    adId: `ad_${Math.floor(Math.random() * 1000)}`
                };
            case 'ad.click':
                return {
                    ...baseProps,
                    campaignId: `campaign_${Math.floor(Math.random() * 100)}`,
                    channel: ['instagram', 'tiktok', 'youtube', 'facebook'][Math.floor(Math.random() * 4)],
                    ctr: (Math.random() * 5).toFixed(2) + '%'
                };
            default:
                return baseProps;
        }
    }

    // Process event with simulated latency
    async processEvent(event) {
        const startTime = Date.now();
        
        try {
            // Simulate processing time (10-100ms)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 90 + 10));

            // Update metrics
            this.eventsProcessed++;
            const latency = Date.now() - startTime;
            this.metrics.latency.push(latency);
            if (this.metrics.latency.length > 1000) {
                this.metrics.latency.shift();
            }

            // Update topic-specific counters
            switch (event.topic) {
                case 'user-events':
                    this.metrics.userEvents++;
                    break;
                case 'transaction-events':
                    this.metrics.transactionEvents++;
                    break;
                case 'marketing-events':
                    this.metrics.marketingEvents++;
                    break;
                case 'infrastructure-events':
                    this.metrics.infrastructureEvents++;
                    break;
            }

            // Emit processed event
            this.emit('eventProcessed', {
                event,
                latency,
                timestamp: new Date().toISOString()
            });

            // Simulate occasional errors (0.1% error rate)
            if (Math.random() < 0.001) {
                throw new Error('Simulated processing error');
            }

        } catch (error) {
            this.metrics.errors++;
            this.emit('eventError', { event, error: error.message });
        }
    }

    // Start processing
    start(eventsPerSecond = 100) {
        this.isRunning = true;
        console.log(`Starting real-time processor (${eventsPerSecond} events/sec)...`);
        
        const interval = 1000 / eventsPerSecond;
        const loopStart = Date.now();
        let emitted = 0;

        // Timers fire late (~15ms minimum on Windows), so emit however many
        // events are due since start instead of one per tick
        const processLoop = () => {
            if (!this.isRunning) return;

            const due = Math.floor((Date.now() - loopStart) / interval) + 1;
            while (emitted < due) {
                const event = this.generateEvent();
                this.processEvent(event);
                emitted++;
            }

            setTimeout(processLoop, interval);
        };

        processLoop();

        // Log metrics every 5 seconds
        this.metricsInterval = setInterval(() => {
            this.logMetrics();
        }, 5000);
    }

    // Stop processing
    stop() {
        this.isRunning = false;
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        console.log('\nProcessor stopped');
    }

    // Calculate and log metrics
    logMetrics() {
        const uptime = (Date.now() - this.startTime) / 1000;
        const eventsPerSecond = this.eventsProcessed / uptime;
        
        const latencies = this.metrics.latency.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

        const metrics = {
            uptime: `${Math.floor(uptime)}s`,
            totalEvents: this.eventsProcessed,
            eventsPerSecond: eventsPerSecond.toFixed(2),
            latency: {
                p50: `${p50}ms`,
                p95: `${p95}ms`,
                p99: `${p99}ms`
            },
            eventsByTopic: {
                userEvents: this.metrics.userEvents,
                transactionEvents: this.metrics.transactionEvents,
                marketingEvents: this.metrics.marketingEvents,
                infrastructureEvents: this.metrics.infrastructureEvents
            },
            errorRate: `${((this.metrics.errors / this.eventsProcessed) * 100).toFixed(3)}%`,
            errors: this.metrics.errors
        };

        console.log('\nReal-Time Processor Metrics:');
        console.log(JSON.stringify(metrics, null, 2));
        
        // Emit metrics for dashboard
        this.emit('metrics', metrics);
    }

    // Get current metrics
    getMetrics() {
        const uptime = (Date.now() - this.startTime) / 1000;
        const eventsPerSecond = this.eventsProcessed / uptime;
        
        const latencies = this.metrics.latency.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

        return {
            uptime,
            totalEvents: this.eventsProcessed,
            eventsPerSecond,
            latency: { p50, p95, p99 },
            eventsByTopic: {
                userEvents: this.metrics.userEvents,
                transactionEvents: this.metrics.transactionEvents,
                marketingEvents: this.metrics.marketingEvents,
                infrastructureEvents: this.metrics.infrastructureEvents
            },
            errorRate: (this.metrics.errors / this.eventsProcessed) * 100,
            errors: this.metrics.errors
        };
    }
}

// Run if executed directly
if (require.main === module) {
    const processor = new RealTimeProcessor();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\nShutting down...');
        processor.stop();
        process.exit(0);
    });

    // Start processing at 100 events/second
    processor.start(100);
}

module.exports = RealTimeProcessor;
