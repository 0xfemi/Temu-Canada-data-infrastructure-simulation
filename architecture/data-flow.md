# Data Flow Architecture

## Event-Driven Data Pipeline

### 1. Event Sources

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Mobile    │  │    Web      │  │   Admin    │  │  Marketing │
│     App     │  │   Portal    │  │  Dashboard  │  │   Tools    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┼────────────────┼────────────────┘
                        │
              ┌─────────▼─────────┐
              │   API Gateway     │
              │  (Kong/AWS API)   │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │  Event Collector  │
              │  (Segment/Rudder) │
              └─────────┬─────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   Kafka      │ │  CDN Logs   │ │  External   │
│  Streaming   │ │  (CloudFlare│ │   APIs      │
│              │ │   /CloudFront│ │ (Social Media)│
└───────┬──────┘ └──────┬──────┘ └──────┬──────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
```

### 2. Kafka Topic Structure

```
Topics:
├── user-events
│   ├── user.click
│   ├── user.view
│   ├── user.search
│   ├── user.scroll
│   └── user.session
│
├── transaction-events
│   ├── order.created
│   ├── order.completed
│   ├── order.cancelled
│   ├── payment.processed
│   └── refund.initiated
│
├── marketing-events
│   ├── ad.impression
│   ├── ad.click
│   ├── campaign.view
│   └── attribution.match
│
└── infrastructure-events
    ├── api.request
    ├── api.error
    ├── performance.metric
    └── resource.alert
```

### 3. Processing Pipeline

```
Kafka Topics
    │
    ├─► Real-Time Processor (Flink)
    │   ├─► User Behavior Analytics
    │   ├─► Fraud Detection
    │   ├─► Recommendation Engine
    │   └─► Real-time Dashboards
    │
    ├─► Near-Real-Time Processor (Spark Streaming)
    │   ├─► Aggregations (1-min windows)
    │   ├─► User Segmentation
    │   └─► Marketing Attribution
    │
    └─► Batch Processor (Spark)
        ├─► Daily ETL Jobs
        ├─► Historical Analysis
        └─► ML Model Training
```

### 4. Data Storage Flow

```
Processed Data
    │
    ├─► Redis (Hot Cache)
    │   └─► Last 24 hours, frequently accessed
    │
    ├─► Time-Series DB (InfluxDB)
    │   └─► Metrics, last 90 days
    │
    ├─► Data Warehouse (Snowflake)
    │   ├─► Structured analytics data
    │   ├─► User tables, transaction tables
    │   └─► Business intelligence queries
    │
    └─► Data Lake (S3)
        ├─► Raw event data (parquet format)
        ├─► Historical archives
        └─► ML training datasets
```

## Data Transformation Pipeline

### Stage 1: Ingestion
- **Format**: JSON events
- **Volume**: 1M events/hour (Day 1) → 50M events/hour (Month 1)
- **Latency**: < 100ms from event to Kafka

### Stage 2: Enrichment
- **User Enrichment**: Add user profile, segment, history
- **Product Enrichment**: Add product details, category, pricing
- **Geographic Enrichment**: Add location, timezone, currency
- **Device Enrichment**: Add device type, OS, browser

### Stage 3: Aggregation
- **Time Windows**: 1 second, 1 minute, 1 hour, 1 day
- **Dimensions**: User, Product, Category, Channel, Geography
- **Metrics**: Count, Sum, Average, Percentile, Distinct Count

### Stage 4: Storage
- **Real-time**: Redis for dashboard queries
- **Analytics**: Snowflake for SQL queries
- **Archive**: S3 for long-term storage

## Example: User Purchase Journey

```
1. User sees Instagram ad
   └─► Event: marketing.ad.impression
       └─► Stored in: marketing-events topic

2. User clicks ad
   └─► Event: marketing.ad.click
       └─► Attribution: matched to user via device ID

3. User installs app
   └─► Event: user.app_install
       └─► Enrichment: linked to marketing campaign

4. User browses products
   └─► Events: user.view, user.search, user.scroll
       └─► Real-time: Recommendation engine updates

5. User adds to cart
   └─► Event: transaction.cart.add
       └─► Analytics: Cart abandonment tracking

6. User completes purchase
   └─► Event: transaction.order.completed
       └─► Processing:
           ├─► Update user lifetime value
           ├─► Calculate marketing ROI
           ├─► Update product popularity
           └─► Trigger recommendation refresh

7. Data flows to all storage layers
   └─► Redis: Hot data for real-time queries
   └─► InfluxDB: Time-series metrics
   └─► Snowflake: Analytics queries
   └─► S3: Raw event archive
```

## Data Quality & Governance

### Validation Rules
- **Schema Validation**: All events must match Avro schema
- **Required Fields**: user_id, timestamp, event_type
- **Data Types**: Strict type checking
- **Range Validation**: Timestamps within reasonable bounds

### Deduplication
- **Idempotency Keys**: Prevent duplicate processing
- **Event Timestamps**: Handle out-of-order events
- **Deduplication Window**: 24 hours

### Data Retention
- **Hot Data**: 24 hours (Redis)
- **Warm Data**: 90 days (InfluxDB)
- **Analytics Data**: 2 years (Snowflake)
- **Raw Data**: 7 years (S3 Glacier)
