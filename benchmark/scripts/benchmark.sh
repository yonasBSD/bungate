#!/bin/bash

# Comprehensive wrk benchmark script for API Gateway comparison

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
DURATION="30s"
THREADS="8"
CONNECTIONS="150"

# Gateway endpoints
BUNGATE_URL="http://bungate:3000"
NGINX_URL="http://nginx:80"
ENVOY_URL="http://envoy:8080"

# Results directory
RESULTS_DIR="/results"
mkdir -p "$RESULTS_DIR"

echo -e "${CYAN}=================================${NC}"
echo -e "${CYAN}API Gateway Benchmark with wrk${NC}"
echo -e "${CYAN}=================================${NC}"
echo ""
echo -e "${YELLOW}Test Configuration:${NC}"
echo -e "  Duration: $DURATION"
echo -e "  Threads: $THREADS"
echo -e "  Connections: $CONNECTIONS"
echo ""

# Function to run wrk test
run_wrk_test() {
    local name=$1
    local url=$2
    local output_file="$RESULTS_DIR/${name,,}_results.txt"
    
    echo -e "${BLUE}Testing $name at $url${NC}"
    echo "Starting wrk test..." > "$output_file"
    
    # Run wrk with specified parameters
    wrk -t $THREADS -c $CONNECTIONS -d $DURATION \
        --latency "$url" >> "$output_file" 2>&1
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $name test completed${NC}"
    else
        echo -e "${RED}✗ $name test failed${NC}"
    fi
    
    echo "" >> "$output_file"
    echo "Test completed at: $(date)" >> "$output_file"
    
    return $exit_code
}

# Function to test load balancing distribution
test_load_balancing() {
    local name=$1
    local url=$2
    local output_file="$RESULTS_DIR/${name,,}_load_balancing.txt"
    
    echo -e "${BLUE}Testing $name load balancing distribution${NC}"
    echo "Load balancing test for $name" > "$output_file"
    echo "Testing round-robin distribution..." >> "$output_file"
    echo "" >> "$output_file"
    
    # Make 30 requests to check distribution
    for i in {1..30}; do
        curl -s "$url" >> "$output_file" 2>&1
        echo "" >> "$output_file"
    done
    
    # Count server responses
    echo "" >> "$output_file"
    echo "Server distribution:" >> "$output_file"
    echo "Server 1: $(grep -c '"server_id": "1"' "$output_file")" >> "$output_file"
    echo "Server 2: $(grep -c '"server_id": "2"' "$output_file")" >> "$output_file"
    echo "Server 3: $(grep -c '"server_id": "3"' "$output_file")" >> "$output_file"
    
    echo -e "${GREEN}✓ $name load balancing test completed${NC}"
}

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Test each gateway
echo -e "${CYAN}Starting benchmark tests...${NC}"
echo ""

# Test BunGate
run_wrk_test "BunGate" "$BUNGATE_URL"
bungate_result=$?

# Test Nginx
run_wrk_test "Nginx" "$NGINX_URL"
nginx_result=$?

# Test Envoy
run_wrk_test "Envoy" "$ENVOY_URL"
envoy_result=$?

echo ""
echo -e "${CYAN}Testing load balancing distribution...${NC}"
echo ""

# Test load balancing for each gateway
test_load_balancing "BunGate" "$BUNGATE_URL"
test_load_balancing "Nginx" "$NGINX_URL"
test_load_balancing "Envoy" "$ENVOY_URL"

echo ""
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${CYAN}Results saved to: $RESULTS_DIR${NC}"
echo ""

# Summary
echo -e "${YELLOW}Test Results Summary:${NC}"
echo -e "  BunGate: $([ $bungate_result -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo -e "  Nginx:   $([ $nginx_result -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo -e "  Envoy:   $([ $envoy_result -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
echo ""
echo -e "${CYAN}Run the report generator to see detailed comparison:${NC}"
echo -e "  /scripts/generate_wrk_report.sh"
