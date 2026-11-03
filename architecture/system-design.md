# Temu Canada Launch: System Design

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
│  Mobile Apps | Web App | Admin Dashboard | Marketing Tools      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  Rate Limiting | Authentication | Request Routing | Load Balancer│
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌─────────▼──────────┐
│  APPLICATION   │            │   DATA INGESTION    │
│    SERVICES    │            │      LAYER          │
│                │            │                     │
│ - User Service │            │ - Event Streaming   │
│ - Product      │            │ - API Logs          │
│ - Order        │            │ - CDN Logs          │
│ - Payment      │            │ - Social Media APIs │
│ - Search       │            │ - Mobile Telemetry  │
└───────┬────────┘            └─────────┬──────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    DATA PROCESSING LAYER                         │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   Real-Time  │         │    Batch     │                      │
│  │  Processing  │         │  Processing  │                      │
│  │  (Flink)     │         │   (Spark)    │                      │
│  └──────┬───────┘         └──────┬───────┘                      │
│         │                        │                               │
│         └────────────┬───────────┘                               │
│                      │                                           │
│              ┌───────▼────────┐                                  │
│              │   ML Pipeline   │                                  │
│              │  (Recommendations│                                 │
│              │   Fraud Detection)│                                │
│              └───────┬─────────┘                                  │
└──────────────────────┼───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
│ DATA WAREHOUSE│ │ DATA LAKE│ │ TIME-SERIES│
│  (Snowflake)  │ │   (S3)   │ │   (Influx) │
└───────┬──────┘ └──────────┘ └─────┬──────┘
        │                            │
┌───────▼────────────────────────────▼──────┐
│         ANALYTICS & MONITORING             │
│  - Real-time Dashboards                    │
│  - Business Intelligence                    │
│  - A/B Testing Platform                    │
│  - Alerting System                         │
└────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Multi-Region Architecture
- **Primary Region**: AWS ca-central-1 (Montreal)
- **Secondary Region**: AWS ca-west-1 (Calgary)
- **Edge Locations**: CloudFront/CDN nodes in Toronto, Montreal, Vancouver
- **Database Replication**: Multi-master setup with eventual consistency
- **Data Residency**: Both regions are in Canada, so customer data never leaves the country (PIPEDA, Quebec Law 25)

### 2. Data Ingestion Strategy
- **Event-Driven Architecture**: All user actions as events
- **Kafka Topics**: 
  - `user-events` (clicks, views, searches)
  - `transaction-events` (purchases, refunds)
  - `marketing-events` (ad impressions, conversions)
  - `infrastructure-events` (errors, performance metrics)
- **Backpressure Handling**: Circuit breakers and rate limiting

### 3. Processing Architecture
- **Real-Time**: Flink for sub-second analytics (recommendations, fraud detection)
- **Near-Real-Time**: Spark Streaming for minute-level aggregations
- **Batch**: Daily ETL jobs for historical analysis and reporting

### 4. Storage Strategy
- **Hot Data**: Redis cache (last 24 hours)
- **Warm Data**: Time-series DB (last 90 days)
- **Cold Data**: Data warehouse (all historical data)
- **Archive**: S3 Glacier (data older than 1 year)

### 5. Scaling Strategy
- **Horizontal Scaling**: Kubernetes with auto-scaling based on CPU/memory
- **Database Sharding**: User-based sharding for user data
- **Read Replicas**: Multiple read replicas for analytics queries
- **Caching**: Multi-layer caching (CDN → Redis → Application)

## Capacity Planning (Canada Launch)

### Expected Traffic
- **Day 1**: 250K users, 1M requests/hour
- **Week 1**: 1M users, 5M requests/hour
- **Month 1**: 3M users, 25M requests/hour

### Infrastructure Requirements
- **API Servers**: 200 instances (auto-scale 50-500)
- **Database**: 10 primary + 30 read replicas
- **Kafka**: 20 brokers, 100 partitions per topic
- **Processing**: 50 Flink task managers, 20 Spark executors
- **Storage**: 100TB initial, 1PB projected Year 1

## Data Flow Examples

### User Purchase Flow
1. User clicks "Buy Now" → Event sent to Kafka `user-events`
2. Order service processes → Event to `transaction-events`
3. Real-time processor calculates conversion rate
4. ML model updates user recommendations
5. Data warehouse stores for analytics
6. Dashboard updates in < 1 second

### Marketing Attribution Flow
1. User sees Instagram ad → Tracking pixel fires
2. Event sent to `marketing-events` topic
3. User installs app → Attribution matched via device ID
4. User makes purchase → Full funnel tracked
5. BI dashboard shows ROI by channel in real-time

## Monitoring & Observability

### Key Metrics
- **Latency**: P50, P95, P99 response times
- **Throughput**: Requests per second, events per second
- **Error Rate**: 4xx, 5xx errors by endpoint
- **Business Metrics**: Conversion rate, AOV, retention
- **Infrastructure**: CPU, memory, disk I/O, network

### Alerting Thresholds
- API latency P99 > 500ms
- Error rate > 1%
- Database connection pool > 80%
- Kafka lag > 1000 messages
- Disk usage > 85%
