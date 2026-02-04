/**
 * A/B Testing Infrastructure Simulation
 * Simulates experimentation platform for marketing and product features
 */

class ABTestingPlatform {
    constructor() {
        this.experiments = new Map();
        this.variants = new Map();
        this.results = new Map();
        this.trafficAllocation = 0.1; // 10% of traffic for experiments
    }

    // Create a new experiment
    createExperiment(experimentId, name, variants, metrics) {
        const experiment = {
            id: experimentId,
            name,
            variants: variants.map((v, i) => ({
                id: `variant_${i}`,
                name: v,
                allocation: 1 / variants.length, // Equal allocation by default
                traffic: 0,
                conversions: 0
            })),
            metrics: metrics || ['conversion_rate', 'revenue', 'engagement'],
            status: 'running',
            startDate: new Date().toISOString(),
            endDate: null,
            results: {}
        };

        this.experiments.set(experimentId, experiment);
        console.log(`✅ Created experiment: ${name} (${experimentId})`);
        return experiment;
    }

    // Assign user to variant
    assignVariant(experimentId, userId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment || experiment.status !== 'running') {
            return null;
        }

        // Check if user should be in experiment (traffic allocation)
        if (Math.random() > this.trafficAllocation) {
            return null;
        }

        // Consistent assignment based on user ID hash
        const hash = this.hashUserId(userId);
        const variantIndex = hash % experiment.variants.length;
        const variant = experiment.variants[variantIndex];

        // Track assignment
        variant.traffic++;
        this.trackAssignment(experimentId, userId, variant.id);

        return variant;
    }

    // Track conversion event
    trackConversion(experimentId, userId, metric, value = 1) {
        const assignment = this.variants.get(`${experimentId}_${userId}`);
        if (!assignment) {
            return; // User not in experiment
        }

        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            return;
        }

        const variant = experiment.variants.find(v => v.id === assignment.variantId);
        if (!variant) {
            return;
        }

        // Initialize results if needed
        if (!this.results.has(experimentId)) {
            this.results.set(experimentId, {
                conversions: {},
                revenue: {},
                engagement: {}
            });
        }

        const results = this.results.get(experimentId);

        // Track conversion
        if (!results.conversions[variant.id]) {
            results.conversions[variant.id] = 0;
        }
        results.conversions[variant.id] += value;

        // Track revenue if applicable
        if (metric === 'revenue' || metric === 'purchase') {
            if (!results.revenue[variant.id]) {
                results.revenue[variant.id] = 0;
            }
            results.revenue[variant.id] += value;
        }

        // Track engagement
        if (metric === 'engagement' || metric === 'click' || metric === 'view') {
            if (!results.engagement[variant.id]) {
                results.engagement[variant.id] = 0;
            }
            results.engagement[variant.id] += value;
        }

        variant.conversions += value;
    }

    // Get experiment results
    getResults(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            return null;
        }

        const results = this.results.get(experimentId) || {
            conversions: {},
            revenue: {},
            engagement: {}
        };

        const analysis = {
            experiment: {
                id: experiment.id,
                name: experiment.name,
                status: experiment.status,
                duration: this.getExperimentDuration(experiment)
            },
            variants: experiment.variants.map(variant => {
                const conversions = results.conversions[variant.id] || 0;
                const revenue = results.revenue[variant.id] || 0;
                const engagement = results.engagement[variant.id] || 0;

                return {
                    name: variant.name,
                    traffic: variant.traffic,
                    conversions,
                    conversionRate: variant.traffic > 0 ? (conversions / variant.traffic) * 100 : 0,
                    revenue,
                    averageRevenue: conversions > 0 ? revenue / conversions : 0,
                    engagement,
                    engagementRate: variant.traffic > 0 ? (engagement / variant.traffic) * 100 : 0
                };
            }),
            statisticalSignificance: this.calculateSignificance(experiment, results)
        };

        return analysis;
    }

    // Calculate statistical significance (simplified)
    calculateSignificance(experiment, results) {
        const variants = experiment.variants;
        if (variants.length < 2) {
            return null;
        }

        const control = variants[0];
        const treatment = variants[1];

        const controlConversions = results.conversions[control.id] || 0;
        const treatmentConversions = results.conversions[treatment.id] || 0;
        const controlTraffic = control.traffic;
        const treatmentTraffic = treatment.traffic;

        if (controlTraffic === 0 || treatmentTraffic === 0) {
            return { significant: false, confidence: 0 };
        }

        const controlRate = controlConversions / controlTraffic;
        const treatmentRate = treatmentConversions / treatmentTraffic;

        // Simplified z-test
        const pooledRate = (controlConversions + treatmentConversions) / (controlTraffic + treatmentTraffic);
        const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlTraffic + 1/treatmentTraffic));
        const z = (treatmentRate - controlRate) / se;
        const confidence = Math.abs(z) > 1.96 ? 95 : Math.abs(z) > 1.645 ? 90 : 0;

        return {
            significant: Math.abs(z) > 1.96,
            confidence,
            lift: ((treatmentRate - controlRate) / controlRate) * 100,
            zScore: z
        };
    }

    // Helper methods
    hashUserId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    trackAssignment(experimentId, userId, variantId) {
        this.variants.set(`${experimentId}_${userId}`, {
            experimentId,
            userId,
            variantId,
            assignedAt: new Date().toISOString()
        });
    }

    getExperimentDuration(experiment) {
        if (!experiment.endDate) {
            const start = new Date(experiment.startDate);
            const now = new Date();
            return Math.floor((now - start) / 1000 / 60); // minutes
        }
        const start = new Date(experiment.startDate);
        const end = new Date(experiment.endDate);
        return Math.floor((end - start) / 1000 / 60); // minutes
    }

    // Stop experiment
    stopExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (experiment) {
            experiment.status = 'stopped';
            experiment.endDate = new Date().toISOString();
            console.log(`⏹️  Stopped experiment: ${experiment.name}`);
        }
    }

    // List all experiments
    listExperiments() {
        return Array.from(this.experiments.values()).map(exp => ({
            id: exp.id,
            name: exp.name,
            status: exp.status,
            variants: exp.variants.length,
            duration: this.getExperimentDuration(exp)
        }));
    }
}

// Simulate A/B testing scenarios
class ABTestingSimulator {
    constructor() {
        this.platform = new ABTestingPlatform();
        this.isRunning = false;
    }

    // Simulate Nigeria launch experiments
    initializeLaunchExperiments() {
        console.log('\n🧪 Initializing A/B tests for Nigeria launch...\n');

        // Experiment 1: Homepage Design
        this.platform.createExperiment(
            'homepage_design_ng',
            'Homepage Design - Nigeria',
            ['Control (Current)', 'Variant A (Localized)', 'Variant B (Simplified)'],
            ['conversion_rate', 'engagement', 'revenue']
        );

        // Experiment 2: Pricing Display
        this.platform.createExperiment(
            'pricing_display_ng',
            'Pricing Display Format',
            ['Control (USD)', 'Variant A (NGN)', 'Variant B (Both)'],
            ['conversion_rate', 'revenue']
        );

        // Experiment 3: Payment Methods
        this.platform.createExperiment(
            'payment_methods_ng',
            'Payment Method Prominence',
            ['Control (Card First)', 'Variant A (Bank Transfer)', 'Variant B (Mobile Money)'],
            ['conversion_rate', 'revenue']
        );

        // Experiment 4: Marketing Campaign
        this.platform.createExperiment(
            'marketing_creative_ng',
            'Marketing Creative - Instagram',
            ['Control (Product Focus)', 'Variant A (Price Focus)', 'Variant B (Social Proof)'],
            ['click_through_rate', 'conversion_rate', 'revenue']
        );

        console.log('✅ All experiments initialized\n');
    }

    // Simulate traffic and conversions
    simulateTraffic(duration = 60000) {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        console.log(`\n🚀 Simulating traffic for ${duration / 1000} seconds...\n`);

        const experiments = Array.from(this.platform.experiments.keys());
        let eventCount = 0;

        const interval = setInterval(() => {
            // Generate random user
            const userId = `user_${Math.floor(Math.random() * 100000)}`;

            // Randomly assign to experiments
            experiments.forEach(experimentId => {
                const variant = this.platform.assignVariant(experimentId, userId);
                
                if (variant) {
                    // Simulate user behavior
                    const behavior = Math.random();

                    // 30% conversion rate
                    if (behavior < 0.3) {
                        this.platform.trackConversion(experimentId, userId, 'conversion', 1);
                        
                        // 20% make purchase
                        if (behavior < 0.06) {
                            const revenue = Math.random() * 50000 + 1000; // NGN 1,000 - 50,000
                            this.platform.trackConversion(experimentId, userId, 'revenue', revenue);
                        }
                    }

                    // Track engagement
                    if (behavior < 0.7) {
                        this.platform.trackConversion(experimentId, userId, 'engagement', 1);
                    }
                }
            });

            eventCount++;

            // Print results every 10 seconds
            if (eventCount % 100 === 0) {
                this.printResults();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            this.isRunning = false;
            console.log('\n✅ Simulation completed\n');
            this.printFinalResults();
        }, duration);
    }

    // Print current results
    printResults() {
        const experiments = this.platform.listExperiments();
        
        experiments.forEach(exp => {
            const results = this.platform.getResults(exp.id);
            if (results && results.variants.length > 0) {
                console.log(`\n📊 ${exp.name}:`);
                results.variants.forEach(variant => {
                    console.log(`   ${variant.name}: ${variant.traffic} users, ${variant.conversionRate.toFixed(2)}% conversion`);
                });
                
                if (results.statisticalSignificance) {
                    const sig = results.statisticalSignificance;
                    console.log(`   Significance: ${sig.significant ? '✅' : '❌'} (${sig.confidence}% confidence, ${sig.lift.toFixed(1)}% lift)`);
                }
            }
        });
    }

    // Print final results
    printFinalResults() {
        console.log('\n' + '='.repeat(70));
        console.log('📋 FINAL A/B TEST RESULTS');
        console.log('='.repeat(70));

        const experiments = this.platform.listExperiments();
        
        experiments.forEach(exp => {
            const results = this.platform.getResults(exp.id);
            if (results) {
                console.log(`\n🧪 ${exp.name}`);
                console.log(`   Status: ${exp.status} | Duration: ${results.experiment.duration} minutes`);
                console.log('\n   Variant Results:');
                
                results.variants.forEach(variant => {
                    console.log(`\n   ${variant.name}:`);
                    console.log(`      Traffic: ${variant.traffic.toLocaleString()}`);
                    console.log(`      Conversions: ${variant.conversions.toLocaleString()}`);
                    console.log(`      Conversion Rate: ${variant.conversionRate.toFixed(2)}%`);
                    console.log(`      Revenue: ₦${variant.revenue.toLocaleString()}`);
                    console.log(`      Avg Revenue: ₦${variant.averageRevenue.toFixed(2)}`);
                    console.log(`      Engagement: ${variant.engagement.toLocaleString()} (${variant.engagementRate.toFixed(2)}%)`);
                });

                if (results.statisticalSignificance) {
                    const sig = results.statisticalSignificance;
                    console.log(`\n   Statistical Analysis:`);
                    console.log(`      Significant: ${sig.significant ? '✅ YES' : '❌ NO'}`);
                    console.log(`      Confidence: ${sig.confidence}%`);
                    console.log(`      Lift: ${sig.lift > 0 ? '+' : ''}${sig.lift.toFixed(2)}%`);
                    console.log(`      Z-Score: ${sig.zScore.toFixed(2)}`);
                }
            }
        });

        console.log('\n' + '='.repeat(70) + '\n');
    }
}

// Run if executed directly
if (require.main === module) {
    const simulator = new ABTestingSimulator();
    
    simulator.initializeLaunchExperiments();
    simulator.simulateTraffic(120000); // 2 minutes
}

module.exports = { ABTestingPlatform, ABTestingSimulator };
