/**
 * Auto-Scaling Infrastructure Simulator
 * Simulates Kubernetes HPA and infrastructure scaling based on load
 */

class ScalingSimulator {
    constructor() {
        this.currentInstances = {
            apiServers: 50,
            databaseReplicas: 5,
            kafkaBrokers: 5,
            processingWorkers: 10,
            cacheNodes: 3
        };

        this.targetMetrics = {
            cpuThreshold: 70, // Scale up if CPU > 70%
            memoryThreshold: 80, // Scale up if Memory > 80%
            requestThreshold: 1000 // Scale up if requests/sec > 1000
        };

        this.minInstances = {
            apiServers: 10,
            databaseReplicas: 2,
            kafkaBrokers: 2,
            processingWorkers: 2,
            cacheNodes: 1
        };

        this.maxInstances = {
            apiServers: 500,
            databaseReplicas: 50,
            kafkaBrokers: 50,
            processingWorkers: 200,
            cacheNodes: 20
        };

        this.scalingHistory = [];
        this.currentLoad = {
            cpu: 50,
            memory: 60,
            requestsPerSecond: 500
        };
    }

    // Simulate load changes
    updateLoad(eventsPerSecond) {
        // Simulate realistic load based on events
        this.currentLoad.requestsPerSecond = eventsPerSecond * 10; // Each event generates ~10 API requests
        this.currentLoad.cpu = 40 + (eventsPerSecond / 10); // CPU scales with load
        this.currentLoad.memory = 50 + (eventsPerSecond / 15); // Memory scales slower

        // Add some randomness
        this.currentLoad.cpu += (Math.random() - 0.5) * 10;
        this.currentLoad.memory += (Math.random() - 0.5) * 10;

        // Ensure values are within bounds
        this.currentLoad.cpu = Math.max(20, Math.min(95, this.currentLoad.cpu));
        this.currentLoad.memory = Math.max(30, Math.min(95, this.currentLoad.memory));
    }

    // Calculate required instances based on load
    calculateRequiredInstances() {
        const required = { ...this.currentInstances };

        // API Servers scaling
        if (this.currentLoad.cpu > this.targetMetrics.cpuThreshold) {
            const scaleFactor = this.currentLoad.cpu / this.targetMetrics.cpuThreshold;
            required.apiServers = Math.ceil(this.currentInstances.apiServers * scaleFactor);
        } else if (this.currentLoad.cpu < this.targetMetrics.cpuThreshold * 0.5) {
            // Scale down if CPU is below 35%
            required.apiServers = Math.max(
                this.minInstances.apiServers,
                Math.floor(this.currentInstances.apiServers * 0.8)
            );
        }

        // Database replicas scaling
        if (this.currentLoad.requestsPerSecond > this.targetMetrics.requestThreshold) {
            const scaleFactor = this.currentLoad.requestsPerSecond / this.targetMetrics.requestThreshold;
            required.databaseReplicas = Math.ceil(this.currentInstances.databaseReplicas * scaleFactor);
        } else if (this.currentLoad.requestsPerSecond < this.targetMetrics.requestThreshold * 0.5) {
            required.databaseReplicas = Math.max(
                this.minInstances.databaseReplicas,
                Math.floor(this.currentInstances.databaseReplicas * 0.9)
            );
        }

        // Kafka brokers scaling
        if (this.currentLoad.requestsPerSecond > 2000) {
            required.kafkaBrokers = Math.ceil(this.currentLoad.requestsPerSecond / 500);
        } else {
            required.kafkaBrokers = Math.max(
                this.minInstances.kafkaBrokers,
                Math.floor(this.currentInstances.kafkaBrokers * 0.9)
            );
        }

        // Processing workers scaling
        if (this.currentLoad.requestsPerSecond > 5000) {
            required.processingWorkers = Math.ceil(this.currentLoad.requestsPerSecond / 200);
        } else {
            required.processingWorkers = Math.max(
                this.minInstances.processingWorkers,
                Math.floor(this.currentInstances.processingWorkers * 0.9)
            );
        }

        // Cache nodes scaling
        if (this.currentLoad.memory > this.targetMetrics.memoryThreshold) {
            const scaleFactor = this.currentLoad.memory / this.targetMetrics.memoryThreshold;
            required.cacheNodes = Math.ceil(this.currentInstances.cacheNodes * scaleFactor);
        } else {
            required.cacheNodes = Math.max(
                this.minInstances.cacheNodes,
                Math.floor(this.currentInstances.cacheNodes * 0.9)
            );
        }

        // Enforce min/max limits
        Object.keys(required).forEach(key => {
            required[key] = Math.max(
                this.minInstances[key],
                Math.min(this.maxInstances[key], required[key])
            );
        });

        return required;
    }

    // Apply scaling with gradual changes
    applyScaling(requiredInstances) {
        const changes = {};
        let hasChanges = false;

        Object.keys(requiredInstances).forEach(key => {
            const current = this.currentInstances[key];
            const required = requiredInstances[key];
            const diff = required - current;

            if (Math.abs(diff) > 0) {
                // Gradual scaling (max 20% change per cycle)
                const maxChange = Math.ceil(current * 0.2);
                const actualChange = Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
                
                this.currentInstances[key] = current + actualChange;
                changes[key] = {
                    from: current,
                    to: this.currentInstances[key],
                    change: actualChange
                };
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.scalingHistory.push({
                timestamp: new Date().toISOString(),
                changes,
                load: { ...this.currentLoad }
            });

            // Keep only last 100 scaling events
            if (this.scalingHistory.length > 100) {
                this.scalingHistory.shift();
            }
        }

        return changes;
    }

    // Get scaling recommendations
    getScalingRecommendations() {
        const required = this.calculateRequiredInstances();
        const recommendations = [];

        Object.keys(required).forEach(key => {
            const current = this.currentInstances[key];
            const requiredCount = required[key];
            const diff = requiredCount - current;

            if (diff > 0) {
                recommendations.push({
                    component: key,
                    action: 'scale-up',
                    current: current,
                    recommended: requiredCount,
                    reason: this.getScalingReason(key)
                });
            } else if (diff < 0) {
                recommendations.push({
                    component: key,
                    action: 'scale-down',
                    current: current,
                    recommended: requiredCount,
                    reason: 'Low utilization, cost optimization'
                });
            }
        });

        return recommendations;
    }

    getScalingReason(component) {
        switch (component) {
            case 'apiServers':
                return `CPU usage at ${this.currentLoad.cpu.toFixed(1)}% (threshold: ${this.targetMetrics.cpuThreshold}%)`;
            case 'databaseReplicas':
                return `Request rate at ${this.currentLoad.requestsPerSecond.toFixed(0)} req/s (threshold: ${this.targetMetrics.requestThreshold})`;
            case 'cacheNodes':
                return `Memory usage at ${this.currentLoad.memory.toFixed(1)}% (threshold: ${this.targetMetrics.memoryThreshold}%)`;
            default:
                return 'Load-based scaling';
        }
    }

    // Get current infrastructure state
    getState() {
        return {
            instances: { ...this.currentInstances },
            load: { ...this.currentLoad },
            recommendations: this.getScalingRecommendations(),
            totalCost: this.calculateCost(),
            utilization: this.calculateUtilization()
        };
    }

    // Calculate estimated infrastructure cost (simplified)
    calculateCost() {
        const hourlyRates = {
            apiServers: 0.10,
            databaseReplicas: 0.50,
            kafkaBrokers: 0.30,
            processingWorkers: 0.20,
            cacheNodes: 0.15
        };

        let totalCost = 0;
        Object.keys(this.currentInstances).forEach(key => {
            totalCost += this.currentInstances[key] * hourlyRates[key];
        });

        return {
            hourly: totalCost,
            daily: totalCost * 24,
            monthly: totalCost * 24 * 30
        };
    }

    // Calculate resource utilization
    calculateUtilization() {
        return {
            apiServers: {
                used: this.currentInstances.apiServers,
                capacity: this.maxInstances.apiServers,
                utilization: (this.currentInstances.apiServers / this.maxInstances.apiServers) * 100
            },
            databaseReplicas: {
                used: this.currentInstances.databaseReplicas,
                capacity: this.maxInstances.databaseReplicas,
                utilization: (this.currentInstances.databaseReplicas / this.maxInstances.databaseReplicas) * 100
            },
            overall: {
                cpu: this.currentLoad.cpu,
                memory: this.currentLoad.memory,
                requests: this.currentLoad.requestsPerSecond
            }
        };
    }

    // Simulate scaling cycle
    scale(eventsPerSecond) {
        this.updateLoad(eventsPerSecond);
        const required = this.calculateRequiredInstances();
        const changes = this.applyScaling(required);
        return changes;
    }
}

module.exports = ScalingSimulator;
