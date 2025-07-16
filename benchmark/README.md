# BunGate API Gateway Benchmark

This directory contains a comprehensive benchmark suite comparing BunGate against industry-standard API gateways (Nginx and Envoy) using Docker Compose.

## Overview

The benchmark evaluates three API gateways implementing round-robin load balancing:

- **BunGate**: High-performance HTTP gateway built on Bun.js using the actual BunGate library
- **Nginx**: Industry-standard reverse proxy and load balancer
- **Envoy**: Modern proxy designed for cloud-native applications

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   BunGate   │    │    Nginx    │    │    Envoy    │
│   :3000     │    │    :3001     │    │    :3002     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │Echo Server 1│  │Echo Server 2│  │Echo Server 3│
    │   :8081     │  │   :8082     │  │   :8083     │
    └─────────────┘  └─────────────┘  └─────────────┘
```

## Test Configuration

- **Backend**: 3 high-performance Bun.js echo servers
- **Load Balancing**: Round-robin strategy
- **Benchmark Tool**: wrk (HTTP benchmarking tool)
- **Duration**: 30 seconds
- **Connections**: 150 concurrent connections
- **Threads**: 8 worker threads
- **Test Method**: Latency-focused performance testing

## Quick Start

1. **Prerequisites**:
   - Docker and Docker Compose installed
   - Sufficient system resources (recommended: 4+ CPU cores, 8GB+ RAM)

2. **Run the benchmark**:

   ```bash
   # Start all services
   docker-compose up -d

   # Wait for services to be ready (about 30 seconds)
   docker-compose logs -f bungate nginx envoy

   # Run the benchmark
   docker-compose exec wrk /scripts/benchmark.sh

   # Generate a fresh comprehensive report
   docker-compose exec wrk /scripts/wrk_report.sh

   # View results
   docker-compose exec wrk cat /results/wrk_benchmark_report.txt
   ```

3. **Cleanup**:
   ```bash
   docker-compose down -v
   ```

## Results Summary

Performance Results Summary:

🏆 Envoy: 46257.27 RPS (Winner)
🥈 Nginx: 28665.95 RPS
🥉 BunGate: 20627.36 RPS

## Output

The benchmark generates:

1. **Performance comparison table**: RPS, latency percentiles, errors
2. **Load balancing analysis**: Distribution verification across all backend servers
3. **Winner determination**: Best performing gateway with detailed metrics
4. **Detailed results**: Full wrk output for all gateways

## Key Metrics

- **Requests/sec**: Throughput measurement
- **Latency percentiles**: Average, P99 latency measurements
- **Error rate**: Socket errors and timeouts (all tests achieve 0% error rate)
- **Load balancing**: Round-robin distribution verification
- **Resource usage**: Container-based resource isolation

## Troubleshooting

1. **Services not starting**: Check Docker logs for each service

   ```bash
   docker-compose logs bungate nginx envoy
   ```

2. **Benchmark failures**: Ensure all services are healthy before testing

   ```bash
   docker-compose ps
   curl http://localhost:3000 # Test BunGate
   curl http://localhost:3001 # Test Nginx
   curl http://localhost:3002 # Test Envoy
   ```

3. **Low performance**: Verify system resources and Docker limits
4. **Network issues**: Check Docker networking configuration

## Advanced Usage

### Manual Testing

You can manually test each gateway:

```bash
# Test BunGate
docker-compose exec wrk wrk -t4 -c100 -d30s --latency http://bungate:3000

# Test Nginx
docker-compose exec wrk wrk -t4 -c100 -d30s --latency http://nginx:80

# Test Envoy
docker-compose exec wrk wrk -t4 -c100 -d30s --latency http://envoy:8080
```

### Load Balancing Verification

```bash
# Test round-robin distribution
docker-compose exec wrk curl -s http://bungate:3000
docker-compose exec wrk curl -s http://nginx:80
docker-compose exec wrk curl -s http://envoy:8080
```

### Generate New Report

```bash
# Generate a fresh comprehensive report
docker-compose exec wrk /scripts/wrk_report.sh
```

## License

This benchmark suite is part of the BunGate project and follows the same MIT license.
