# How the Simulation Works

This document explains how each component of the Temu data infrastructure simulation works.

## Architecture Overview

The simulation consists of 6 main components that work together:

1. **Real-Time Processor** - Handles event streaming
2. **Auto-Scaling Simulator** - Manages infrastructure scaling
3. **Monitoring Dashboard** - Visualizes metrics in real-time
4. **A/B Testing Platform** - Runs experiments
5. **Batch Processor** - Handles daily ETL jobs
6. **Load Generator** - Stress tests the system

---

## 1. Real-Time Processor (`pipelines/real-time-processor.js`)

### What It Does
Simulates Apache Flink/Kafka Streams processing events in real-time.

### How It Works

```javascript
class RealTimeProcessor extends EventEmitter {
    // Tracks metrics and processes events
}
```

**Event Generation:**
- Generates weighted random events (clicks, views, orders, etc.)
- Each event has properties: userId, sessionId, timestamp, device info
- Events are categorized into topics: `user-events`, `transaction-events`, `marketing-events`, `infrastructure-events`

**Processing Flow:**
1. `generateEvent()` - Creates a random event based on weighted probabilities
2. `processEvent()` - Simulates processing with 10-100ms latency
3. Updates metrics (counters, latency tracking)
4. Emits `eventProcessed` event for other components

**Key Metrics Tracked:**
- Total events processed
- Events per second
- Latency percentiles (P50, P95, P99)
- Error rate
- Events by topic

**Example Event:**
```javascript
{
    id: "evt_1234567890_abc123",
    type: "user.click",
    topic: "user-events",
    timestamp: "2024-01-15T10:30:00Z",
    userId: "user_12345",
    properties: {
        device: "mobile",
        city: "Toronto",
        element: "product_card",
        productId: "prod_456"
    }
}
```

---

## 2. Auto-Scaling Simulator (`infrastructure/scaling-simulator.js`)

### What It Does
Simulates Kubernetes HPA (Horizontal Pod Autoscaler) that automatically scales infrastructure based on load.

### How It Works

```javascript
class ScalingSimulator {
    // Monitors load and scales components
}
```

**Scaling Logic:**
1. **Monitors Load:**
   - CPU usage (calculated from events/sec)
   - Memory usage
   - Requests per second

2. **Calculates Required Instances:**
   - If CPU > 70% → Scale up API servers
   - If requests > 1000/sec → Scale up database replicas
   - If memory > 80% → Scale up cache nodes

3. **Applies Scaling:**
   - Gradual scaling (max 20% change per cycle)
   - Enforces min/max limits
   - Tracks scaling history

**Components Scaled:**
- API Servers (10-500 instances)
- Database Replicas (2-50 instances)
- Kafka Brokers (2-50 instances)
- Processing Workers (2-200 instances)
- Cache Nodes (1-20 instances)

**Example Scaling:**
```
Load increases: 500 → 1500 requests/sec
→ CPU: 50% → 75%
→ Auto-scaling triggers:
   API Servers: 50 → 75 (+25)
   DB Replicas: 5 → 8 (+3)
```

**Cost Calculation:**
- Each component has hourly rate
- Total cost = sum of (instances × hourly rate)
- Updates in real-time as infrastructure scales

---

## 3. Monitoring Dashboard (`monitoring/dashboard-server.js` + `dashboard.html`)

### What It Does
Provides real-time visualization of all metrics via WebSocket.

### How It Works

**Server Side (`dashboard-server.js`):**
1. Creates Express server + Socket.IO
2. Connects to RealTimeProcessor
3. Simulates additional metrics:
   - Infrastructure metrics (CPU, memory, database connections)
   - Business metrics (users, orders, revenue)
4. Broadcasts metrics to all connected clients every second

**Client Side (`dashboard.html`):**
1. Connects to server via Socket.IO
2. Uses Chart.js for visualizations:
   - Line chart: Events per second over time
   - Bar chart: Latency distribution (P50, P95, P99)
   - Doughnut chart: Events by topic
   - Radar chart: Infrastructure health
3. Updates metrics cards in real-time
4. Displays tables for top products and cities

**Data Flow:**
```
RealTimeProcessor → emits 'metrics' event
     ↓
Dashboard Server → receives metrics
     ↓
Socket.IO → broadcasts to clients
     ↓
Dashboard HTML → updates charts and displays
```

---

## 4. A/B Testing Platform (`analytics/ab-testing.js`)

### What It Does
Simulates experimentation platform for testing different variants (homepage designs, pricing, etc.)

### How It Works

```javascript
class ABTestingPlatform {
    // Manages experiments and tracks conversions
}
```

**Experiment Creation:**
1. Define experiment with variants (e.g., "Control" vs "Variant A")
2. Set traffic allocation (10% of users)
3. Define metrics to track (conversion_rate, revenue, engagement)

**User Assignment:**
1. Hash user ID to get consistent assignment
2. Assign user to variant based on hash
3. Track assignment in memory

**Conversion Tracking:**
1. When user converts, track event
2. Update variant metrics:
   - Conversions count
   - Revenue
   - Engagement
3. Calculate conversion rate

**Statistical Significance:**
- Uses simplified z-test
- Compares control vs treatment
- Calculates confidence level (90%, 95%)
- Determines if results are statistically significant

**Example Experiment:**
```
Experiment: "Homepage Design - Canada"
Variants:
  - Control (Current): 50 users, 15 conversions (30%)
  - Variant A (Bilingual EN/FR): 52 users, 20 conversions (38.5%)
  
Result: Variant A has 8.5% lift, 95% confidence [YES]
```

---

## 5. Batch Processor (`pipelines/batch-processor.js`)

### What It Does
Simulates daily ETL (Extract, Transform, Load) jobs that run on a schedule.

### How It Works

```javascript
class BatchProcessor {
    // Executes scheduled batch jobs
}
```

**Job Types:**
1. **Daily ETL** - Extracts raw events, transforms, loads to data warehouse
2. **User Segmentation** - Calculates RFM scores, segments users
3. **Product Analytics** - Aggregates product metrics, identifies trends
4. **Marketing Attribution** - Matches marketing events to conversions
5. **ML Model Training** - Trains recommendation and fraud detection models

**Job Execution:**
1. Each job has multiple steps
2. Steps execute sequentially
3. Each step simulates processing time:
   - Extract/Load: 1-6 minutes
   - Transform/Calculate: 30s-3.5 minutes
   - Train: 10-30 minutes
4. Tracks success/failure
5. Logs duration and errors

**Example Job:**
```
Daily ETL Pipeline:
  Step 1: extract_raw_events (2.5 min)
  Step 2: transform_enrich (1.2 min)
  Step 3: load_data_warehouse (3.1 min)
  Step 4: update_aggregations (45 sec)
  Step 5: generate_reports (1.8 min)
  
Total: 9.45 minutes
Status: [OK] Completed
```

---

## 6. Load Generator (`infrastructure/load-generator.js`)

### What It Does
Stress tests the system with different load profiles.

### How It Works

```javascript
class LoadGenerator {
    // Generates different load patterns
}
```

**Load Profiles:**
- **Normal**: 100 events/sec, continuous
- **Spike**: 1000 events/sec for 30 seconds
- **Sustained**: 500 events/sec for 5 minutes
- **Gradual**: Starts at 50, increases by 10 every 10 seconds
- **Chaos**: 2000 events/sec for 10 seconds

**Testing Flow:**
1. Start RealTimeProcessor at specified rate
2. Monitor metrics and scaling
3. Track how infrastructure responds
4. Generate final report with:
   - Performance metrics
   - Scaling events
   - Cost analysis

---

## 7. Main Demo (`demo.js`)

### What It Does
Orchestrates all components to run together.

### How It Works

```javascript
class DataInfrastructureDemo {
    // Coordinates all components
}
```

**Execution Flow:**
1. **Initialize** all components
2. **Start** real-time processor (100 events/sec)
3. **Begin monitoring** loop (every 15 seconds)
4. **Start A/B testing** after 5 seconds
5. **Run batch jobs** after 30 seconds
6. **Display metrics** continuously
7. **Handle shutdown** gracefully

**Monitoring Loop:**
- Gets metrics from processor
- Triggers auto-scaling
- Displays infrastructure state
- Shows cost estimates
- Reports A/B test status

---

## Data Flow

```
User Actions (Simulated)
    ↓
Real-Time Processor
    ├─→ Events processed
    ├─→ Metrics calculated
    └─→ Emits to dashboard
         ↓
Auto-Scaling Simulator
    ├─→ Monitors load
    ├─→ Calculates scaling needs
    └─→ Updates infrastructure
         ↓
Monitoring Dashboard
    ├─→ Receives metrics
    ├─→ Updates visualizations
    └─→ Displays to user
         ↓
A/B Testing Platform
    ├─→ Assigns users to variants
    ├─→ Tracks conversions
    └─→ Calculates significance
         ↓
Batch Processor
    ├─→ Runs scheduled jobs
    ├─→ Processes historical data
    └─→ Generates reports
```

---

## Key Metrics Explained

### Latency Percentiles
- **P50 (Median)**: 50% of requests complete in this time
- **P95**: 95% of requests complete in this time (most important)
- **P99**: 99% of requests complete in this time (worst case)

### Events Per Second
- Total events processed divided by uptime
- Indicates system throughput

### Error Rate
- Failed events / total events × 100
- Should be < 1% for healthy system

### Conversion Rate
- Conversions / total users × 100
- Key business metric for e-commerce

### Statistical Significance
- Z-test determines if A/B test results are real or random
- 95% confidence = 95% sure the difference is real

---

## Real-World Equivalents

| Simulation Component | Real Technology |
|---------------------|----------------|
| RealTimeProcessor | Apache Flink, Kafka Streams |
| ScalingSimulator | Kubernetes HPA, AWS Auto Scaling |
| Dashboard Server | Grafana, DataDog, Custom dashboards |
| A/B Testing | Optimizely, LaunchDarkly, Custom platform |
| Batch Processor | Apache Spark, Airflow, dbt |
| Load Generator | Apache JMeter, k6, Locust |

---

## Running the Simulation

1. **Start Dashboard:**
   ```bash
   npm run dashboard
   ```
   Opens server on port 3000, view `dashboard.html` in browser

2. **Run Demo:**
   ```bash
   npm run demo
   ```
   Runs all components together with console output

3. **Individual Components:**
   ```bash
   npm run pipeline    # Just real-time processing
   npm run ab-test      # Just A/B testing
   npm run batch        # Just batch jobs
   npm run stress-test  # Load testing
   ```

---

## Key Insights

1. **Event-Driven Architecture**: Everything is an event that flows through the system
2. **Auto-Scaling**: Infrastructure adapts automatically to load
3. **Real-Time Analytics**: Sub-second insights enable quick decisions
4. **Experimentation**: A/B testing drives optimization
5. **Cost Management**: Auto-scaling balances performance and cost
6. **Monitoring**: Real-time visibility is critical for operations

This simulation demonstrates the invisible infrastructure that powers visible marketing campaigns!
