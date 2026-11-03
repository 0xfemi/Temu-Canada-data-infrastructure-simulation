/**
 * Batch Data Processor Simulation
 * Simulates daily ETL jobs and batch analytics processing
 */

class BatchProcessor {
    constructor() {
        this.jobs = new Map();
        this.jobHistory = [];
    }

    // Define batch jobs
    initializeJobs() {
        // Daily ETL job
        this.jobs.set('daily_etl', {
            id: 'daily_etl',
            name: 'Daily ETL Pipeline',
            schedule: '0 2 * * *', // 2 AM daily
            steps: [
                'extract_raw_events',
                'transform_enrich',
                'load_data_warehouse',
                'update_aggregations',
                'generate_reports'
            ],
            estimatedDuration: 1800000, // 30 minutes
            status: 'pending'
        });

        // User segmentation job
        this.jobs.set('user_segmentation', {
            id: 'user_segmentation',
            name: 'User Segmentation Analysis',
            schedule: '0 3 * * *', // 3 AM daily
            steps: [
                'load_user_data',
                'calculate_rfm_scores',
                'apply_segmentation_rules',
                'update_user_profiles',
                'generate_segments'
            ],
            estimatedDuration: 900000, // 15 minutes
            status: 'pending'
        });

        // Product analytics job
        this.jobs.set('product_analytics', {
            id: 'product_analytics',
            name: 'Product Performance Analytics',
            schedule: '0 4 * * *', // 4 AM daily
            steps: [
                'aggregate_product_metrics',
                'calculate_popularity_scores',
                'identify_trending_products',
                'update_recommendations',
                'generate_product_reports'
            ],
            estimatedDuration: 1200000, // 20 minutes
            status: 'pending'
        });

        // Marketing attribution job
        this.jobs.set('marketing_attribution', {
            id: 'marketing_attribution',
            name: 'Marketing Attribution Analysis',
            schedule: '0 5 * * *', // 5 AM daily
            steps: [
                'load_marketing_events',
                'match_attributions',
                'calculate_roi',
                'update_campaign_metrics',
                'generate_attribution_report'
            ],
            estimatedDuration: 1500000, // 25 minutes
            status: 'pending'
        });

        // ML model training job
        this.jobs.set('ml_training', {
            id: 'ml_training',
            name: 'ML Model Training',
            schedule: '0 6 * * 0', // 6 AM every Sunday
            steps: [
                'prepare_training_data',
                'train_recommendation_model',
                'train_fraud_detection_model',
                'validate_models',
                'deploy_models'
            ],
            estimatedDuration: 3600000, // 1 hour
            status: 'pending'
        });
    }

    // Execute a batch job
    async executeJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        job.status = 'running';
        job.startTime = Date.now();
        console.log(`\nStarting job: ${job.name}`);

        const results = {
            jobId: job.id,
            jobName: job.name,
            startTime: new Date().toISOString(),
            steps: [],
            status: 'running',
            errors: []
        };

        try {
            for (let i = 0; i < job.steps.length; i++) {
                const step = job.steps[i];
                job.currentStep = i;
                console.log(`   Step ${i + 1}/${job.steps.length}: ${step}`);

                const stepStart = Date.now();
                
                // Simulate step execution
                await this.executeStep(step, job);

                const stepDuration = Date.now() - stepStart;
                results.steps.push({
                    name: step,
                    duration: stepDuration,
                    status: 'completed'
                });

                console.log(`   Completed in ${stepDuration}ms`);
            }

            job.status = 'completed';
            results.status = 'completed';
            results.endTime = new Date().toISOString();
            results.duration = Date.now() - job.startTime;

            console.log(`\nJob completed: ${job.name} (${(results.duration / 1000).toFixed(2)}s)`);

        } catch (error) {
            job.status = 'failed';
            results.status = 'failed';
            results.error = error.message;
            results.errors.push(error.message);
            results.endTime = new Date().toISOString();
            results.duration = Date.now() - job.startTime;

            console.log(`\nJob failed: ${job.name} - ${error.message}`);
        }

        this.jobHistory.push(results);
        if (this.jobHistory.length > 100) {
            this.jobHistory.shift();
        }

        return results;
    }

    // Execute a single step
    async executeStep(stepName, job) {
        // Simulate processing time based on step type
        let duration = 0;

        if (stepName.includes('extract') || stepName.includes('load')) {
            duration = Math.random() * 300000 + 60000; // 1-6 minutes
        } else if (stepName.includes('transform') || stepName.includes('calculate')) {
            duration = Math.random() * 180000 + 30000; // 30s-3.5 minutes
        } else if (stepName.includes('train')) {
            duration = Math.random() * 1200000 + 600000; // 10-30 minutes
        } else if (stepName.includes('generate')) {
            duration = Math.random() * 120000 + 30000; // 30s-2.5 minutes
        } else {
            duration = Math.random() * 60000 + 10000; // 10s-70s
        }

        // Simulate occasional failures (1% chance)
        if (Math.random() < 0.01) {
            throw new Error(`Step ${stepName} failed: Simulated error`);
        }

        await new Promise(resolve => setTimeout(resolve, duration));
    }

    // Run all scheduled jobs
    async runScheduledJobs() {
        console.log('\nRunning scheduled batch jobs...\n');
        
        const jobsToRun = Array.from(this.jobs.values()).filter(job => 
            job.status === 'pending' || job.status === 'failed'
        );

        if (jobsToRun.length === 0) {
            console.log('No jobs to run');
            return;
        }

        for (const job of jobsToRun) {
            await this.executeJob(job.id);
            
            // Wait a bit between jobs
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\nAll scheduled jobs completed\n');
    }

    // Get job status
    getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            return null;
        }

        return {
            ...job,
            history: this.jobHistory.filter(h => h.jobId === jobId)
        };
    }

    // Get all jobs status
    getAllJobsStatus() {
        return Array.from(this.jobs.values()).map(job => ({
            id: job.id,
            name: job.name,
            status: job.status,
            schedule: job.schedule,
            steps: job.steps,
            currentStep: job.currentStep ?? null,
            startTime: job.startTime ?? null,
            lastRun: this.jobHistory
                .filter(h => h.jobId === job.id)
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0] || null
        }));
    }

    // Get job history
    getJobHistory(limit = 20) {
        return this.jobHistory
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, limit);
    }

    // Simulate daily batch processing
    async simulateDailyProcessing() {
        console.log('\n' + '='.repeat(70));
        console.log('SIMULATING DAILY BATCH PROCESSING');
        console.log('='.repeat(70));

        this.initializeJobs();

        // Run all jobs
        await this.runScheduledJobs();

        // Print summary
        console.log('\nBatch Processing Summary:');
        const allJobs = this.getAllJobsStatus();
        allJobs.forEach(job => {
            const status = job.status === 'completed' ? '[OK]' : 
                         job.status === 'running' ? '[RUNNING]' : 
                         job.status === 'failed' ? '[FAILED]' : '[PENDING]';
            console.log(`   ${status} ${job.name}: ${job.status}`);
        });

        console.log('\n' + '='.repeat(70) + '\n');
    }
}

// Run if executed directly
if (require.main === module) {
    const processor = new BatchProcessor();
    
    processor.simulateDailyProcessing().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = BatchProcessor;
