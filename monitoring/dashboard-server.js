/**
 * Monitoring Dashboard Server
 * Serves real-time metrics dashboard via WebSocket
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RealTimeProcessor = require('../pipelines/real-time-processor');

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

// Initialize processor
const processor = new RealTimeProcessor();

// Simulate additional infrastructure metrics
class InfrastructureMetrics {
    constructor() {
        this.metrics = {
            apiLatency: [],
            errorRate: 0,
            throughput: 0,
            cpuUsage: 50,
            memoryUsage: 60,
            databaseConnections: 0,
            cacheHitRate: 95
        };
    }

    update() {
        // Simulate realistic infrastructure metrics
        this.metrics.apiLatency.push(Math.random() * 200 + 50);
        if (this.metrics.apiLatency.length > 100) {
            this.metrics.apiLatency.shift();
        }
        
        this.metrics.errorRate = Math.random() * 0.5;
        this.metrics.throughput = processor.getMetrics().eventsPerSecond * 10;
        this.metrics.cpuUsage = 50 + Math.random() * 30;
        this.metrics.memoryUsage = 60 + Math.random() * 20;
        this.metrics.databaseConnections = Math.floor(Math.random() * 1000) + 500;
        this.metrics.cacheHitRate = 90 + Math.random() * 8;

        return this.metrics;
    }
}

const infraMetrics = new InfrastructureMetrics();

// Business metrics simulation
class BusinessMetrics {
    constructor() {
        this.metrics = {
            totalUsers: 0,
            activeUsers: 0,
            orders: 0,
            revenue: 0,
            conversionRate: 0,
            averageOrderValue: 0,
            topProducts: [],
            topCities: []
        };
    }

    update(processorMetrics) {
        // Simulate business metrics based on events
        this.metrics.totalUsers += Math.floor(Math.random() * 10);
        this.metrics.activeUsers = Math.floor(processorMetrics.eventsPerSecond * 0.1);
        this.metrics.orders = processorMetrics.eventsByTopic.transactionEvents;
        this.metrics.revenue += processorMetrics.eventsByTopic.transactionEvents * (Math.random() * 5000 + 1000);
        this.metrics.conversionRate = (processorMetrics.eventsByTopic.transactionEvents / processorMetrics.eventsByTopic.userEvents) * 100 || 0;
        this.metrics.averageOrderValue = this.metrics.revenue / this.metrics.orders || 0;

        // Top products (simulated)
        this.metrics.topProducts = [
            { name: 'Smartphone', sales: Math.floor(Math.random() * 1000) + 500 },
            { name: 'Laptop', sales: Math.floor(Math.random() * 800) + 300 },
            { name: 'Headphones', sales: Math.floor(Math.random() * 600) + 200 }
        ].sort((a, b) => b.sales - a.sales);

        // Top cities
        this.metrics.topCities = [
            { name: 'Lagos', users: Math.floor(Math.random() * 5000) + 2000 },
            { name: 'Abuja', users: Math.floor(Math.random() * 3000) + 1000 },
            { name: 'Port Harcourt', users: Math.floor(Math.random() * 2000) + 500 }
        ].sort((a, b) => b.users - a.users);

        return this.metrics;
    }
}

const businessMetrics = new BusinessMetrics();

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected to dashboard');
    
    // Send initial data
    const initialData = {
        processor: processor.getMetrics(),
        infrastructure: infraMetrics.update(),
        business: businessMetrics.update(processor.getMetrics())
    };
    socket.emit('metrics', initialData);

    socket.on('disconnect', () => {
        console.log('Client disconnected from dashboard');
    });
});

// Listen to processor metrics (the emitted payload is formatted for logging,
// so send the dashboard the numeric version instead)
processor.on('metrics', () => {
    const metrics = processor.getMetrics();
    const data = {
        processor: metrics,
        infrastructure: infraMetrics.update(),
        business: businessMetrics.update(metrics),
        timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected clients
    io.emit('metrics', data);
});

// Start processor
processor.start(100);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\nMonitoring Dashboard Server running on http://localhost:${PORT}`);
    console.log(`Open dashboard.html in your browser to view metrics\n`);
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
