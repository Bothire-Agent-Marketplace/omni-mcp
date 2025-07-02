# Gateway High Availability Strategy

## Overview

This document outlines the high availability (HA) strategy for the Omni MCP Gateway in production environments, ensuring 99.9%+ uptime and seamless failover capabilities.

## Architecture Components

### 1. Load Balancer Layer

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Load Balancer │
│   (Primary)     │    │   (Standby)     │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌─────▼────┐    ┌─────▼────┐
│Gateway │    │Gateway   │    │Gateway   │
│Node 1  │    │Node 2    │    │Node 3    │
└────────┘    └──────────┘    └──────────┘
```

### 2. Gateway Cluster Configuration

#### Environment Variables

```bash
# High Availability Settings
HA_MODE=cluster
HA_NODE_ID=gateway-1
HA_CLUSTER_NODES=gateway-1,gateway-2,gateway-3
HA_HEALTH_CHECK_INTERVAL=5000
HA_FAILOVER_TIMEOUT=10000

# Load Balancer Settings
LB_HEALTH_CHECK_PATH=/health
LB_HEALTH_CHECK_INTERVAL=3000
LB_HEALTH_CHECK_TIMEOUT=2000

# Session Management
SESSION_STORE=redis
SESSION_STORE_URL=redis://redis-cluster:6379
SESSION_FAILOVER_ENABLED=true

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000
```

## Implementation Plan

### Phase 1: Session Persistence (Week 1)

#### 1.1 Redis Session Store

```typescript
// packages/utils/src/session-store.ts
export interface SessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session, ttl?: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
}

export class RedisSessionStore implements SessionStore {
  private redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
  }

  async get(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async set(sessionId: string, session: Session, ttl = 3600): Promise<void> {
    await this.redis.setex(
      `session:${sessionId}`,
      ttl,
      JSON.stringify(session)
    );
  }
}
```

#### 1.2 Gateway Session Manager Updates

```typescript
// apps/gateway/src/gateway/session-manager.ts
export class MCPSessionManager {
  private sessionStore: SessionStore;

  constructor(config: GatewayConfig) {
    if (process.env.HA_MODE === "cluster") {
      this.sessionStore = new RedisSessionStore(
        process.env.SESSION_STORE_URL || "redis://localhost:6379"
      );
    } else {
      this.sessionStore = new InMemorySessionStore();
    }
  }

  async createSession(userId = "anonymous", type = "http"): Promise<Session> {
    const session = {
      id: generateSessionId(),
      userId,
      type,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    await this.sessionStore.set(session.id, session);
    return session;
  }
}
```

### Phase 2: Health Checks & Circuit Breakers (Week 2)

#### 2.1 Enhanced Health Checks

```typescript
// apps/gateway/src/health/health-monitor.ts
export class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();

  registerCheck(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  async runAllChecks(): Promise<HealthStatus> {
    const results = await Promise.allSettled(
      Array.from(this.checks.entries()).map(async ([name, check]) => ({
        name,
        result: await check.execute(),
      }))
    );

    return {
      status: results.every(
        (r) => r.status === "fulfilled" && r.value.result.healthy
      )
        ? "healthy"
        : "unhealthy",
      timestamp: new Date().toISOString(),
      checks: results.map((r) =>
        r.status === "fulfilled"
          ? { name: r.value.name, ...r.value.result }
          : { name: "unknown", healthy: false, error: "Check failed" }
      ),
    };
  }
}

// Health check implementations
export class DatabaseHealthCheck implements HealthCheck {
  async execute(): Promise<HealthCheckResult> {
    try {
      await this.redis.ping();
      return { healthy: true, responseTime: Date.now() - start };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

export class ServerHealthCheck implements HealthCheck {
  constructor(private serverId: string, private serverUrl: string) {}

  async execute(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.serverUrl}/health`, {
        timeout: 2000,
      });

      return {
        healthy: response.ok,
        responseTime: Date.now() - start,
        details: { serverId: this.serverId, status: response.status },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        details: { serverId: this.serverId },
      };
    }
  }
}
```

#### 2.2 Circuit Breaker Implementation

```typescript
// packages/utils/src/circuit-breaker.ts
export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failures = 0;
  private lastFailureTime = 0;

  constructor(private threshold: number = 5, private timeout: number = 30000) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }
}
```

### Phase 3: Load Balancer Integration (Week 3)

#### 3.1 Docker Compose HA Setup

```yaml
# docker-compose.ha.yml
version: "3.8"

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - gateway-1
      - gateway-2
      - gateway-3
    restart: unless-stopped

  # Gateway Cluster
  gateway-1: &gateway
    build: .
    environment:
      - HA_MODE=cluster
      - HA_NODE_ID=gateway-1
      - SESSION_STORE_URL=redis://redis:6379
      - PORT=37373
    depends_on:
      - redis
      - linear-server
      - queryquill-server
    restart: unless-stopped

  gateway-2:
    <<: *gateway
    environment:
      - HA_MODE=cluster
      - HA_NODE_ID=gateway-2
      - SESSION_STORE_URL=redis://redis:6379
      - PORT=37373

  gateway-3:
    <<: *gateway
    environment:
      - HA_MODE=cluster
      - HA_NODE_ID=gateway-3
      - SESSION_STORE_URL=redis://redis:6379
      - PORT=37373

  # Session Store
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  # MCP Servers (scaled)
  linear-server:
    build: ./apps/linear-mcp-server
    environment:
      - PORT=3001
    deploy:
      replicas: 2
    restart: unless-stopped

  queryquill-server:
    build: ./apps/query-quill-mcp-server
    environment:
      - PORT=3002
    deploy:
      replicas: 2
    restart: unless-stopped

volumes:
  redis_data:
```

#### 3.2 Nginx Configuration

```nginx
# nginx.conf
upstream gateway_cluster {
    least_conn;
    server gateway-1:37373 max_fails=3 fail_timeout=30s;
    server gateway-2:37373 max_fails=3 fail_timeout=30s;
    server gateway-3:37373 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://gateway_cluster/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 2s;
        proxy_read_timeout 2s;
    }

    # MCP endpoints
    location /mcp {
        proxy_pass http://gateway_cluster/mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 60s;
    }
}
```

### Phase 4: Monitoring & Alerting (Week 4)

#### 4.1 Prometheus Metrics

```typescript
// packages/utils/src/metrics.ts
export class MetricsCollector {
  private register = new promClient.Registry();

  constructor() {
    // Request metrics
    this.requestDuration = new promClient.Histogram({
      name: "mcp_request_duration_seconds",
      help: "Duration of MCP requests",
      labelNames: ["method", "server_id", "status"],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    // Error metrics
    this.errorCounter = new promClient.Counter({
      name: "mcp_errors_total",
      help: "Total number of MCP errors",
      labelNames: ["method", "server_id", "error_type"],
    });

    // Health metrics
    this.healthGauge = new promClient.Gauge({
      name: "mcp_server_health",
      help: "Health status of MCP servers (1=healthy, 0=unhealthy)",
      labelNames: ["server_id"],
    });

    this.register.registerMetric(this.requestDuration);
    this.register.registerMetric(this.errorCounter);
    this.register.registerMetric(this.healthGauge);
  }

  recordRequest(
    method: string,
    serverId: string,
    duration: number,
    success: boolean
  ): void {
    this.requestDuration
      .labels(method, serverId, success ? "success" : "error")
      .observe(duration / 1000);

    if (!success) {
      this.errorCounter.labels(method, serverId, "request_failed").inc();
    }
  }

  updateServerHealth(serverId: string, healthy: boolean): void {
    this.healthGauge.labels(serverId).set(healthy ? 1 : 0);
  }
}
```

#### 4.2 Alerting Rules

```yaml
# alerting-rules.yml
groups:
  - name: mcp-gateway
    rules:
      - alert: GatewayDown
        expr: up{job="mcp-gateway"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "MCP Gateway instance is down"
          description: "Gateway {{ $labels.instance }} has been down for more than 30 seconds"

      - alert: HighErrorRate
        expr: rate(mcp_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      - alert: ServerUnhealthy
        expr: mcp_server_health == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "MCP Server unhealthy"
          description: "Server {{ $labels.server_id }} is unhealthy"
```

## Deployment Strategy

### Rolling Deployment

1. **Deploy to staging** - Test all HA components
2. **Blue-Green deployment** - Zero-downtime production updates
3. **Gradual traffic shifting** - 10% → 50% → 100%
4. **Automatic rollback** - On health check failures

### Backup & Recovery

- **Redis snapshots** - Every 6 hours
- **Configuration backups** - Git-based versioning
- **Disaster recovery** - Cross-region replication

## Monitoring Checklist

- [ ] Gateway cluster health
- [ ] Redis session store availability
- [ ] Individual server health
- [ ] Load balancer status
- [ ] SSL certificate expiry
- [ ] Response time SLAs
- [ ] Error rate thresholds
- [ ] Resource utilization

## Testing Strategy

### Chaos Engineering

- **Network partitions** - Test split-brain scenarios
- **Server failures** - Random instance termination
- **Load testing** - Peak traffic simulation
- **Dependency failures** - Redis/server outages

### Automated Tests

```bash
# Health check validation
curl -f http://load-balancer/health || exit 1

# Session persistence test
SESSION_ID=$(curl -s http://lb/mcp -d '{"method":"initialize"}' | jq -r '.sessionToken')
curl -H "Authorization: Bearer $SESSION_ID" http://different-gateway/mcp

# Failover test
docker stop gateway-1
curl -f http://load-balancer/health || exit 1
```

This HA strategy ensures:

- **99.9%+ uptime** through redundancy
- **Seamless failover** with session persistence
- **Automatic recovery** from failures
- **Comprehensive monitoring** and alerting
- **Zero-downtime deployments**
