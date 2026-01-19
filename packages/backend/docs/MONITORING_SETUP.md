# IntervAI - Monitoring Setup Guide

## Overview

This guide provides instructions for setting up monitoring and alerting for the IntervAI service.

## Key Metrics to Monitor

### API Performance

- **Request Latency**: Average response time for API endpoints
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second
- **P95/P99 Latency**: 95th and 99th percentile response times

### WebSocket Performance

- **Active Connections**: Number of active WebSocket connections
- **Connection Errors**: Failed connection attempts
- **Message Throughput**: Messages per second
- **Streaming Duration**: Average time for optimization streaming

### Database Performance

- **Query Latency**: Average query execution time
- **Connection Pool Usage**: Percentage of connections in use
- **Slow Queries**: Queries taking > 1 second
- **Transaction Rollbacks**: Number of failed transactions

### System Resources

- **CPU Usage**: Percentage of CPU utilization
- **Memory Usage**: Percentage of memory utilization
- **Disk Usage**: Percentage of disk space used
- **Network I/O**: Bytes sent/received per second

### Business Metrics

- **Optimizations Created**: Number of new optimizations per hour
- **Suggestions Generated**: Number of suggestions per optimization
- **Suggestion Acceptance Rate**: Percentage of accepted suggestions
- **Quota Enforcement**: Number of quota limit hits

## Alert Thresholds

### Critical Alerts (Immediate Action Required)

```
API Error Rate > 5%
WebSocket Connection Failures > 10%
Database Connection Pool > 90%
CPU Usage > 90%
Memory Usage > 90%
Disk Usage > 95%
```

### Warning Alerts (Monitor Closely)

```
API Error Rate > 1%
API P95 Latency > 2 seconds
WebSocket Connection Failures > 1%
Database Query Latency > 500ms
CPU Usage > 70%
Memory Usage > 80%
Disk Usage > 80%
```

### Info Alerts (Track Trends)

```
API P95 Latency > 1 second
Database Query Latency > 200ms
Quota Limit Hits > 100/hour
Streaming Duration > 30 seconds
```

## Prometheus Metrics

### Custom Metrics to Expose

```typescript
// In your service
import { Counter, Histogram, Gauge } from 'prom-client';

// Optimization metrics
const optimizationCounter = new Counter({
  name: 'interview_ai_optimizations_total',
  help: 'Total number of optimizations created',
  labelNames: ['status']
});

const suggestionCounter = new Counter({
  name: 'resume_optim
```
